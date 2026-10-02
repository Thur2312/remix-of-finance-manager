# Design System — Landing Page — "Recibo & Caderno de contas"

> Substitui a direção anterior documentada em `docs/DESIGN-DIRECTION.md`
> (navy/azul/dourado — ficou genérica demais, parecida com outro projeto da
> casa). Esta é a identidade escolhida em 02/10/2026, só para a **landing
> page pública** (`/`) — o app interno logado mantém os tokens
> `--navy`/`--gold`/`--primary` como estão, sem mudança.

## Conceito

A marca de um recibo de verdade: papel quente, tinta escura, um
carimbo-vermelho que marca o que importa. O produto existe pra mostrar "o
que sobra depois dos descontos" — a identidade inteira gira em torno dessa
metáfora, não só o detalhe do rasgo no Hero que já existia. Tom de copy
direto, um pouco áspero, "sem letra miúda".

## Paleta

| Token | Hex | HSL | Uso |
|---|---|---|---|
| `--landing-paper` | `#F4EEE2` | `40 45% 92%` | Fundo primário (substitui o navy `#0A1628`) |
| `--landing-paper-raised` | `#FBF8F1` | `40 50% 97%` *(estimado)* | Cards/superfícies elevadas sobre o paper |
| `--landing-ink` | `#1C2B39` | `209 34% 17%` | Texto principal, base escura onde ainda precisar de contraste alto |
| `--landing-ink-muted` | `#5B6B78` | `205 15% 40%` *(estimado)* | Texto secundário sobre paper |
| `--landing-stamp` | `#C4452E` | `9 62% 47%` | Cor de marca / CTA — substitui `#318EF1` como destaque principal |
| `--landing-stamp-dark` | `#9C3722` | `9 62% 38%` *(estimado)* | Hover do stamp |
| `--landing-ledger` | `#2F5233` | `127 27% 25%` | Verde "razão contábil" — positivo/lucro, secundário ao stamp |
| `--landing-ledger-light` | `#4A7550` | `127 22% 36%` *(estimado)* | Variante clara do ledger pra fundo escuro pontual |

**Regra de uso:** stamp = ação/marca (CTA, destaque, links); ledger = sinal positivo (lucro, crescimento, sucesso) — os dois nunca competem pelo mesmo papel. Nunca usar o azul `#318EF1` antigo na landing depois dessa migração.

## Tipografia

- **Display:** Fraunces (mantido — já é a serifada de personalidade do produto).
- **Dados/números:** Space Mono (mantido — reforça o conceito "máquina de somar"; já carregado no projeto).
- **Corpo:** Inter (mantido).

Sem fonte nova pra carregar — só muda a aplicação de cor sobre a mesma tipografia.

## Textura e superfícies

- Fundo primário vira **claro** (paper), não mais o navy com blobs de gradiente — `AmbientBackground` precisa de reformulação conceitual (textura de papel/grão sutil, não glow azul flutuante).
- `.glass-card`/`.glass-panel` (desenhados pra "vidro sobre fundo escuro") não fazem sentido nessa nova base clara — viram cards de papel com borda fina e sombra quente (tingida de ink, não preto puro), mantendo a lógica de sombra multi-camada já estabelecida no resto do produto.
- O **rasgo de recibo** (`ReceiptTear.tsx`, já existe) deixa de ser um detalhe isolado do Hero e vira elemento recorrente — ex.: divisor entre seções, não só dentro do card de lucro.

## O que NÃO muda

- App interno logado (`--navy`/`--gold`/`--primary`, `.panel`) — fora de escopo, tokens à parte.
- Easing de assinatura (`cubic-bezier(0.16,1,0.3,1)`), estrutura de seções, mecânica de scroll — mantidos.
