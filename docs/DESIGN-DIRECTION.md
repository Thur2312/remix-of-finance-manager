# Direção criativa — Seller Finance (proposta, sem implementação)

> Documento de proposta. Nenhum código foi alterado. Aguarda validação do usuário antes de qualquer implementação — produto em produção real, com usuários pagantes (www.sellerfinance.com.br).

## 1. Diagnóstico — o que hoje "grita feito por IA"

Levantamento feito direto no código (não é opinião solta — cada ponto tem arquivo:linha).

**1.1 Design system nunca saiu do template.** `components.json` declara `"baseColor": "slate"` — é o `npx shadcn init` default, quase intocado. Única customização global é `--radius: 1rem` (`src/index.css:10-74`, `tailwind.config.ts:116-120`). Zero identidade de marca no sistema de tokens.

**1.2 Duas paletas de azul convivendo.** O app (dashboard, componentes shadcn) usa `--primary: 217 91% 60%` (blue-500 genérico). A landing usa `#318EF1` hardcoded dezenas de vezes (`LandingPage.tsx:161,169,203,263,292...`), desconectado dos tokens CSS. Há até um comentário no próprio código admitindo a inconsistência histórica (`index.css:217-219`, sobre o CTA que "ficava com a cor errada"). Isso é o sintoma clássico de produto que nunca teve uma decisão de marca — só remendos.

**1.3 Tipografia fantasma.** `tailwind.config.ts` declara `serif: Lora` e `mono: Space Mono`, mas nenhuma das duas é importada em lugar nenhum — caem no fallback do sistema. A landing ainda soma uma terceira fonte não carregada, `"Space Grotesk"` (`LandingPage.tsx:956`, inline). Resultado: três famílias configuradas, zero comprometimento real — só `Inter` (a fonte mais "neutra possível") é efetivamente usada em todo o produto. Isso é a manifestação tipográfica mais literal de "cara de IA": Inter em peso 400, sem hierarquia de personagem.

**1.4 A landing é um catálogo de padrões de landing-builder:**
- Hero centralizado clássico: badge pulsante + headline + subheadline + CTA + avatares de prova social (`LandingPage.tsx:160-193`).
- Blobs de gradiente radial decorativos, sem função (`:153-155`, `:707-710`).
- **6 SVGs de "onda" quase idênticos** separando seções (só muda a cor de preenchimento) — o assinatura mais reconhecível de landing gerada por builder.
- 8+ ocorrências do padrão "ícone Lucide num quadrado/círculo com fundo colorido translúcido" — feature-card clonado.
- Avatares de prova social **falsos**: iniciais em círculos coloridos (`:187-193`), sem foto/nome real.
- Imagens do hero/features apontando para domínio de sandbox temporário (`manuscdn.com/...&Expires=1798761600`) — evidência direta de que a landing foi gerada por uma ferramenta tipo Manus/Lovable e nunca recebeu assets finais.
- CTAs terminando em seta (`"ASSINE AGORA →"`) repetidos 6+ vezes.

**1.5 Motion fragmentado.** Framer Motion está instalado e é usado de verdade em 8 arquivos internos (Perfil, upload, assistente...), mas a **landing — a vitrine pública** — reimplementa scroll-reveal na mão via `IntersectionObserver` + classe CSS (`LandingPage.tsx:40-53`). A página que mais precisa de motion cuidadoso é a que usa a abordagem mais pobre.

**1.6 Dark mode é infraestrutura morta.** CSS completo pronto (`.dark {...}`, `index.css:76-135`), `next-themes` instalado, mas sem `ThemeProvider` montado em nenhum lugar (`main.tsx` não tem) e sem toggle. Não é bug visível hoje, mas é trabalho já pago e não capturado.

**1.7 Gráficos com paleta solta.** Existem tokens `--chart-1..5` prontos no CSS, mas `DashboardCharts.tsx:12` ignora e usa hex hardcoded próprio (`['#1565C0','#14B8A6','#F97316','#EC4899','#8B5CF6']`). Sinal de que cada tela resolveu cor sozinha, sem sistema.

