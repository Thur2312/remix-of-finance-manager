import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTopbarTitle } from '@/components/layout/TopbarTitleContext';
import { PageShell } from '@/components/layout/PageShell';
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

// Assinatura visual sutil por marketplace no seletor — antes os três caíam
// no mesmo estado "ativo" genérico (bg-background), sem nenhuma pista de
// qual contexto de marca a pessoa está gerenciando.
const MARKETPLACE_ACCENT: Record<MarketplaceFilter, string> = {
  shopee: 'bg-[#F97316] text-white shadow-sm',
  tiktok: 'bg-[#1F2937] text-white shadow-sm',
  mercadolivre: 'bg-[#FFE600] text-[#2D3277] shadow-sm',
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

interface GestaoContentProps {
  selected: MarketplaceFilter;
  onSelect: (value: MarketplaceFilter) => void;
}

// Título/subtítulo de página já vêm do topbar (AppLayout, ver Gestao default
// export abaixo) — não repetir um segundo cabeçalho aqui. O seletor de
// marketplace já é autoexplicativo (ícone + nome de cada um).
function GestaoContent({ selected, onSelect }: GestaoContentProps) {
  return (
    <PageShell className="space-y-8">

      <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1 w-fit">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => opt.available && onSelect(opt.value)}
            disabled={!opt.available}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selected === opt.value && opt.available
                ? MARKETPLACE_ACCENT[opt.value]
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
    </PageShell>
  );
}

// Mesmo padrão de título das outras telas de marketplace (ex.: "Gestão
// Shopee" em shopee/Resultados.tsx) — antes o topbar ficava genérico
// ("Gestão", sem o marketplace) enquanto o resto do app já mostrava o
// contexto completo, inconsistência visível ao trocar de aba.
const MARKETPLACE_TITLE: Record<MarketplaceFilter, string> = {
  shopee: 'Gestão Shopee',
  tiktok: 'Gestão TikTok Shop',
  mercadolivre: 'Gestão Mercado Livre',
};

const VALID_MARKETPLACES: MarketplaceFilter[] = ['shopee', 'tiktok', 'mercadolivre'];

function isMarketplaceFilter(value: string | null): value is MarketplaceFilter {
  return VALID_MARKETPLACES.includes(value as MarketplaceFilter);
}

export default function Gestao() {
  const [searchParams] = useSearchParams();
  // Permite abrir já na aba certa via ?mp=shopee — usado pelo redirect
  // pós-conexão OAuth, que antes sempre mandava de volta pra Integrações
  // em vez de mostrar o marketplace recém-conectado.
  const mpParam = searchParams.get('mp');
  const [selected, setSelected] = useState<MarketplaceFilter>(
    isMarketplaceFilter(mpParam) ? mpParam : 'shopee'
  );
  useTopbarTitle(MARKETPLACE_TITLE[selected]);

  return <GestaoContent selected={selected} onSelect={setSelected} />;
}