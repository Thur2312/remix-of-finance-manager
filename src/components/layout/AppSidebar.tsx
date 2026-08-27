import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ChevronUp, LogOut, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins, Wallet, Plug, LayoutDashboard, Moon, Sun, Shield, Zap, type LucideIcon } from 'lucide-react';
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

const planosItem: SidebarItem = { title: 'Planos', url: '/planos', icon: Wallet };
const adminItem: SidebarItem = { title: 'Avisos', url: '/admin/notificacoes', icon: Shield };

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
  const { theme, setTheme } = useTheme();

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();
  const { data: unseenSalesCount } = useSaleEventsUnseenCount();

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-inherit">
        <div className="flex items-center justify-center px-3 py-4">
          <img
            src={logo}
            alt="Seller Finance"
            className={collapsed ? 'h-8 w-auto object-contain' : 'h-12 w-auto object-contain'}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-0">
            {!collapsed && (
              <div className="px-2.5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{group.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {profile?.is_admin && (
          <>
            <div className="mx-2.5 my-3 h-px bg-sidebar-border" />
            <SidebarGroup className="py-0">
              {!collapsed && (
                <div className="px-2.5 pt-0 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Admin
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">{renderItem(adminItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <div className="mx-2.5 my-3 h-px bg-sidebar-border" />

        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>{renderItem(planosItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
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