**Conclusão do diagnóstico:** o problema não é falta de ferramenta (Framer Motion, shadcn, Recharts — tudo já está lá). É falta de **decisão de marca**: nenhum token, tipografia ou motion foi de fato escolhido e aplicado com consistência — foi tudo herdado do gerador (shadcn default) ou de uma ferramenta de scaffolding de landing (blobs, ondas, avatares fake, imagens de sandbox).

---

## 2. Proposta de identidade visual

### 2.1 Tipografia — sair do Inter-sozinho

Manter Inter (já integrada, boa fonte de UI, zero custo de migração) só para **corpo de texto e UI densa** (formulários, tabelas, menus). Resolver a hierarquia com dois complementos:

- **Display/headline: `Fraunces`** (Google Fonts, variável, gratuita). Serifada contemporânea com personalidade editorial — usada por fintechs premium (Mercury, Ramp usam registros parecidos) exatamente para fugir do "SaaS frio". Contraste alto com Inter cria hierarquia imediata: título com caráter, corpo neutro e legível. Substitui o `Lora` fantasma — a config já *previa* um serif de display, só nunca foi carregado nem escolhido com intenção.
- **Números/dados financeiros: `Space Mono`** (já configurado em `tailwind.config.ts`, só falta importar). Mono para KPIs, saldos, valores em tabela é um padrão estabelecido em fintech "de verdade" (transmite precisão/auditabilidade) e resolve de graça duas coisas ao mesmo tempo: dá uma segunda camada de personalidade tipográfica E melhora legibilidade de números (alinhamento tabular). Aplicar em: cards de KPI do dashboard, DRE, fluxo de caixa, calculadora de precificação — em qualquer lugar que hoje mostra `R$ 12.847,32` em Inter genérico.

Resultado: 3 famílias com papel claro (display / corpo / dado), não 3 famílias soltas competindo por atenção.

### 2.2 Paleta — evoluir o azul de domínio, não abandonar

Financeiro/marketplace pede confiança — manter a família azul faz sentido, mas hoje ela é genérica *e* duplicada. Proposta:

- **Canonizar UM azul de marca nos tokens CSS.** Adotar `#318EF1` (o que já está espalhado na landing, é a cor "verdadeira" da marca) como `--primary` oficial do sistema — não um azul-500 de paleta padrão. Isso mata a divergência landing-vs-app com uma mudança de token, não uma reescrita.
- **Ancorar o modo escuro/hero em `#0A1628`** (navy profundo já usado na landing) como cor de fundo de destaque — em vez do slate-900 genérico. É mais rico, mais "cofre financeiro", menos "bootstrap admin template".
- **Adicionar um accent fora da família azul.** Um dourado/âmbar quente (ex. na faixa `#D4A24C`–`#E8B84A`) para o conceito "lucro real" — usado com moderação em: destaque de margem/lucro positivo, elementos de CTA de maior hierarquia, badges de destaque. Hoje o produto usa azul para *tudo* (CTA, links, ícones, gráficos) — sem um segundo tom, não existe hierarquia visual, só intensidade de uma cor só. Manter verde/vermelho semânticos (ganho/perda) como já existe, mas *distintos* do accent dourado (accent = "marca/destaque", verde/vermelho = "sinal", não confundir os dois papéis).
- **Unificar gráficos aos tokens `--chart-1..5`** em vez de hex soltos por componente — engloba a paleta acima (azul-marca, âmbar, verde, mais 2 neutros de apoio) para que todo gráfico do produto (Recharts) puxe da mesma fonte.

### 2.3 Motion — dar um papel real pro Framer Motion já instalado

Hoje Framer Motion existe mas não tem uma "linguagem" — é usado ad-hoc em telas isoladas. Propor um vocabulário de motion consistente, aplicável tanto na landing quanto no app:

