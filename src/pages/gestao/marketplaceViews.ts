import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type Marketplace = 'shopee' | 'tiktok' | 'mercadolivre';
export type ViewKey =
  | 'dashboard'
  | 'resultados'
  | 'variacoes'
  | 'upload'
  | 'pagamentos'
  | 'pagamentos-upload'
  | 'configuracoes';

export interface MarketplaceView {
  key: ViewKey;
  label: string;
  Component: LazyExoticComponent<ComponentType>;
}

export interface MarketplaceDef {
  label: string;
  /** cor de fundo do estado ativo no seletor (assinatura por marca) */
  accent: string;
  views: MarketplaceView[];
}

// `React.lazy` com export nomeado — o `.then` mapeia o named export pro
// `default` que o lazy espera. Cada view é seu próprio chunk, então trocar
// de aba/marketplace não puxa os 15 componentes de uma vez.
const named = <M extends Record<string, unknown>, K extends keyof M>(
  loader: () => Promise<M>,
  key: K,
) => lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));

// ── Shopee ──────────────────────────────────────────────────────────────────
const ShopeeDashboard = named(() => import('@/pages/shopee/Dashboard'), 'ShopeeDashboardContent');
const ShopeeResultados = named(() => import('@/pages/shopee/Resultados'), 'ResultadosContent');
const ShopeeVariacoes = named(() => import('@/pages/shopee/ResultadosVariacoes'), 'ResultadosVariacoesContent');
const ShopeeUpload = named(() => import('@/pages/shopee/Upload'), 'UploadContent');
const ShopeeConfiguracoes = named(() => import('@/pages/shopee/Configuracoes'), 'ConfiguracoesContent');

// ── TikTok ──────────────────────────────────────────────────────────────────
const TikTokDashboard = named(() => import('@/pages/tiktok/TikTokDashboard'), 'TikTokDashboardContent');
const TikTokResultados = named(() => import('@/pages/tiktok/TikTokResultados'), 'TikTokResultadosContent');
const TikTokVariacoes = named(() => import('@/pages/tiktok/TikTokVariacoes'), 'TikTokVariacoesContent');
const TikTokUpload = named(() => import('@/pages/tiktok/TikTokUpload'), 'TikTokUploadContent');
const TikTokPagamentos = named(() => import('@/pages/tiktok/TikTokPagamentos'), 'TikTokPagamentosContent');
const TikTokPagamentosUpload = named(() => import('@/pages/tiktok/TikTokPagamentosUpload'), 'TikTokPagamentosUploadContent');
const TikTokConfiguracoes = named(() => import('@/pages/tiktok/TikTokConfiguracoes'), 'TikTokConfiguracoesContent');

// ── Mercado Livre ───────────────────────────────────────────────────────────
const MlDashboard = named(() => import('@/pages/mercadolivre/MercadolivreDashboard'), 'MercadolivreDashboardContent');
const MlResultados = named(() => import('@/pages/mercadolivre/resultados'), 'ResultadosContent');
const MlVariacoes = named(() => import('@/pages/mercadolivre/variacoes'), 'VariacoesContent');
const MlPagamentos = named(() => import('@/pages/mercadolivre/pagamentos'), 'PagamentosContent');
const MlConfiguracoes = named(() => import('@/pages/mercadolivre/configuracoes'), 'ConfiguracoesContent');

export const MARKETPLACES: Record<Marketplace, MarketplaceDef> = {
  shopee: {
    label: 'Shopee',
    accent: 'bg-[#F97316] text-white',
    views: [
      { key: 'dashboard', label: 'Dashboard', Component: ShopeeDashboard },
      { key: 'resultados', label: 'Resultados', Component: ShopeeResultados },
      { key: 'variacoes', label: 'Variações', Component: ShopeeVariacoes },
      { key: 'upload', label: 'Upload', Component: ShopeeUpload },
      { key: 'configuracoes', label: 'Configurações', Component: ShopeeConfiguracoes },
    ],
  },
  tiktok: {
    label: 'TikTok Shop',
    accent: 'bg-[#1F2937] text-white',
    views: [
      { key: 'dashboard', label: 'Dashboard', Component: TikTokDashboard },
      { key: 'resultados', label: 'Resultados', Component: TikTokResultados },
      { key: 'variacoes', label: 'Variações', Component: TikTokVariacoes },
      { key: 'upload', label: 'Upload', Component: TikTokUpload },
      { key: 'pagamentos', label: 'Pagamentos', Component: TikTokPagamentos },
      { key: 'pagamentos-upload', label: 'Upload Pgtos', Component: TikTokPagamentosUpload },
      { key: 'configuracoes', label: 'Configurações', Component: TikTokConfiguracoes },
    ],
  },
  mercadolivre: {
    label: 'Mercado Livre',
    accent: 'bg-[#FFE600] text-[#2D3277]',
    views: [
      { key: 'dashboard', label: 'Dashboard', Component: MlDashboard },
      { key: 'resultados', label: 'Resultados', Component: MlResultados },
      { key: 'variacoes', label: 'Variações', Component: MlVariacoes },
      { key: 'pagamentos', label: 'Pagamentos', Component: MlPagamentos },
      { key: 'configuracoes', label: 'Configurações', Component: MlConfiguracoes },
    ],
  },
};

export const MARKETPLACE_KEYS = Object.keys(MARKETPLACES) as Marketplace[];

export function isMarketplace(v: string | undefined): v is Marketplace {
  return v !== undefined && v in MARKETPLACES;
}

export function findView(marketplace: Marketplace, view: string | undefined): MarketplaceView | undefined {
  return MARKETPLACES[marketplace].views.find((v) => v.key === view);
}

export function viewLabel(marketplace: Marketplace, view: string): string | undefined {
  return findView(marketplace, view)?.label;
}
