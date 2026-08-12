// Título do topbar por rota — fonte única de verdade. Antes cada página
// repetia o próprio texto (às vezes divergindo: "Gestão Shopee" numa tela,
// nada na outra), o que fazia o topbar mudar de padrão a cada navegação.
// Rotas com título dinâmico (depende de estado do componente, não só da
// URL) não entram aqui — usam useTopbarTitle() em vez disso.
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/mercadolivre/resultados': 'Gestão Mercado Livre',
  '/mercadolivre/variacoes': 'Gestão Mercado Livre',
  '/mercadolivre/pagamentos': 'Gestão Mercado Livre',
  '/mercadolivre/configuracoes': 'Gestão Mercado Livre',
  '/shopee/configuracoes': 'Gestão Shopee',
  '/shopee/upload': 'Gestão Shopee',
  '/shopee/resultados': 'Gestão Shopee',
  '/shopee/variacoes': 'Gestão Shopee',
  '/tiktok/configuracoes': 'Gestão TikTok',
  '/tiktok/upload': 'Gestão TikTok',
  '/tiktok/resultados': 'Gestão TikTok',
  '/tiktok/variacoes': 'Gestão TikTok',
  '/tiktok/pagamentos': 'Gestão TikTok',
  '/tiktok/pagamentos/upload': 'Gestão TikTok',
  '/calculadora': 'Precificação',
  '/precificacao/custos': 'Custos Fixos',
  '/fluxo-caixa': 'Fluxo de Caixa',
  '/fluxo-caixa/lancamentos': 'Fluxo de Caixa',
  '/fluxo-caixa/categorias': 'Fluxo de Caixa',
  '/assistente-anuncio': 'Assistente',
  '/dre': 'DRE',
  '/perfil': 'Meu Perfil',
  '/integrations': 'Integrações',
  '/planos': 'Planos',
  '/user/auth/planos': 'Planos',
  '/setup-payment': 'Configurar pagamento',
  // '/gestao' e '/integrations/:provider' têm título dinâmico — ver
  // useTopbarTitle() em Gestao.tsx e IntegrationManage.tsx.
};

export function getPageTitle(pathname: string): string | undefined {
  return PAGE_TITLES[pathname];
}
