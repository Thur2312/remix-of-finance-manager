export interface TikTokIntegration {
  id: string; // UUID
  user_id: string; // UUID do usuário no seu sistema
  shop_id: string; // ID da loja no TikTok Shop
  seller_id: string; // ID do vendedor no TikTok Shop
  access_token: string; // Token de acesso para chamadas à API
  refresh_token: string; // Token para renovar o access_token
  token_expires_at: Date; // Data de expiração do access_token
  refresh_token_expires_at: Date; // Data de expiração do refresh_token
  last_sync_at?: Date; // Última sincronização de dados (opcional)
  created_at: Date; // Data de criação do registro
  updated_at: Date; // Data da última atualização
}


export interface TikTokOrder {
  id: string; // UUID
  shop_id: string; // ID da loja no TikTok Shop
  tiktok_order_id: string; // ID do pedido no TikTok
  order_status: string; // Status do pedido (PENDING, SHIPPED, COMPLETED, etc)
  total_amount: number; // Valor total do pedido
  currency: string; // Moeda (BRL, USD, etc)
  created_time: Date; // Data de criação do pedido no TikTok
  update_time: Date; // Data da última atualização do pedido
  buyer_user_id?: string; // ID do comprador no TikTok (opcional)
  raw_data?: Record<string, string>; // Dados brutos do pedido em JSON
  created_at: Date; // Data de criação do registro
  updated_at: Date; // Data da última atualização
}


export interface TikTokFinancialTransaction {
  id: string; // UUID
  shop_id: string; // ID da loja no TikTok Shop
  transaction_id?: string; // ID da transação no TikTok (opcional)
  transaction_type: string; // Tipo (SALE, FEE, REFUND, SETTLEMENT, etc)
  amount: number; // Valor da transação
  currency: string; // Moeda (BRL, USD, etc)
  transaction_time: Date; // Data/hora da transação
  description?: string; // Descrição da transação (opcional)
  raw_data?: Record<string, string>; // Dados brutos da transação em JSON
  created_at: Date; // Data de criação do registro
  updated_at: Date; // Data da última atualização
}


export interface TikTokAuthResponse {
  access_token: string; // Token de acesso para a API
  refresh_token: string; // Token para renovar o access_token
  expires_in: number; // Tempo de expiração em segundos
  refresh_expires_in: number; // Tempo de expiração do refresh_token em segundos
  scope?: string; // Escopos de permissão concedidos
}


export interface TikTokRefreshTokenResponse {
  access_token: string; // Novo token de acesso
  expires_in: number; // Tempo de expiração em segundos
  refresh_token?: string; // Novo refresh_token (se fornecido)
  refresh_expires_in?: number; // Tempo de expiração do novo refresh_token
}


export interface TikTokOrdersResponse {
  code: number; // Código de resposta (0 = sucesso)
  message: string; // Mensagem de resposta
  data: {
    orders: TikTokOrderData[]; // Array de pedidos
    page_size: number; // Tamanho da página
    total_count: number; // Total de pedidos
    cursor?: string; // Cursor para paginação
  };
}


export interface TikTokOrderData {
  order_id: string; // ID do pedido no TikTok
  order_status: string; // Status do pedido
  create_time: number; // Timestamp de criação
  update_time: number; // Timestamp da última atualização
  order_amount: {
    amount: string; // Valor total
    currency: string; // Moeda
  };
  buyer_user_id: string; // ID do comprador
  // Adicione outros campos conforme necessário
}


export interface TikTokFinancialResponse {
  code: number; // Código de resposta (0 = sucesso)
  message: string; // Mensagem de resposta
  data: {
    transactions: TikTokFinancialData[]; // Array de transações
    total_count: number; // Total de transações
    cursor?: string; // Cursor para paginação
  };
}


export interface TikTokFinancialData {
  transaction_id: string; // ID da transação
  transaction_type: string; // Tipo de transação
  amount: string; // Valor
  currency: string; // Moeda
  transaction_time: number; // Timestamp da transação
  description?: string; // Descrição
  // Adicione outros campos conforme necessário
}


export interface TikTokErrorResponse {
  code: number; // Código de erro
  message: string; // Mensagem de erro
  error_description?: string; // Descrição detalhada do erro
}


export interface TikTokConfig {
  client_key: string; // Client Key fornecido pelo TikTok
  client_secret: string; // Client Secret fornecido pelo TikTok
  redirect_uri: string; // URI de redirecionamento após autorização
  api_base_url: string; // URL base da API do TikTok (ex: https://open-api.tiktokshop.com)
}


export interface TikTokTokenRequest {
  grant_type: string; // Tipo de concessão (authorization_code, refresh_token)
  client_key: string; // Client Key
  client_secret: string; // Client Secret
  code?: string; // Authorization code (para grant_type = authorization_code)
  refresh_token?: string; // Refresh token (para grant_type = refresh_token)
  redirect_uri?: string; // Redirect URI (para grant_type = authorization_code)
}