- **Micro-interações:** hover com leve *lift* (translateY -2px + sombra) em cards e botões primários; tap com scale 0.97. Pequeno, mas hoje não existe em lugar nenhum — reforça "produto cuidado".
- **Reveal de seção:** stagger de entrada em grids de card (dashboard, features da landing) — Framer Motion `staggerChildren`, substituindo o `IntersectionObserver`+CSS caseiro da landing por uma solução única e reaproveitável.
- **Contadores animados:** KPIs financeiros (saldo, lucro, margem) sobem com `animate`/`useSpring` do Framer Motion em vez de aparecer estático — comunica "dado vivo", relevante pro domínio (mesma ideia do `StatsSection` que já existe na landing, mas hoje reimplementada na mão).
- **Transição de rota:** `AnimatePresence` num fade/slide leve entre as ~48 rotas do app — hoje troca seca. Baixo custo, alto ganho de percepção de qualidade num produto com tantas telas internas.
- **Layout animations:** accordions (FAQ, features) e tabs (`WhatIsSection`) usando `layout` do Framer Motion em vez de CSS transition simples — transições mais fluidas sem trabalho extra de easing manual.

### 2.4 Lib nova — só onde Framer Motion não é a ferramenta certa

Framer Motion cobre bem interação de componente (hover, reveal, layout, rota). O que ele **não** faz bem é orquestração de scroll longo e contínuo (scroll-scrubbed timelines, pin de seção) — é aí que entra uma ferramenta de scroll storytelling, só na landing:

- **GSAP + ScrollTrigger** (free desde a aquisição Webflow/GreenSock) — para a landing contar visualmente "pedido chega → taxas descontadas uma a uma → lucro real revelado" como uma sequência scroll-scrubbed no hero/problem, em vez do gradiente-blob decorativo atual. Precedente direto: usado com sucesso no redesign do zyra-website para o mesmo objetivo (contar história pelo scroll, hero com elemento que reage à rolagem).
- **Lenis** para smooth-scroll, sincronizado ao ScrollTrigger via `gsap.ticker`. Pacote leve (~2.6kb), não exige reestruturação de DOM (ao contrário do GSAP ScrollSmoother, que precisa envolver `#smooth-wrapper > #smooth-content` — problemático se a landing tiver qualquer elemento `position: sticky/fixed`, como a navbar provavelmente tem). Escolha já validada nesse exato trade-off num projeto anterior do time.
- **Escopo da dependência nova: só a landing**, carregada via `React.lazy`/code-split — GSAP+Lenis não deve entrar no bundle do app logado (48 rotas de dashboard não precisam de scroll storytelling; adicionar peso ali seria puro custo sem ganho). Framer Motion já resolve 100% do que o app interno precisa.

Sem overengineering: não hà necessidade de three.js/WebGL aqui — o produto é financeiro/dados, não teria retorno visual proporcional ao custo de um motor 3D (diferente do caso zyra, que tinha um motivo de marca — glifo/halftone — pra justificar). Manter a ambição de motion focada em: tipografia com peso, uma paleta com hierarquia real, e scroll com propósito narrativo — não em efeitos 3D genéricos que por si só também viram "clichê de site bonito", só que mais caro.

---

## 3. Landing page — de template pra vitrine intencional

Estrutura atual (`Navbar → Hero → WhatIs → HowItWorks → Features → Stats → Pricing → CTA → FAQ → Footer`) já é conceitualmente razoável — o problema é execução genérica, não a ordem das seções. Ajustes propostos:

**Hero:** trocar o blob de gradiente decorativo por uma **visualização funcional** — um mini-componente animado (Recharts + Framer Motion) mostrando de verdade "pedido de R$100 → taxa Shopee −R$18 → frete −R$8 → imposto −R$4 → **lucro real R$70**" contando em tempo real ao carregar a página. Isso faz o hero *demonstrar* a proposta de valor ("descubra seu lucro real") em vez de ilustrar com forma abstrata — mais persuasivo e automaticamente menos genérico, porque nenhum template tem esse componente pronto.

**Problem/WhatIs:** consolidar as duas seções (hoje redundantes — `WhatIsSection` e `FeaturesSection` cobrem território parecido) numa só, puxada pelo scroll storytelling do GSAP ScrollTrigger: a rolagem revela, taxa por taxa, o que hoje fica escondido pro vendedor (motivo real de precisar do produto), sincronizado com a mesma mecânica visual do hero.

