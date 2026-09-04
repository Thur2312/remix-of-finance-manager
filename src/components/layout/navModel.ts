import {
  User, TrendingUp, Calculator, Receipt, Sparkles, BarChart3, HandCoins, Wallet,
  Plug, LayoutDashboard, Shield, Zap, Gauge, CalendarDays, Landmark, Wrench,
  FlaskConical, Target, CalendarClock, PackageSearch, Percent, Boxes, Building2,
  ShieldCheck, type LucideIcon,
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
    items: [
      { title: 'Produtos', url: '/produtos', icon: Boxes, badge: 'Novo' },
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Meta do mês', url: '/meta', icon: Target },
      { title: 'Previsão de caixa', url: '/previsao', icon: CalendarClock },
      { title: 'Reposição de estoque', url: '/reposicao', icon: PackageSearch, badge: 'Novo' },
    ],
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
      { title: 'Empresas', url: '/empresas', icon: Building2, badge: 'Novo' },
      { title: 'Precificação', url: '/calculadora', icon: Calculator },
      { title: 'Custos Fixos', url: '/precificacao/custos', icon: Receipt },
      { title: 'Detalhamento de taxas', url: '/taxas', icon: Percent },
      { title: 'Auditoria de repasse', url: '/repasses', icon: ShieldCheck, badge: 'Novo' },
      { title: 'DRE', url: '/dre', icon: BarChart3 },
    ],
  },
  {
    label: 'Ferramentas',
    icon: Wrench,
    items: [
      { title: 'Simulador', url: '/simulador', icon: FlaskConical },
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

// Subpáginas exatas que pertencem a um item da nav (highlight ativo na
// sidebar + "pai" no breadcrumb). `/gestao` é tratado por prefixo
// (startsWith) porque virou `/gestao/:marketplace/:view` — ver isSectionActive.
export const sectionRoutes: Record<string, string[]> = {
  '/produtos': ['/produtos'],
  '/dashboard': ['/dashboard'],
  '/empresas': ['/empresas'],
  '/taxas': ['/taxas'],
  '/previsao': ['/previsao'],
  '/reposicao': ['/reposicao'],
  '/fluxo-caixa': ['/fluxo-caixa', '/fluxo-caixa/lancamentos', '/fluxo-caixa/categorias'],
};

// Itens da nav cujo "estar ativo" é por prefixo de rota, não por lista fixa.
export const PREFIX_MATCH_ITEMS = ['/gestao', '/integrations'];

export function isSectionActive(itemUrl: string, pathname: string): boolean {
  if (PREFIX_MATCH_ITEMS.includes(itemUrl)) return pathname.startsWith(itemUrl);
  if (itemUrl === pathname) return true;
  return sectionRoutes[itemUrl]?.includes(pathname) ?? false;
}
