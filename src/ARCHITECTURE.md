# SellerFinance — Arquitetura de Integração com Marketplaces

## Estrutura de arquivos

```
src/
├── app.ts                          # Entry point Express
├── infrastructure/
│   ├── database/
│   │   ├── supabase.ts             # Client Supabase tipado
│   │   └── migrations/
│   │       └── 001_marketplace_tables.sql
│   └── queue/
│       └── sync.queue.ts           # Scheduler de sync periódica
├── shared/
│   ├── errors/index.ts             # Hierarquia de erros tipados
│   ├── utils/index.ts              # Funções utilitárias puras
│   └── middlewares/
│       ├── auth.middleware.ts      # Valida JWT do Supabase Auth
│       └── error-handler.middleware.ts
└── modules/
    └── marketplace/
        ├── routes.ts               # Wiring de rotas e DI
        ├── adapters/
        │   ├── marketplace.adapter.ts    # Interface contratual
        │   ├── shopee.adapter.ts         # Implementação Shopee
        │   ├── tiktok.adapter.ts         # Implementação TikTok
        │   └── adapter.registry.ts       # Factory/singleton
        ├── services/
        │   ├── auth.service.ts           # OAuth + refresh tokens
        │   └── sync.service.ts           # Orquestração de sync
        ├── repositories/
        │   ├── integration.repository.ts
        │   ├── orders.repository.ts
        │   └── payments.repository.ts
        ├── controllers/
        │   ├── integration.controller.ts
        │   └── orders.controller.ts
        └── types/
            ├── marketplace.types.ts      # Tipos de domínio
            ├── shopee-api.types.ts       # Tipos da API Shopee
            └── tiktok-api.types.ts       # Tipos da API TikTok
```

---

## Fluxo completo OAuth

```
1. Frontend chama GET /api/integrations/shopee/auth-url
   → Retorna { url, state }

2. Frontend redireciona o usuário para a URL retornada

3. Shopee/TikTok redireciona de volta para o callback com ?code=...&shop_id=...

4. GET /api/integrations/shopee/callback?code=XXX&shop_id=YYY
   → authMiddleware: valida JWT Supabase, extrai userId
   → authService.handleCallback()
      → adapter.exchangeCode(code, shopId) → chama API do marketplace
      → Normaliza tokens para MarketplaceTokenSet
      → integrationRepository.upsert() → salva no Supabase
   → Resposta 201 com dados da loja conectada
```

---

## Adapter Pattern

A interface `MarketplaceAdapter` define o contrato:

```typescript
interface MarketplaceAdapter {
  getAuthorizationUrl(state): MarketplaceAuthorizationUrl
  exchangeCode(code, shopId?): Promise<MarketplaceTokenSet>
  refreshTokens(refreshToken, shopId): Promise<MarketplaceTokenSet>
  getOrders(accessToken, shopId, params): Promise<PaginatedResult<MarketplaceOrder>>
  getAllOrders(accessToken, shopId, params): Promise<MarketplaceOrder[]>
  getPayments(accessToken, shopId, params): Promise<PaginatedResult<MarketplacePayment>>
  getAllPayments(accessToken, shopId, params): Promise<MarketplacePayment[]>
}
```

- `ShopeeAdapter` e `TikTokAdapter` implementam essa interface
- Cada adapter normaliza os dados brutos da API para tipos de domínio compartilhados
- O `adapter.registry.ts` funciona como factory singleton — sem duplicação de instâncias

---

## Sincronização de dados

### Fluxo: syncOrders(integrationId)

```
1. integrationRepository.findById(id)         → busca integração no Supabase
2. authService.getValidAccessToken(integration) → verifica expiração, faz refresh se necessário
3. adapter.getAllOrders(token, shopId, params) → pagina automaticamente até !hasMore
4. ordersRepository.upsertMany(dtos)           → upsert idempotente por (integration_id, external_order_id)
5. Mesmo fluxo para payments
6. Retorna SyncResult com contagens e erros
```

### Scheduler automático

O `SyncQueue` roda a cada 1 hora via `setInterval`, chamando `syncAllIntegrations()`:
- Busca todas as integrações ativas
- Para cada uma: renova token se necessário, sincroniza pedidos e pagamentos dos últimos 30 dias

---

## Refresh de token automático

`MarketplaceAuthService.getValidAccessToken()`:
- Verifica se o `access_token` expira em menos de 5 minutos (buffer configurável)
- Se sim, chama `adapter.refreshTokens()` com o `refresh_token`
- Persiste os novos tokens no banco via `integrationRepository.updateTokens()`
- Se o `refresh_token` também estiver expirado, lança `TokenExpiredError` (401)

---

## Como o frontend consome os dados

Todos os endpoints abaixo requerem `Authorization: Bearer <supabase_jwt>`:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/integrations/:marketplace/auth-url` | Gera URL OAuth |
| GET | `/api/integrations/:marketplace/callback` | Processa callback |
| GET | `/api/integrations` | Lista integrações do usuário |
| DELETE | `/api/integrations/:id` | Desconecta loja |
| POST | `/api/integrations/:id/sync` | Sync manual |
| GET | `/api/orders` | Todos os pedidos do usuário |
| GET | `/api/orders/:integrationId` | Pedidos por loja |
| GET | `/api/finance/summary?from=&to=` | Resumo financeiro |

### Exemplo de response: GET /api/finance/summary

```json
{
  "totalRevenue": 15420.50,
  "totalFees": 923.40,
  "totalNetAmount": 14497.10,
  "totalOrders": 47,
  "completedOrders": 42,
  "cancelledOrders": 2,
  "currency": "BRL",
  "period": {
    "from": "2024-11-01T00:00:00.000Z",
    "to": "2024-12-01T00:00:00.000Z"
  }
}
```

---

## Banco de dados (Supabase)

### Estratégia de upsert

Todos os dados são inseridos com `ON CONFLICT DO UPDATE`, garantindo:
- **Idempotência**: sincronizações repetidas não duplicam dados
- **Atualização incremental**: status de pedidos e pagamentos é atualizado a cada sync
- **Rastreabilidade**: campo `synced_at` registra o momento de cada sincronização

### Row Level Security (RLS)

O Supabase RLS garante que cada usuário só acessa seus próprios dados, mesmo usando a anon key do frontend diretamente.

---

## Como testar

### 1. Setup

```bash
cp .env.example .env
# Preencher variáveis de ambiente
npm install
psql $SUPABASE_DB_URL -f src/infrastructure/database/migrations/001_marketplace_tables.sql
npm run dev
```

### 2. Testar OAuth Shopee

```bash
# Gerar URL de autorização
curl http://localhost:3000/api/integrations/shopee/auth-url

# Simular callback (após autorização na Shopee)
curl "http://localhost:3000/api/integrations/shopee/callback?code=SEU_CODE&shop_id=SEU_SHOP_ID" \
  -H "Authorization: Bearer SEU_SUPABASE_JWT"
```

### 3. Sincronizar dados manualmente

```bash
curl -X POST http://localhost:3000/api/integrations/UUID_DA_INTEGRACAO/sync \
  -H "Authorization: Bearer SEU_JWT"
```

### 4. Consultar pedidos e financeiro

```bash
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer SEU_JWT"

curl "http://localhost:3000/api/finance/summary?from=2024-11-01&to=2024-12-01" \
  -H "Authorization: Bearer SEU_JWT"
```

### 5. Sandbox / Testes

- Shopee sandbox: `SHOPEE_BASE_URL=https://partner.test-stable.shopeemobile.com`
- TikTok sandbox: `TIKTOK_BASE_URL=https://sandbox-open-api.tiktokglobalshop.com`
