import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MARKETPLACES, MARKETPLACE_KEYS, findView, type Marketplace } from './marketplaceViews';
import logoShopee from '@/assets/logo-shopee.jpg';
import logoTikTok from '@/assets/logo-tiktok.png';

export function MarketplaceLogo({ mp, className }: { mp: Marketplace; className?: string }) {
  if (mp === 'shopee') {
    return <img src={logoShopee} alt="" className={cn('rounded-full object-cover', className)} />;
  }
  if (mp === 'tiktok') {
    return <img src={logoTikTok} alt="" className={cn('rounded object-cover', className)} />;
  }
  return (
    <span className={cn('grid place-items-center rounded-full bg-yellow-400 text-[9px] font-bold text-yellow-900', className)}>
      ML
    </span>
  );
}

// Seletor de marketplace da casca de Gestão — sempre visível, em qualquer
// view. Trocar de marketplace mantém a view atual se ela existir no destino
// (ex.: Resultados → Resultados), senão cai no Dashboard.
export function MarketplaceControl({ current, view }: { current: Marketplace; view: string }) {
  const navigate = useNavigate();

  const switchTo = (mp: Marketplace) => {
    if (mp === current) return;
    const target = findView(mp, view) ? view : 'dashboard';
    navigate(`/gestao/${mp}/${target}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {MARKETPLACE_KEYS.map((mp) => {
        const active = mp === current;
        return (
          <button
            key={mp}
            type="button"
            onClick={() => switchTo(mp)}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all',
              active
                ? cn(MARKETPLACES[mp].accent, 'border-transparent shadow-sm')
                : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            <MarketplaceLogo mp={mp} className="size-5 shrink-0" />
            {MARKETPLACES[mp].label}
          </button>
        );
      })}
    </div>
  );
}
