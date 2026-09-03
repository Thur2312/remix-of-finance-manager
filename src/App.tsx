import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";
import { PageLoader } from "@/components/layout/PageLoader";
import { queryClient } from "@/lib/queryClient";
import { InternalLayout, InternalLayoutNoGuard } from "@/components/layout/InternalLayout";


// ── Lazy loading ────────────────────────────────────────────────────────────
const LandingPage               = lazy(() => import("./pages/LandingPage"));
const Auth                      = lazy(() => import("./pages/user/Auth"));
const EsqueciSenha              = lazy(() => import("./pages/user/EsqueciSenha"));
const ResetPassword             = lazy(() => import("./pages/user/ResetPassword"));
const TermosDeUso               = lazy(() => import("./pages/TermosDeUso"));
const PoliticaDePrivacidade     = lazy(() => import("./pages/PoliticaDePrivacidade"));
const Planos                    = lazy(() => import("./pages/Planos"));
const SetupPayment              = lazy(() => import("./pages/SetupPayments"));
const NotFound                  = lazy(() => import("./pages/NotFound"));

const IntegrationCallback       = lazy(() => import("./pages/integrations/IntegrationCallback"));
const IntegrationsOverview      = lazy(() => import("./pages/integrations/IntegrationsOverview"));
const IntegrationManage         = lazy(() => import("./pages/integrations/IntegrationManage"));

const UnifiedDashboard          = lazy(() => import("./pages/UnifiedDashboard"));
const Produtos                  = lazy(() => import("./pages/Produtos"));
const MetaDoMes                 = lazy(() => import("./pages/MetaDoMes"));
const PrevisaoCaixa             = lazy(() => import("./pages/PrevisaoCaixa"));
const Reposicao                 = lazy(() => import("./pages/Reposicao"));
const GestaoShell               = lazy(() => import("./pages/gestao/GestaoShell"));
const Vendas                    = lazy(() => import("./pages/Vendas"));

const CalculadoraPrecificacao   = lazy(() => import("./pages/CalculadoraPrecificacao"));
const CadastroCustos            = lazy(() => import("./pages/precificacao/CadastroCustos"));
const FluxoCaixaDashboard       = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaDashboard"));
const FluxoCaixaLancamentos     = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaLancamentos"));
const FluxoCaixaCategorias      = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaCategorias"));
const AssistenteAnuncio         = lazy(() => import("./pages/AssistenteAnuncio"));
const Simulador                 = lazy(() => import("./pages/Simulador"));
const DRE                       = lazy(() => import("./pages/DRE"));
const Taxas                     = lazy(() => import("./pages/Taxas"));
const Perfil                    = lazy(() => import("./pages/Perfil"));
const CompaniesPage             = lazy(() => import("./pages/user/CompaniesPage"));
const NotificacoesAdmin         = lazy(() => import("./pages/admin/Notificacoes"));

// Rotas antigas por marketplace → nova casca /gestao/:marketplace/:view.
const LEGACY_GESTAO_REDIRECTS: [string, string][] = [
  ['/shopee/dashboard', '/gestao/shopee/dashboard'],
  ['/shopee/resultados', '/gestao/shopee/resultados'],
  ['/shopee/variacoes', '/gestao/shopee/variacoes'],
  ['/shopee/upload', '/gestao/shopee/upload'],
  ['/shopee/configuracoes', '/gestao/shopee/configuracoes'],
  ['/tiktok/dashboard', '/gestao/tiktok/dashboard'],
  ['/tiktok/resultados', '/gestao/tiktok/resultados'],
  ['/tiktok/variacoes', '/gestao/tiktok/variacoes'],
  ['/tiktok/upload', '/gestao/tiktok/upload'],
  ['/tiktok/pagamentos', '/gestao/tiktok/pagamentos'],
  ['/tiktok/pagamentos/upload', '/gestao/tiktok/pagamentos-upload'],
  ['/tiktok/configuracoes', '/gestao/tiktok/configuracoes'],
  ['/mercadolivre/resultados', '/gestao/mercadolivre/resultados'],
  ['/mercadolivre/variacoes', '/gestao/mercadolivre/variacoes'],
  ['/mercadolivre/pagamentos', '/gestao/mercadolivre/pagamentos'],
  ['/mercadolivre/configuracoes', '/gestao/mercadolivre/configuracoes'],
];

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Rotas públicas ─────────────────────────────────────── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/user/auth" element={<Auth />} />
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />
              <Route path="/user/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/user/reset-password" element={<ResetPassword />} />

              {/* ── Callbacks OAuth ────────────────────────────────────── */}
              <Route path="/callback" element={<IntegrationCallback />} />
              <Route path="/callback/mercadolivre" element={<IntegrationCallback />} />
              <Route path="/integrations/callback/:provider" element={<IntegrationCallback />} />

              {/* ── Área interna — shell persistente (sidebar/topbar montam
                 uma vez só; ver InternalLayout.tsx). Só o conteúdo de cada
                 rota abaixo troca ao navegar. ── */}
              <Route element={<InternalLayout />}>
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/dashboard" element={<UnifiedDashboard />} />
                <Route path="/meta" element={<MetaDoMes />} />
                <Route path="/previsao" element={<PrevisaoCaixa />} />
                <Route path="/reposicao" element={<Reposicao />} />
                <Route path="/vendas" element={<Vendas />} />

                {/* Gestão: casca única marketplace × view */}
                <Route path="/gestao" element={<Navigate to="/gestao/shopee/dashboard" replace />} />
                <Route path="/gestao/:marketplace" element={<GestaoShell />} />
                <Route path="/gestao/:marketplace/:view" element={<GestaoShell />} />
                {/* Redirects de bookmark das rotas antigas por marketplace */}
                {LEGACY_GESTAO_REDIRECTS.map(([from, to]) => (
                  <Route key={from} path={from} element={<Navigate to={to} replace />} />
                ))}

                <Route path="/calculadora" element={<CalculadoraPrecificacao />} />
                <Route path="/simulador" element={<Simulador />} />
                <Route path="/precificacao/custos" element={<CadastroCustos />} />
                <Route path="/fluxo-caixa" element={<FluxoCaixaDashboard />} />
                <Route path="/fluxo-caixa/lancamentos" element={<FluxoCaixaLancamentos />} />
                <Route path="/fluxo-caixa/categorias" element={<FluxoCaixaCategorias />} />
                <Route path="/assistente-anuncio" element={<AssistenteAnuncio />} />
                <Route path="/dre" element={<DRE />} />
                <Route path="/taxas" element={<Taxas />} />
                <Route path="/empresas" element={<CompaniesPage />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/integrations" element={<IntegrationsOverview />} />
                <Route path="/integrations/manage/:connectionId" element={<IntegrationManage />} />
                <Route path="/admin/notificacoes" element={<NotificacoesAdmin />} />
              </Route>

              {/* ── Mesma casca, sem TrialGuard — setup pós-cadastro e a
                 própria tela de Planos (não pode ficar bloqueada pelo
                 paywall que ela existe pra resolver). ── */}
              <Route element={<InternalLayoutNoGuard />}>
                <Route path="/setup-payment" element={<SetupPayment />} />
                <Route path="/planos" element={<Planos />} />
                <Route path="/user/auth/planos" element={<Planos />} />
              </Route>

              {/* ── Catch-all ──────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;