**Prova social:** remover os avatares-iniciais fake até existir depoimento real com nome/foto de cliente — placeholder falso é exatamente o tipo de detalhe que sinaliza "produto sem tração ainda" pra quem olha com atenção; melhor não ter a seção do que ter uma versão fake.

**Assets:** substituir as imagens hospedadas em domínio de sandbox temporário (`manuscdn.com`, expiração 2026/2026) por screenshots reais do produto ou pelo componente de visualização animada do item acima — risco real de as imagens simplesmente pararem de carregar quando o link expirar, além do problema estético.

**Divisórias de seção:** consolidar as 6 ondas SVG quase-idênticas num motivo único e assinado (ou abandonar o recurso — transição por cor de fundo sólida + espaçamento generoso já resolve sem o clichê visual).

**Stats:** manter contador animado (já existe a ideia certa), migrar a implementação pra Framer Motion `useSpring` no lugar da versão custom atual, por consistência com o resto do motion vocabulary.

**CTA copy:** manter "assine agora" como ação clara, mas variar a repetição do sufixo `→` — hoje usado 6+ vezes, perde força por repetição.

---

## 4. Escopo faseado

### Fase 1 — Landing page (maior impacto visual / menor esforço)
A landing é vitrine pública, rota única (`/`), isolada do app logado — dá pra reescrever sem tocar nas 48 rotas internas nem arriscar regressão em fluxo financeiro real.

- Canonizar `--primary: #318EF1` nos tokens CSS (mata a divergência de azul duplo).
- Carregar Fraunces (display) + Space Mono (dados) de verdade; aplicar hierarquia tipográfica na landing primeiro.
- Novo hero com visualização funcional (Recharts+Framer Motion) no lugar do blob decorativo.
- GSAP ScrollTrigger + Lenis, escopados/lazy-loaded só nessa rota, para o scroll storytelling do Problem.
- Remover: avatares fake, imagens de sandbox, ondas SVG repetidas (consolidar/remover).
- Consolidar WhatIs+Features.

### Fase 2 — Design system aplicado no app inteiro (48 rotas + dashboard)
Depois da landing validada (é onde a decisão de marca se prova primeiro, barato de iterar), propagar pro resto:

- Aplicar os tokens novos (`--primary`, accent âmbar, navy) em `src/components/ui/*` — todo componente shadcn herda automaticamente por já usar `hsl(var(--x))`.
- Unificar `--chart-1..5` como fonte única de cor pra todos os componentes Recharts (Dashboard, DRE, Fluxo de Caixa, TikTok Pagamentos etc.), substituindo hex hardcoded por arquivo.
- Aplicar Space Mono em KPIs/valores monetários nas telas de DRE, fluxo de caixa, calculadora de precificação, telas por marketplace.
- Conectar o dark mode já pronto no CSS: montar `ThemeProvider` (next-themes, já instalado) + toggle na UI — trabalho já pago, só falta ligar.
- Vocabulário de motion (hover lift, stagger reveal, transição de rota via `AnimatePresence`) aplicado sistematicamente nas 48 rotas — sem GSAP aqui, só Framer Motion (já suficiente e já no bundle do app).
- Revisão de hierarquia/espaçamento tela a tela usando a nova escala tipográfica.

---

## Próximo passo

Esta é só a direção — nenhuma linha de código de produto foi alterada. Validar com o usuário: (1) concordância com a dupla tipográfica (Fraunces+Inter+Space Mono) e o accent âmbar somado ao azul, (2) aprovação do escopo faseado (landing primeiro, app depois), (3) ok para instalar GSAP+Lenis como dependências novas (escopadas à landing). Após aprovação, handoff de implementação para `nexo-dev-frontend`.

---

## 5. Addendum — escalada de craft (pós-implementação Fase 1, revisão do estado real)

