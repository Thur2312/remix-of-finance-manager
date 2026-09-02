// Fallback de rótulo por rota — só usado pelo <Breadcrumbs> quando a rota não
// cai no modelo de navegação (navModel.ts). O rastro normal ("Grupo › Item")
// vem de lá; isto cobre as bordas (ex.: /setup-payment).
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/previsao': 'Previsão de caixa',
  '/vendas': 'Vendas',
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
};

export function getPageTitle(pathname: string): string | undefined {
  return PAGE_TITLES[pathname];
}
