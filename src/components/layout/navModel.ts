import {
  User, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins, Wallet,
  Plug, LayoutDashboard, Shield, Zap, Gauge, CalendarDays, Landmark, Wrench,
  type LucideIcon,
} from 'lucide-react';

// Modelo de navegação da área interna — fonte única, consumida pela
// AppSidebar (render dos grupos) e pelo Breadcrumbs (deriva "Grupo › Item").
// Antes isto morava dentro de AppSidebar.tsx e não dava pra reaproveitar.

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Agrupado por seção em vez de lista plana — quem procura "algo de
// planejamento" olha direto no terceiro grupo em vez de ler os 9 rótulos.
export const sidebarGroups: NavGroup[] = [
  {
    label: 'Visão Geral',
    icon: Gauge,
    items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Dia a Dia',
    icon: CalendarDays,
    items: [
      { title: 'Gestão', url: '/gestao', icon: TrendingUp },
      { title: 'Vendas', url: '/vendas', icon: Zap },
      { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: HandCoins },
    ],
  },
  {
    label: 'Financeiro',
    icon: Landmark,
    items: [
      { title: 'Precificação', url: '/calculadora', icon: Calculator },
      { title: 'Custos Fixos', url: '/precificacao/custos', icon: Receipt },
      { title: 'DRE', url: '/dre', icon: BarChart3 },
    ],
  },
  {
    label: 'Ferramentas',
    icon: Wrench,
    items: [
      { title: 'Assistente', url: '/assistente-anuncio', icon: Sparkles, badge: 'IA' },
      { title: 'Integrações', url: '/integrations', icon: Plug },
    ],
  },
];

export const adminItem: NavItem = { title: 'Avisos', url: '/admin/notificacoes', icon: Shield };

// Grupo "Conta" no rodapé da navegação.
export const contaItems: NavItem[] = [
  { title: 'Planos', url: '/planos', icon: Wallet },
  { title: 'Perfil', url: '/perfil', icon: User },
];

// Rotas que pertencem a cada seção (para highlight ativo na sidebar e para o
// breadcrumb saber qual item da nav é o "pai" de uma subpágina).
export const sectionRoutes: Record<string, string[]> = {
  '/dashboard': ['/dashboard'],
  '/gestao': [
    '/gestao',
    '/shopee/dashboard', '/shopee/resultados', '/shopee/variacoes', '/shopee/upload', '/shopee/configuracoes',
    '/tiktok/dashboard', '/tiktok/resultados', '/tiktok/variacoes', '/tiktok/upload', '/tiktok/pagamentos', '/tiktok/pagamentos/upload', '/tiktok/configuracoes',
    '/mercadolivre/resultados', '/mercadolivre/variacoes', '/mercadolivre/pagamentos', '/mercadolivre/configuracoes',
  ],
  '/fluxo-caixa': ['/fluxo-caixa', '/fluxo-caixa/lancamentos', '/fluxo-caixa/categorias'],
};