> Contexto: Fase 1 da landing já implementada (branch `design/landing-redesign`, componentes `src/components/landing/{HeroProfitVisual,ProblemSection,AnimatedStat}.tsx` + scroll-scrub via GSAP ScrollTrigger/Lenis). Feedback do usuário: gostou do scroll travado (**manter exatamente como está, não mexer no mecanismo**), mas o resultado geral ainda está "muito simples" — quer nível de landing de agência (~R$50 mil), não só "correto". Esta seção propõe onde subir a ambição **só em estilização** (cor, tipografia, textura, craft gráfico) — sem adicionar mais mecânica de scroll.

### 5.1 O que já está implementado (ponto de partida, não descartar)

Lido direto do código atual: `HeroProfitVisual.tsx` (card vidro-fosco com breakdown pedido→taxas→lucro, contador animado via `useSpring`, mini `BarChart` Recharts), `ProblemSection.tsx` (scroll-scrub GSAP com painel sticky + 4 passos, mais 2 blocos de accordion com paineis de analytics/calculadora), tokens `--navy`/`--gold` já no `index.css`, fontes Fraunces/Inter/Space Mono carregando. A base conceitual é boa — "lucro real" já aparece como número que sobe de verdade, não é só decoração. O problema é execução: tudo usa o **vocabulário genérico do Tailwind/shadcn** por baixo (`rounded-2xl`, `shadow-2xl`, `ease-out`, `transition-all duration-300`), que é sempre a assinatura visual de "correto e datado" — nunca de "caro".

Evidência concreta do que está raso hoje:
- **Easing 100% default**: todo `motion.div` do projeto usa `ease: "easeOut"` (a curva padrão do Framer Motion) — zero curva de assinatura. `grep` confirma: única variação de easing no código inteiro é "easeOut", repetida.
- **Sombras são literalmente o preset padrão do shadcn**: `--shadow-2xl: 0 25px 50px -12px hsl(0 0% 0% / 0.15)` (`index.css:79`) é neutro (`0 0% 0%`, preto puro) — nenhuma sombra do produto tem tingimento de cor (navy/gold), nenhuma é multi-camada de verdade além do que o Tailwind já empilha por padrão.
- **Ícone social no rodapé ainda no padrão genérico** "círculo translúcido com ícone" (`LandingPage.tsx:727,731`) — resíduo pontual do padrão antigo que passou batido.
- Nenhum grain/textura, nenhum cursor customizado, nenhuma peça gráfica bespoke — só cards com borda + blur + Recharts default.

### 5.2 Priorização (maior retorno visual por menor esforço primeiro)

**P1 — Easing de assinatura (esforço: baixo, retorno: alto, toca o código inteiro de uma vez).**
Trocar TODAS as ocorrências de `ease: "easeOut"` por uma curva custom tipo `[0.16, 1, 0.3, 1]` ("expo-out" — a curva usada por Linear/Stripe/Vercel para transições "caras", desacelera com mais autoridade no final em vez do easeOut genérico do Framer Motion) e alinhar as transições CSS (`transition-all duration-300`) para o mesmo `cubic-bezier` via classe utilitária custom no Tailwind. É find-and-replace de escopo, mas muda a sensação de *cada* hover/reveal do site de uma vez só — é o ajuste de maior ROI possível porque não é feature nova, é qualidade da interação que já existe.

**P2 — Sombras com profundidade e tingimento real (esforço: baixo).**
Substituir os `--shadow-*` neutros (preto puro) por sombras coloridas/multi-camada usando os tokens de marca: ex. cards sobre fundo navy ganham sombra com leve tingimento azul-marinho profundo (`hsl(var(--navy) / 0.4)`), o card do `HeroProfitVisual` (hoje `shadow-2xl` genérico) ganha 2-3 camadas empilhadas (uma sombra difusa ampla + uma de contato mais próxima e escura) em vez de uma única regra do Tailwind. Custo de implementação é trivial (são só valores CSS), efeito perceptual é grande — é a diferença entre "card com Tailwind default" e "card desenhado".

