import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import { User, ChevronUp, LogOut, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins,Wallet, Plug, House } from 'lucide-react';
import logo from '@/assets/logo-new.svg';



const sidebarItems = [  

  { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: HandCoins },
  { title: 'Gestão Shopee', url: '/shopee/dashboard', icon: TrendingUp },
  { title: 'Gestão TikTok', url: '/tiktok/dashboard', icon: TrendingUp },
  { title: 'Precificação', url: '/calculadora', icon: Calculator },
  { title: 'Custos Fixos', url: '/precificacao/custos', icon: Receipt },
  { title: 'Assistente', url: '/assistente-anuncio', icon: Sparkles },
  { title: 'DRE', url: '/dre', icon: BarChart3 },
  { title: 'Integrações', url: '/integrations', icon: Plug },
  { title: 'Planos', url: '/planos', icon: Wallet}
];

// Routes that belong to each section for active highlighting
const sectionRoutes: Record<string, string[]> = {
  '/fluxo-caixa': ['/fluxo-caixa', '/fluxo-caixa/lancamentos', '/fluxo-caixa/categorias'],
  '/shopee/dashboard': ['/shopee/dashboard', '/shopee/resultados', '/shopee/variacoes', '/shopee/upload', '/shopee/pagamentos', '/shopee/pagamentos/upload', '/shopee/configuracoes'],
  '/tiktok/dashboard': ['/tiktok/dashboard', '/tiktok/resultados', '/tiktok/variacoes', '/tiktok/upload', '/tiktok/pagamentos', '/tiktok/pagamentos/upload', '/tiktok/configuracoes'],
  '/integrations': ['/integrations', '/integrations/shopee', '/integrations/tiktok', '/integrations/callback'],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut, profile } = useAuth();
  const collapsed = state === 'collapsed';

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const isItemActive = (url: string) => {
    const routes = sectionRoutes[url];
    if (routes) {
      return routes.includes(location.pathname);
    }
    return location.pathname === url;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-inherit">
        <div className="flex items-center justify-center py-0 px-[12px]">
          <img
            src={logo}
            alt="Seller Finance"
            className={collapsed ? 'h-8 w-auto object-contain' : 'h-14 w-auto object-contain'}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isItemActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-muted text-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5" strokeWidth={2.5} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8">
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
                      <span className="truncate text-xs text-muted-foreground">
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
              onClick={async () => {
                localStorage.removeItem('rememberedEmail');
                await signOut();
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
