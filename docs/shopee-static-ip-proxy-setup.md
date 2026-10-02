# Proxy de IP fixo pra desmascarar dados sensíveis da Shopee (grátis)

Contexto: a Shopee só devolve `recipient_address`/`buyer_cpf_id` desmascarados
pra chamadas vindas de um IP cadastrado no whitelist do Open Platform
Console. Edge Functions do Supabase não têm IP de saída fixo (confirmado:
[docs oficiais da Supabase](https://supabase.com/docs/guides/troubleshooting/why-supabase-edge-functions-cannot-provide-static-egress-ips-for-whitelisting-3d78b0)).
Solução: uma VM grátis (Oracle Cloud Always Free) rodando um proxy HTTP
autenticado, e só a chamada sensível da Shopee passa por ele.

## 1. Provisionar a VM

Ver passo a passo no chat / README do projeto. Resumo: Oracle Cloud,
shape `VM.Standard.E2.1.Micro` (AMD, não ARM — mais confiável de
provisionar), Ubuntu 24.04, região São Paulo se disponível.

Depois de criada, anota o **IP público** da instância.

## 2. Abrir a porta 8888 nas DUAS camadas de firewall

A Oracle bloqueia por padrão tanto na Security List (nível de rede, no
console) quanto no firewall da própria VM (`iptables`/`ufw`). As duas
precisam ser abertas.

**No console** (Networking → Virtual Cloud Networks → sua VCN → Security
Lists → lista padrão → Add Ingress Rule):
- Source CIDR: `0.0.0.0/0`
- Protocolo: TCP, porta: `8888`

**Na VM**, depois de conectar via SSH (veja passo 3):
```bash
sudo iptables -I INPUT -p tcp --dport 8888 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

## 3. Conectar na VM e instalar o Tinyproxy

```bash
chmod 600 caminho/para/sua-chave-privada.key
ssh -i caminho/para/sua-chave-privada.key ubuntu@SEU_IP_PUBLICO

# já dentro da VM:
sudo apt update && sudo apt install -y tinyproxy apache2-utils
```

## 4. Configurar autenticação (senão qualquer um na internet usa seu proxy)

```bash
# gera um usuário/senha pro proxy
echo "Allow <seu usuário escolhido>:$(openssl passwd -apr1 '<sua senha escolhida>')" 
```

Edita `/etc/tinyproxy/tinyproxy.conf` (`sudo nano /etc/tinyproxy/tinyproxy.conf`):
- Troca a porta pra `8888` (linha `Port 8080` → `Port 8888`).
- Comenta/remove qualquer linha `Allow 127.0.0.1` (senão só localhost consegue usar).
- Adiciona autenticação Basic (Tinyproxy usa `BasicAuth` nativo, mais simples que gerar hash):
  ```
  BasicAuth seu_usuario sua_senha_forte_aqui
  ```
  (Tinyproxy aceita `BasicAuth <user> <pass>` direto no config — sem precisar de htpasswd.)

```bash
sudo systemctl restart tinyproxy
sudo systemctl enable tinyproxy   # sobrevive a reboot
```

**Se o BasicAuth não pegar** (tem issue aberta no GitHub do Tinyproxy sobre
isso em algumas versões): confirma com `tinyproxy -v` a versão instalada e,
se persistir, roda `sudo journalctl -u tinyproxy -f` enquanto testa o
`curl` do passo 5 pra ver o log de erro exato.

## 5. Testar de fora

Do seu computador (não da VM):
```bash
curl -x http://seu_usuario:sua_senha_forte_aqui@SEU_IP_PUBLICO:8888 https://ifconfig.me
```
Deve devolver o IP público da VM — confirma que o proxy está roteando.

## 6. Cadastrar o IP no Shopee Open Platform Console

No console do app "Seller Finance S" → configurações de segurança →
IP Whitelist → adiciona `SEU_IP_PUBLICO` → ativa o toggle de IP Whitelist.

## 7. Secret no Supabase + código

```bash
supabase secrets set SHOPEE_PROXY_URL="http://seu_usuario:sua_senha_forte_aqui@SEU_IP_PUBLICO:8888"
```

No código Deno (só na chamada que precisa do dado sensível):
```ts
const proxyUrl = Deno.env.get("SHOPEE_PROXY_URL")
let client: Deno.HttpClient | undefined
if (proxyUrl) {
  const u = new URL(proxyUrl)
  client = Deno.createHttpClient({
    proxy: {
      url: `${u.protocol}//${u.host}`, // sem user:pass aqui -- vai em basicAuth
      basicAuth: { username: u.username, password: u.password },
    },
  })
}

try {
  const res = await fetch(shopeeUrl, client ? { client } : {})
  // ...
} finally {
  client?.close()
}
```

## Depois de validar

Rodar de novo o mesmo teste empírico que já fizemos hoje (function
descartável chamando `get_order_detail` com `recipient_address` e
conferindo se ainda vem mascarado) — só que agora passando pelo proxy —
antes de considerar isso resolvido de verdade.
