import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { sidebarGroups, adminItem, contaItems, sectionRoutes } from './navModel';
import { shopeeNavTabs, tiktokNavTabs, fluxoCaixaNavTabs, mercadolivreNavTabs } from './InPageNav';
import { getPageTitle } from './pageTitles';

export interface Crumb {
  label: string;
  href?: string;
}

// Todos os grupos da navegação, incluindo os dois que a sidebar monta fora
// de `sidebarGroups` (Conta no rodapé, Admin condicional).
const GROUPS = [
  ...sidebarGroups.map((g) => ({ label: g.label, items: g.items })),
  { label: 'Conta', items: contaItems },
  { label: 'Admin', items: [adminItem] },
];

const ALL_TABS = [...shopeeNavTabs, ...tiktokNavTabs, ...fluxoCaixaNavTabs, ...mercadolivreNavTabs];

const MARKETPLACE_NAMES: Record<string, string> = {
  shopee: 'Shopee',
  tiktok: 'TikTok',
  mercadolivre: 'Mercado Livre',
};

function findItem(pathname: string) {
  for (const group of GROUPS) {
    for (const item of group.items) {
      if (item.url === pathname) return { group: group.label, item };
      if (item.url === '/integrations' && pathname.startsWith('/integrations')) {
        return { group: group.label, item };
      }
      if (sectionRoutes[item.url]?.includes(pathname)) return { group: group.label, item };
    }
  }
  return null;
}

// Deriva "Grupo › Item (› subpágina)" a partir da rota, usando o mesmo modelo
// de navegação da sidebar. Substituiu o título solto do topbar.
function getBreadcrumbs(pathname: string): Crumb[] {
  const found = findItem(pathname);
  if (!found) {
    const title = getPageTitle(pathname);
    return title ? [{ label: title }] : [];
  }

  const onItemPage = pathname === found.item.url;
  const crumbs: Crumb[] = [
    { label: found.group },
    { label: found.item.title, href: onItemPage ? undefined : found.item.url },
  ];

  if (!onItemPage) {
    const tab = ALL_TABS.find((t) => t.href === pathname);
    const mp = pathname.match(/^\/(shopee|tiktok|mercadolivre)\//)?.[1];
    if (tab) {
      crumbs.push({ label: mp ? `${MARKETPLACE_NAMES[mp]} · ${tab.label}` : tab.label });
    }
  }

  return crumbs;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = getBreadcrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px]">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <ChevronRight className="mx-0.5 hidden size-3.5 shrink-0 text-muted-foreground/40 sm:block" aria-hidden />
            )}
            {crumb.href && !isLast ? (
              <Link
                to={crumb.href}
                className="hidden shrink-0 text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'min-w-0 truncate font-medium text-foreground'
                    : 'hidden shrink-0 text-muted-foreground sm:block'
                }
              >
                {crumb.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
