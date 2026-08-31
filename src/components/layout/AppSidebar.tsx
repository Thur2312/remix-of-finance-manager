import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, LogOut, ShieldCheck, CircleUser, type LucideIcon } from 'lucide-react';
import { useSaleEventsUnseenCount } from '@/hooks/useSaleEvents';
import logo from '@/assets/logo-new.svg';
import { useNavigate } from 'react-router-dom';
import { PlanCard } from '@/components/PlanCard';
import { sidebarGroups, adminItem, contaItems, sectionRoutes, type NavItem } from './navModel';

// Marca só-ícone pro modo colapsado — as 3 formas do símbolo do logo,
// extraídas do SVG do wordmark. Assim a sidebar estreita mostra um ícone
// nítido em vez de um recorte espremido do logo inteiro.
function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="-20 100 760 1160" fill="currentColor" className={className} aria-hidden="true">
      <path d="M 54.4375 462.796875 L 482.953125 115.503906 C 544.066406 66.308594 633.492188 75.253906 682.683594 136.371094 C 731.867188 197.472656 722.1875 286.917969 661.074219 336.101562 L 232.566406 682.648438 C 188.59375 718.417969 164.746094 770.585938 163.261719 822.757812 L 33.589844 662.519531 L 32.835938 661.773438 C -16.351562 601.414062 -6.660156 511.972656 54.445312 462.785156 Z" />
      <path d="M 463.570312 968.089844 C 523.929688 918.894531 613.363281 928.585938 662.546875 989.691406 C 711.738281 1050.058594 702.792969 1139.492188 641.679688 1188.675781 C 580.566406 1237.859375 491.144531 1228.925781 441.949219 1167.808594 C 392.765625 1106.695312 402.445312 1017.273438 463.5625 968.078125 Z" />
      <path d="M 482.953125 538.070312 C 544.066406 488.128906 632.746094 497.820312 681.9375 558.933594 C 731.867188 619.304688 722.175781 708.734375 661.074219 757.921875 L 438.992188 938.277344 C 394.277344 974.050781 371.171875 1026.964844 371.917969 1080.617188 L 240.019531 917.402344 L 239.261719 917.402344 C 190.078125 856.289062 199.769531 766.855469 260.136719 717.671875 L 260.882812 717.671875 Z" />
    </svg>
  );
}

// Estado aberto/fechado dos grupos, lembrado entre sessões. Ausência da chave =
// grupo aberto (default); só guardamos quando o usuário fecha explicitamente.
const GROUPS_STORAGE_KEY = 'sidebar-groups-collapsed';

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut, profile } = useAuth();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();
  const { data: unseenSalesCount } = useSaleEventsUnseenCount();

  const handleSignOut = useCallback(async () => {
    localStorage.removeItem('rememberedEmail');
    await signOut();
    navigate('/user/auth', { replace: true });
  }, [signOut, navigate]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(loadCollapsed);

  const setGroupOpen = useCallback((label: string, open: boolean) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !open };
      try { localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const isItemActive = (url: string) => {
    // /integrations/:provider é dinâmica (shopee/tiktok/mercadolivre) — uma
    // lista fixa de strings sempre ficava desatualizada (faltava
    // mercadolivre, e "/integrations/callback" sem :provider nunca batia
    // com a rota real "/integrations/callback/:provider").
    if (url === '/integrations') return location.pathname.startsWith('/integrations');
    const routes = sectionRoutes[url];
    if (routes) return routes.includes(location.pathname);
    return location.pathname === url;
  };

  // Ao navegar, abre o grupo do item ativo (pra nunca perder de vista onde
  // você está); não fecha os outros.
  useEffect(() => {
    const allGroups = [...sidebarGroups, { label: 'Conta', items: contaItems }, { label: 'Admin', items: [adminItem] }];
    const activeGroup = allGroups.find((g) => g.items.some((i) => isItemActive(i.url)));
    if (activeGroup && collapsedGroups[activeGroup.label]) {
      setGroupOpen(activeGroup.label, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const renderItem = (item: NavItem) => {
    const active = isItemActive(item.url);
    const badge = item.url === '/vendas' && unseenSalesCount
      ? (unseenSalesCount > 9 ? '9+' : String(unseenSalesCount))
      : item.badge;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={
            active
              ? 'h-9 rounded-lg bg-sidebar-accent text-[13px] text-sidebar-accent-foreground font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:!size-[18px] [&_svg]:text-sidebar-primary'
              : 'h-9 rounded-lg text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground [&>svg]:!size-[18px]'
          }
        >
          <NavLink to={item.url} className="flex items-center gap-3">
            <item.icon className="shrink-0" strokeWidth={2} />
            <span>{item.title}</span>
            {badge && (
              <span className="ml-auto text-[9px] font-bold tracking-wide text-warning bg-warning/15 px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Grupo recolhível: o rótulo vira botão (chevron gira). Estado lembrado no
  // localStorage. No modo ícone (sidebar colapsada) o grupo fica sempre aberto
  // e o rótulo some.
  const renderGroup = (label: string, items: NavItem[], GroupIcon: LucideIcon) => (
    <Collapsible
      key={label}
      open={collapsed ? true : !collapsedGroups[label]}
      onOpenChange={(o) => setGroupOpen(label, o)}
      className="group/nav"
    >
      <SidebarGroup className="py-0">
        {!collapsed && (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group/label flex w-full items-center gap-2 px-2.5 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/55 transition-colors hover:text-sidebar-foreground"
            >
              <GroupIcon className="h-[15px] w-[15px] shrink-0 text-sidebar-foreground/40 transition-colors group-hover/label:text-sidebar-primary" strokeWidth={2.5} />
              <span>{label}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 group-data-[state=open]/nav:rotate-90" />
            </button>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-inherit p-0">
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
          {collapsed ? (
            <Logomark className="h-[26px] w-[26px] text-sidebar-primary" />
          ) : (
            <img src={logo} alt="Seller Finance" className="h-10 w-auto object-contain" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {sidebarGroups.map((group) => renderGroup(group.label, group.items, group.icon))}

        {profile?.is_admin && renderGroup('Admin', [adminItem], ShieldCheck)}

        {renderGroup('Conta', contaItems, CircleUser)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              title="Sair"
              onClick={handleSignOut}
              className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2">
            <PlanCard />
            <div className="flex items-center gap-2.5 px-1">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-sidebar-border">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                  {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                </span>
                <span className="truncate text-[11px] text-sidebar-foreground/55">
                  {user?.email}
                </span>
              </div>
              <button
                type="button"
                title="Sair"
                onClick={handleSignOut}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sidebar-foreground/55 transition-colors hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut className="h-[17px] w-[17px]" />
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}