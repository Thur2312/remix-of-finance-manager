import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { InPageNav, shopeeNavTabs, tiktokNavTabs, mercadolivreNavTabs } from '@/components/layout/InPageNav';

import logoShopee from '@/assets/logo-shopee.jpg';
import logoTikTok from '@/assets/logo-tiktok.png';

type MarketplaceFilter = 'shopee' | 'tiktok' | 'mercadolivre';

const OPTIONS = [
  { value: 'shopee'       as MarketplaceFilter, label: 'Shopee'       },
  { value: 'tiktok'       as MarketplaceFilter, label: 'TikTok Shop'  },
  { value: 'mercadolivre' as MarketplaceFilter, label: 'Mercado Livre' },
];

// Mapeia prefixo de rota → marketplace
const ROUTE_MAP: Record<string, MarketplaceFilter> = {
  '/shopee':       'shopee',
  '/tiktok':       'tiktok',
  '/mercadolivre': 'mercadolivre',
};

// Dashboard padrão de cada marketplace
const DASHBOARD_ROUTE: Record<MarketplaceFilter, string> = {
  shopee:        '/shopee/resultados',
  tiktok:        '/tiktok/resultados',
  mercadolivre:  '/mercadolivre/resultados',
};

const NAV_TABS: Record<MarketplaceFilter, typeof shopeeNavTabs> = {
  shopee:        shopeeNavTabs,
  tiktok:        tiktokNavTabs,
  mercadolivre:  mercadolivreNavTabs,
};

function MarketplaceLogo({ mp }: { mp: MarketplaceFilter }) {
  if (mp === 'shopee') {
    return <img src={logoShopee} alt="Shopee" className="h-5 w-5 rounded-full object-cover" />;
  }
  if (mp === 'tiktok') {
    return <img src={logoTikTok} alt="TikTok" className="h-5 w-5 rounded object-cover" />;
  }
  return (
    <div className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] font-bold text-yellow-900">
      ML
    </div>
  );
}

function GestaoContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Detecta qual marketplace está ativo pela rota atual
  const activeMarketplace: MarketplaceFilter =
    Object.entries(ROUTE_MAP).find(([prefix]) =>
      location.pathname.startsWith(prefix)
    )?.[1] ?? 'shopee';

  const handleSelect = (mp: MarketplaceFilter) => {
    navigate(DASHBOARD_ROUTE[mp]);
  };

  // Se estiver em /gestao (sem sub-rota), redireciona para shopee
  if (location.pathname === '/gestao') {
    navigate(DASHBOARD_ROUTE['shopee'], { replace: true });
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Gestão</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o marketplace que deseja gerenciar.
        </p>
      </div>

      {/* Seletor de plataforma */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 w-fit">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMarketplace === opt.value
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MarketplaceLogo mp={opt.value} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Nav tabs da plataforma ativa */}
      <InPageNav tabs={NAV_TABS[activeMarketplace]} />

      {/* Conteúdo da sub-rota */}
      <Outlet />

    </div>
  );
}

export default function Gestao() {
  return (
    <ProtectedRoute>
      <AppLayout title="Gestão">
        <GestaoContent />
      </AppLayout>
    </ProtectedRoute>
  );
}