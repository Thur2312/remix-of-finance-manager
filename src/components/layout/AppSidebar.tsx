import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Settings, Upload, FileSpreadsheet, Package, ChevronUp, ChevronDown, LogOut, ShoppingBag, TrendingUp, Calculator, Wallet, List, Tags, Sparkles, Receipt, BarChart3, User, Home, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

// Animações (alinhadas com Landing Page)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const relatoriosItems = [{
  title: 'DRE',
  url: '/dre',
  icon: BarChart3
}];
const calculoLucroShopeeItems = [{
  title: 'Dashboard',
  url: '/dashboard',
  icon: LayoutDashboard
}, {
  title: 'Resultados Simplificados',
  url: '/resultados',
  icon: FileSpreadsheet
}, {
  title: 'Resultados com Variações',
  url: '/resultados-variacoes',
  icon: Package
}, {
  title: 'Upload de Relatório',
  url: '/upload',
  icon: Upload
}, {
  title: 'Configurações',
  url: '/configuracoes',
  icon: Settings
}];
const calculoLucroTikTokItems = [{
  title: 'Dashboard',
  url: '/tiktok/dashboard',
  icon: LayoutDashboard
}, {
  title: 'Resultados Simplificados',
  url: '/tiktok/resultados',
  icon: FileSpreadsheet
}, {
  title: 'Resultados com Variações',
  url: '/tiktok/variacoes',
  icon: Package
}, {
  title: 'Upload de Relatório',
  url: '/tiktok/upload',
  icon: Upload
}, {
  title: 'Pagamentos',
  url: '/tiktok/pagamentos',
  icon: Wallet
}, {
  title: 'Upload Pagamentos',
  url: '/tiktok/pagamentos/upload',
  icon: Upload
}, {
  title: 'Configurações',
  url: '/tiktok/configuracoes',
  icon: Settings
}];
const calculadoraItems = [{
  title: 'Calculadora',
  url: '/calculadora',
  icon: ShoppingBag
}];
const custosFixosItems = [{
  title: 'Cadastro de Custos',
  url: '/precificacao/custos',
  icon: Receipt
}];
const fluxoCaixaItems = [{
  title: 'Dashboard',
  url: '/fluxo-caixa',
  icon: LayoutDashboard
}, {
  title: 'Lançamentos',
  url: '/fluxo-caixa/lancamentos',
  icon: List
}, {
  title: 'Categorias',
  url: '/fluxo-caixa/categorias',
  icon: Tags
}];
const assistenteAnuncioItems = [{
  title: 'Criar Anúncio',
  url: '/assistente-anuncio',
  icon: Sparkles
}];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  // Check if current route belongs to each category
  const isInCalculoLucroShopee = calculoLucroShopeeItems.some(item => item.url === location.pathname);
  const isInCalculoLucroTikTok = calculoLucroTikTokItems.some(item => item.url === location.pathname);
  const isInCalculadora = calculadoraItems.some(item => item.url === location.pathname);
  const isInCustosFixos = custosFixosItems.some(item => item.url === location.pathname);
  const isInFluxoCaixa = fluxoCaixaItems.some(item => item.url === location.pathname);
  const isInAssistenteAnuncio = assistenteAnuncioItems.some(item => item.url === location.pathname);
  const isInRelatorios = relatoriosItems.some(item => item.url === location.pathname);
  const [calculoLucroShopeeOpen, setCalculoLucroShopeeOpen] = useState(isInCalculoLucroShopee);
  const [calculoLucroTikTokOpen, setCalculoLucroTikTokOpen] = useState(isInCalculoLucroTikTok);
  const [calculadoraOpen, setCalculadoraOpen] = useState(isInCalculadora);
  const [custosFixosOpen, setCustosFixosOpen] = useState(isInCustosFixos);
  const [fluxoCaixaOpen, setFluxoCaixaOpen] = useState(isInFluxoCaixa);
  const [assistenteAnuncioOpen, setAssistenteAnuncioOpen] = useState(isInAssistenteAnuncio);
  const [relatoriosOpen, setRelatoriosOpen] = useState(isInRelatorios);

  // Keep active category open when route changes
  useEffect(() => {
    if (isInCalculoLucroShopee) setCalculoLucroShopeeOpen(true);
    if (isInCalculoLucroTikTok) setCalculoLucroTikTokOpen(true);
    if (isInCalculadora) setCalculadoraOpen(true);
    if (isInCustosFixos) setCustosFixosOpen(true);
    if (isInFluxoCaixa) setFluxoCaixaOpen(true);
    if (isInAssistenteAnuncio) setAssistenteAnuncioOpen(true);
    if (isInRelatorios) setRelatoriosOpen(true);
  }, [location.pathname, isInCalculoLucroShopee, isInCalculoLucroTikTok, isInCalculadora, isInCustosFixos, isInFluxoCaixa, isInAssistenteAnuncio, isInRelatorios]);
  
  const getInitials = (name: string | null, email: string | null) => {
    if (name && name.length >= 2) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Usuário';
  const displayEmail = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || null;

  const renderMenuItems = (items: typeof calculoLucroShopeeItems) => (
    <SidebarMenu className="space-y-1">
      {items.map(item => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
            <NavLink to={item.url} className="flex items-center gap-3 py-2 hover:bg-blue-50 transition-colors" activeClassName="bg-blue-100 text-blue-700">
              <item.icon className="h-5 w-5 text-blue-600" />
              <span>{item.title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="transition-all duration-300 ease-in-out border-r border-blue-200 bg-white shadow-lg">
      <SidebarHeader className="border-b border-blue-200 bg-white/80">
        <motion.div 
          className="flex items-center justify-center gap-3 px-3 py-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className={`rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-300 transition-all duration-300 ${collapsed ? "h-8 w-8" : "h-10 w-10"}`}>
            <BarChart3 className={`text-white transition-all duration-300 ${collapsed ? "h-4 w-4" : "h-5 w-5"}`} />
          </div>
          {!collapsed && <span className="font-bold text-lg text-gray-900">Finance Manager</span>}
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div 
          className={`flex gap-2 px-3 pb-3 ${collapsed ? 'flex-col items-center' : ''}`}
          variants={stagger}
        >
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                      <Home className="h-4 w-4 text-blue-600" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Página inicial</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Ver planos</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link to="/" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Home className="h-3.5 w-3.5" />
                  Início
                </Button>
              </Link>
              <Link to="/Planos" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                  <CreditCard className="h-3.5 w-3.5" />
                  Planos
                </Button>
              </Link>
            </>
          )}
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-2">
        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(fluxoCaixaItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={fluxoCaixaOpen} onOpenChange={setFluxoCaixaOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <span>Fluxo de Caixa</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${fluxoCaixaOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(fluxoCaixaItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(calculoLucroShopeeItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={calculoLucroShopeeOpen} onOpenChange={setCalculoLucroShopeeOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Gestão Shopee</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${calculoLucroShopeeOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(calculoLucroShopeeItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(calculoLucroTikTokItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={calculoLucroTikTokOpen} onOpenChange={setCalculoLucroTikTokOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Gestão TikTok Shop</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${calculoLucroTikTokOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(calculoLucroTikTokItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(calculadoraItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={calculadoraOpen} onOpenChange={setCalculadoraOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span>Precificação</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${calculadoraOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(calculadoraItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(custosFixosItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={custosFixosOpen} onOpenChange={setCustosFixosOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span>Custos Fixos</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${custosFixosOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(custosFixosItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

                <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(assistenteAnuncioItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={assistenteAnuncioOpen} onOpenChange={setAssistenteAnuncioOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>Assistente de Anúncio</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${assistenteAnuncioOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(assistenteAnuncioItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>

        <SidebarGroup>
          {collapsed ? (
            <SidebarGroupContent>
              {renderMenuItems(relatoriosItems)}
            </SidebarGroupContent>
          ) : (
            <Collapsible open={relatoriosOpen} onOpenChange={setRelatoriosOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-md transition-colors">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Relatórios</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ease-out ${relatoriosOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent className="mt-1">
                  {renderMenuItems(relatoriosItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-blue-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-blue-50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {getInitials(displayName, displayEmail)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && <div className="flex flex-1 flex-col text-left text-sm">
                      <span className="truncate font-medium text-gray-900">
                        {displayName}
                      </span>
                      <span className="truncate text-xs text-gray-600">
                        {displayEmail}
                      </span>
                    </div>}
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem disabled className="flex flex-col items-start">
                  <span className="font-medium">{displayEmail}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-red-500 cursor-pointer">
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