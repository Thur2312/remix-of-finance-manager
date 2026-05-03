import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { InPageNav, shopeeNavTabs, tiktokNavTabs } from '@/components/layout/InPageNav';
import { mercadolivreNavTabs } from '@/components/layout/InPageNav';

// Importa apenas o conteúdo interno — sem AppLayout aninhado
import { ShopeeDashboardContent } from '@/pages/shopee/Dashboard';
import { TikTokDashboardContent } from '@/pages/tiktok/TikTokDashboard';
import { MercadolivreDashboardContent } from '@/pages/mercadolivre/MercadolivreDashboard';

import logoShopee from '@/assets/logo-shopee.jpg';
import logoTikTok from '@/assets/logo-tiktok.png';

type MarketplaceFilter = 'shopee' | 'tiktok' | 'mercadolivre';

interface MarketplaceOption {
  value: MarketplaceFilter;
  label: string;
  available: boolean;
  comingSoon?: boolean;
}

const OPTIONS: MarketplaceOption[] = [
  { value: 'shopee',       label: 'Shopee',        available: true  },
  { value: 'tiktok',       label: 'TikTok Shop',   available: true  },
  { value: 'mercadolivre', label: 'Mercado Livre',  available: true  },
];

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
  const [selected, setSelected] = useState<MarketplaceFilter>('shopee');

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Gestão</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o marketplace que deseja gerenciar.
        </p>
      </div>

      <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 w-fit">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => opt.available && setSelected(opt.value)}
            disabled={!opt.available}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selected === opt.value && opt.available
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MarketplaceLogo mp={opt.value} />
            {opt.label}
            {opt.comingSoon && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                em breve
              </span>
            )}
          </button>
        ))}
      </div>

      {selected === 'shopee' && (
        <div className="space-y-4">
          <InPageNav tabs={shopeeNavTabs} />
          <ShopeeDashboardContent />
        </div>
      )}

      {selected === 'tiktok' && (
        <div className="space-y-4">
          <InPageNav tabs={tiktokNavTabs} />
          <TikTokDashboardContent />
        </div>
      )}

      {selected === 'mercadolivre' && (
        <div className="space-y-4">
          <InPageNav tabs={mercadolivreNavTabs} />
          <MercadolivreDashboardContent />
        </div>
      )}
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