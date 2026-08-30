import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ChevronUp, ChevronRight, LogOut, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins, Wallet, Plug, LayoutDashboard, Shield, Zap, type LucideIcon } from 'lucide-react';
import { useSaleEventsUnseenCount } from '@/hooks/useSaleEvents';
import logo from '@/assets/logo-new.svg';
import { useNavigate } from 'react-router-dom';
import { PlanBadge } from '@/components/PlanBadge';

interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

// Agrupado por seção em vez de lista plana — quem procura "algo de
// planejamento" olha direto no terceiro grupo em vez de ler os 9 rótulos.
// Planos fica fora dos grupos, separado por uma linha, perto da conta.
const sidebarGroups: SidebarGroup[] = [
  {
    label: 'Visão Geral',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Dia a Dia',
    items: [
      { title: 'Gestão', url: '/gestao', icon: TrendingUp },
      { title: 'Vendas', url: '/vendas', icon: Zap },
      { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: HandCoins },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Precificação', url: '/calculadora', icon: Calculator },
      { title: 'Custos Fixos', url: '/precificacao/custos', icon: Receipt },
      { title: 'DRE', url: '/dre', icon: BarChart3 },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { title: 'Assistente', url: '/assistente-anuncio', icon: Sparkles, badge: 'IA' },
      { title: 'Integrações', url: '/integrations', icon: Plug },
    ],
  },
];

const adminItem: SidebarItem = { title: 'Avisos', url: '/admin/notificacoes', icon: Shield };

// Grupo "Conta" no rodapé da navegação (antes ficava: Planos solto + Perfil
// escondido no dropdown do rodapé). Configurações ainda não tem rota própria.
const contaItems: SidebarItem[] = [
  { title: 'Planos', url: '/planos', icon: Wallet },
  { title: 'Perfil', url: '/perfil', icon: User },
];

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

// Rotas que pertencem a cada seção (para highlight ativo)
const sectionRoutes: Record<string, string[]> = {
  '/dashboard': ['/dashboard'],
  '/gestao': [
    '/gestao',
    '/shopee/dashboard', '/shopee/resultados', '/shopee/variacoes', '/shopee/upload', '/shopee/configuracoes',
    '/tiktok/dashboard', '/tiktok/resultados', '/tiktok/variacoes', '/tiktok/upload', '/tiktok/pagamentos', '/tiktok/pagamentos/upload', '/tiktok/configuracoes',
    // Faltavam as rotas do Mercado Livre — o item "Gestão" nunca ficava
    // destacado como ativo em nenhuma dessas páginas.
    '/mercadolivre/resultados', '/mercadolivre/variacoes', '/mercadolivre/pagamentos', '/mercadolivre/configuracoes',
  ],
  '/fluxo-caixa': ['/fluxo-caixa', '/fluxo-caixa/lancamentos', '/fluxo-caixa/categorias'],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut, profile } = useAuth();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();
  const { data: unseenSalesCount } = useSaleEventsUnseenCount();

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

  const renderItem = (item: SidebarItem) => {
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
              ? 'rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:text-sidebar-primary'
              : 'rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
          }
        >
          <NavLink to={item.url} className="flex items-center gap-3">
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
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
  const renderGroup = (label: string, items: SidebarItem[]) => (
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
              className="flex w-full items-center gap-1.5 px-2.5 pt-3.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]/nav:rotate-90" />
              {label}
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
        <div className="flex h-16 items-center justify-center px-3">
          <img
            src={logo}
            alt="Seller Finance"
            className={collapsed ? 'h-6 w-auto object-contain' : 'h-7 w-auto object-contain'}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {sidebarGroups.map((group) => renderGroup(group.label, group.items))}

        {profile?.is_admin && renderGroup('Admin', [adminItem])}

        <div className="mx-2.5 my-3 h-px bg-sidebar-border" />

        {renderGroup('Conta', contaItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-1 pb-1 pt-2">
            <PlanBadge />
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="rounded-lg transition-colors data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-1 flex-col text-left text-sm">
                      <span className="truncate font-medium">
                        {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        {user?.email}
                      </span>
                    </div>
                  )}
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem disabled className="flex flex-col items-start">
                  <span className="font-medium">{user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    localStorage.removeItem('rememberedEmail');
                    await signOut();
                    navigate('/user/auth', { replace: true });
                  }}
                  className="flex items-center cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}