**P3 — Textura/grain sutil nas seções escuras (esforço: baixo).**
Uma camada de ruído (SVG `feTurbulence` inline ou PNG base64 de ~2kb) em opacity muito baixa (2-4%) sobre `.section-dark`/`bg-navy` — recurso clássico de "não parece feito em 10 minutos" usado por produtos premium (Linear, Vercel, agências) exatamente porque cobre a platitude do flat-color sem custo de performance real (é decorativo, não interativo). Aplicar nas 3-4 seções que já usam `section-dark`/`bg-navy`.

**P4 — Um momento tipográfico com ambição de verdade (esforço: médio).**
Hoje toda seção segue a mesma fórmula (eyebrow pequeno + `font-serif text-3xl md:text-4xl`) — cria monotonia, é "sistema aplicado com disciplina" mas nunca "momento de impacto". Propor **um único ponto de quebra intencional**: no Hero, o número "R$ 70" (ou o "lucro real" do headline) ganha tratamento tipográfico fora da escala — tamanho dramaticamente maior, talvez sangrando levemente pra fora do card, cor gold em peso mais pesado da Fraunces (`opsz` alto). Não é sistema novo, é *uma exceção deliberada* à disciplina do resto — o tipo de detalhe que sinaliza direção de arte em vez de aplicação de template.

**P5 — Peça gráfica bespoke no Hero (esforço: médio-alto, mas é a única peça verdadeiramente "assinatura" da proposta).**
`HeroProfitVisual` hoje é um card de vidro + `BarChart` Recharts — funcional, mas é literalmente o que qualquer dashboard SaaS mostra. Propor evoluir para algo que **não existe em nenhum template**: um recibo/nota fiscal estilizado, com "rasgo" de perfuração desenhado em SVG entre a lista de descontos e o total, desenhado à mão (path SVG customizado, não ícone de biblioteca) — reforça literalmente o conceito "o que sobra depois dos descontos" com uma metáfora visual própria da marca, em vez de um card genérico de app. Pode ganhar um único traço de `stroke-dashoffset` desenhando-se uma vez ao entrar em view (reveal de entrada, **não** nova mecânica de scroll — dispara uma vez com `useInView`, igual ao que já existe hoje, só troca o quê anima).

**P6 — Micro-interações com personalidade, sem mexer no scroll (esforço: baixo-médio).**
- Botão CTA primário ("QUERO VER MEU LUCRO REAL →") com hover magnético leve (desloca alguns px em direção ao cursor dentro da área do botão via Framer Motion, técnica comum em landing de agência) em vez do hover flat atual.
- Cards de pricing (`PricingSection`) com tilt 3D sutil no hover (`whileHover` com `rotateX`/`rotateY` + `perspective`, poucos graus) em vez do `y: -4` genérico atual.
- Cursor customizado **só** sobre o `HeroProfitVisual` (um pequeno indicador "R$" ou ponto que segue o cursor dentro da área do card) — escopo contido a um único componente-assinatura, não um cursor global (que teria custo/risco de acessibilidade maior sem retorno proporcional).
- Ícones sociais do rodapé (`LandingPage.tsx:727,731`) saem do padrão genérico "círculo translúcido" e ganham o mesmo hover magnético/tilt do resto, fechando a última ocorrência do padrão antigo.

### 5.3 O que fica de fora deliberadamente

Por instrução explícita do usuário (via maestro, nesta rodada): **nenhuma mecânica de scroll nova** — sem pin/scrub adicional em mais seções, sem parallax de camadas novo. O `ScrollStory` do `ProblemSection` e o Lenis smooth-scroll continuam exatamente como estão. Tudo em 5.2 é estilização pura (cor, sombra, textura, tipografia, easing, micro-interação local) sobre a estrutura de scroll já aprovada — não fica sujeito ao mesmo risco de regressão que mexer em `ScrollTrigger`/`Lenis` teria.

### Próximo passo

Validar com o usuário se a priorização P1→P6 faz sentido (especialmente P5, que é a única peça de esforço médio-alto e a mais "assinatura" das seis) antes do handoff pro `nexo-dev-frontend` continuar a implementação na mesma branch `design/landing-redesign`.
