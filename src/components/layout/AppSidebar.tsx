import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ChevronUp, LogOut, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins, Wallet, Plug, Sun, Moon } from 'lucide-react';
import logo from '@/assets/logo-new.svg';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const sidebarItems = [
  { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: HandCoins },
  { title: 'Gestão Shopee', url: '/shopee/dashboard', icon: TrendingUp },
  { title: 'Gestão TikTok', url: '/tiktok/dashboard', icon: TrendingUp },
  { title: 'Precificação', url: '/calculadora', icon: Calculator },
  { title: 'Custos Fixos', url: '/precificacao/custos', icon: Receipt },
  { title: 'Assistente', url: '/assistente-anuncio', icon: Sparkles },
  { title: 'DRE', url: '/dre', icon: BarChart3 },
  { title: 'Integrações', url: '/integrations', icon: Plug },
  { title: 'Planos', url: '/planos', icon: Wallet },
];

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
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();

  const isItemActive = (url: string) => {
    const routes = sectionRoutes[url];
    if (routes) return routes.includes(location.pathname);
    return location.pathname === url;
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Sidebar
      collapsible="icon"
      style={{
        background: 'linear-gradient(180deg, #0A1628 0%, #0d1f3c 100%)',
        borderRight: '1px solid rgba(49, 142, 241, 0.15)',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Header */}
      <SidebarHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-center py-1 px-3">
          <img
            src={logo}
            alt="Seller Finance"
            className={collapsed ? 'h-8 w-auto object-contain' : 'h-14 w-auto object-contain'}
          />
        </div>
      </SidebarHeader>

      {/* Nav Items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2 pt-2">
              {sidebarItems.map((item) => {
                const active = isItemActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      style={{
                        backgroundColor: active ? 'rgba(49, 142, 241, 0.15)' : 'transparent',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        transition: 'all 0.2s ease',
                      }}
                      className="hover:!bg-white/10 group"
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName=""
                      >
                        <div
                          style={{
                            color: active ? '#318EF1' : 'rgba(255,255,255,0.5)',
                            transition: 'color 0.2s ease',
                          }}
                          className="group-hover:!text-white"
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <span
                          style={{
                            color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            fontWeight: active ? 600 : 400,
                            fontSize: '14px',
                            transition: 'color 0.2s ease',
                          }}
                          className="group-hover:!text-white"
                        >
                          {item.title}
                        </span>
                        {active && (
                          <div
                            style={{
                              marginLeft: 'auto',
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              backgroundColor: '#318EF1',
                            }}
                          />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>
        {/* Theme Toggle */}
        {!collapsed && (
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'all 0.2s ease',
            }}
            className="hover:!bg-white/10 hover:!text-white"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>
        )}

        {/* User Menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  className="hover:!bg-white/10"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                    <AvatarFallback
                      style={{ backgroundColor: '#318EF1', color: 'white', fontSize: '12px', fontWeight: 600 }}
                    >
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-1 flex-col text-left text-sm">
                      <span className="truncate font-medium" style={{ color: 'white', fontSize: '13px' }}>
                        {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                      </span>
                      <span className="truncate" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                        {user?.email}
                      </span>
                    </div>
                  )}
                  <ChevronUp className="ml-auto h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
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