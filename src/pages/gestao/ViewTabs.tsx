import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MARKETPLACES, type Marketplace } from './marketplaceViews';

// Abas de view da casca de Gestão. Mesmo visual do <InPageNav>, mas os hrefs
// são /gestao/:marketplace/:view e a lista vem do modelo por marketplace
// (TikTok tem Pagamentos, Shopee tem Upload, etc.).
export function ViewTabs({ marketplace, current }: { marketplace: Marketplace; current: string }) {
  const views = MARKETPLACES[marketplace].views;

  return (
    <div className="overflow-x-auto">
      <nav className="flex w-fit min-w-full gap-1 rounded-lg border border-border/50 bg-muted/50 p-1.5 sm:min-w-0">
        {views.map((v) => {
          const active = v.key === current;
          return (
            <Link
              key={v.key}
              to={`/gestao/${marketplace}/${v.key}`}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-5 py-2 text-sm font-medium transition-all',
                active
                  ? 'border-b-2 border-primary bg-background font-semibold text-primary shadow-xs'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
