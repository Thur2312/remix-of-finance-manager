import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy } from "react";
import { PageLoader } from "@/components/layout/PageLoader";
import { queryClient } from "@/lib/queryClient";
import { TrialGuard } from "@/components/layout/TrialGuard";


// ── Lazy loading ────────────────────────────────────────────────────────────
const LandingPage               = lazy(() => import("./pages/LandingPage"));
const Auth                      = lazy(() => import("./pages/user/Auth"));
const EsqueciSenha              = lazy(() => import("./pages/user/EsqueciSenha"));
const ResetPassword             = lazy(() => import("./pages/user/ResetPassword"));
const TermosDeUso               = lazy(() => import("./pages/TermosDeUso"));
const PoliticaDePrivacidade     = lazy(() => import("./pages/PoliticaDePrivacidade"));
const Planos                    = lazy(() => import("./pages/Planos"));
const NotFound                  = lazy(() => import("./pages/NotFound"));

const IntegrationCallback       = lazy(() => import("./pages/integrations/IntegrationCallback"));
const IntegrationsOverview      = lazy(() => import("./pages/integrations/IntegrationsOverview"));
const IntegrationManage         = lazy(() => import("./pages/integrations/IntegrationManage"));

const UnifiedDashboard          = lazy(() => import("./pages/UnifiedDashboard"));
const Gestao                    = lazy(() => import("./pages/Gestao"));

const Configuracoes             = lazy(() => import("./pages/shopee/Configuracoes"));
const Upload                    = lazy(() => import("./pages/shopee/Upload"));
const Resultados                = lazy(() => import("./pages/shopee/Resultados"));
const ResultadosVariacoes       = lazy(() => import("./pages/shopee/ResultadosVariacoes"));

const TikTokConfiguracoes       = lazy(() => import("./pages/tiktok/TikTokConfiguracoes"));
const TikTokUpload              = lazy(() => import("./pages/tiktok/TikTokUpload"));
const TikTokResultados          = lazy(() => import("./pages/tiktok/TikTokResultados"));
const TikTokVariacoes           = lazy(() => import("./pages/tiktok/TikTokVariacoes"));
const TikTokPagamentos          = lazy(() => import("./pages/tiktok/TikTokPagamentos"));
const TikTokPagamentosUpload    = lazy(() => import("./pages/tiktok/TikTokPagamentosUpload"));

const MercadoLivreResultados    = lazy(() => import("@/pages/mercadolivre/resultados"));
const MercadoLivreVariacoes     = lazy(() => import("@/pages/mercadolivre/variacoes"));
const MercadoLivrePagamentos    = lazy(() => import("@/pages/mercadolivre/pagamentos"));
const MercadoLivreConfiguracoes = lazy(() => import("@/pages/mercadolivre/configuracoes"));

const CalculadoraPrecificacao   = lazy(() => import("./pages/CalculadoraPrecificacao"));
const CadastroCustos            = lazy(() => import("./pages/precificacao/CadastroCustos"));
const FluxoCaixaDashboard       = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaDashboard"));
const FluxoCaixaLancamentos     = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaLancamentos"));
const FluxoCaixaCategorias      = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaCategorias"));
const FluxoCaixaImportacao      = lazy(() => import("./pages/fluxo-caixa/FluxoCaixaImportacao"));
const AssistenteAnuncio         = lazy(() => import("./pages/AssistenteAnuncio"));
const DRE                       = lazy(() => import("./pages/DRE"));
const Perfil                    = lazy(() => import("./pages/Perfil"));

// ── Helper: rota protegida com ErrorBoundary isolado ─────────────────────────
const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <ErrorBoundary>
      <TrialGuard>
        {children}
      </TrialGuard>
    </ErrorBoundary>
  </ProtectedRoute>
);

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
              <Route path="/planos" element={<Planos />} />
              <Route path="/user/auth/planos" element={<Planos />} />

              {/* ── Callbacks OAuth ────────────────────────────────────── */}
              <Route path="/callback" element={<IntegrationCallback />} />
              <Route path="/callback/mercadolivre" element={<IntegrationCallback />} />
              <Route path="/integrations/callback/:provider" element={<IntegrationCallback />} />

              {/* ── Dashboard unificado ────────────────────────────────── */}
              <Route path="/dashboard" element={<Protected><UnifiedDashboard /></Protected>} />
              <Route path="/gestao"    element={<Protected><Gestao /></Protected>} />

              {/* ── Mercado Livre ──────────────────────────────────────── */}
              <Route path="/mercadolivre/resultados"    element={<Protected><MercadoLivreResultados /></Protected>} />
              <Route path="/mercadolivre/variacoes"     element={<Protected><MercadoLivreVariacoes /></Protected>} />
              <Route path="/mercadolivre/pagamentos"    element={<Protected><MercadoLivrePagamentos /></Protected>} />
              <Route path="/mercadolivre/configuracoes" element={<Protected><MercadoLivreConfiguracoes /></Protected>} />

              {/* ── Shopee ─────────────────────────────────────────────── */}
              <Route path="/shopee/dashboard"     element={<Protected><Navigate to="/gestao" replace /></Protected>} />
              <Route path="/shopee/configuracoes" element={<Protected><Configuracoes /></Protected>} />
              <Route path="/shopee/upload"        element={<Protected><Upload /></Protected>} />
              <Route path="/shopee/resultados"    element={<Protected><Resultados /></Protected>} />
              <Route path="/shopee/variacoes"     element={<Protected><ResultadosVariacoes /></Protected>} />

              {/* ── TikTok ─────────────────────────────────────────────── */}
              <Route path="/tiktok/dashboard"         element={<Protected><Navigate to="/gestao" replace /></Protected>} />
              <Route path="/tiktok/configuracoes"     element={<Protected><TikTokConfiguracoes /></Protected>} />
              <Route path="/tiktok/upload"            element={<Protected><TikTokUpload /></Protected>} />
              <Route path="/tiktok/resultados"        element={<Protected><TikTokResultados /></Protected>} />
              <Route path="/tiktok/variacoes"         element={<Protected><TikTokVariacoes /></Protected>} />
              <Route path="/tiktok/pagamentos"        element={<Protected><TikTokPagamentos /></Protected>} />
              <Route path="/tiktok/pagamentos/upload" element={<Protected><TikTokPagamentosUpload /></Protected>} />

              {/* ── Demais rotas protegidas ────────────────────────────── */}
              <Route path="/calculadora"              element={<Protected><CalculadoraPrecificacao /></Protected>} />
              <Route path="/precificacao/custos"      element={<Protected><CadastroCustos /></Protected>} />
              <Route path="/fluxo-caixa"              element={<Protected><FluxoCaixaDashboard /></Protected>} />
              <Route path="/fluxo-caixa/lancamentos"  element={<Protected><FluxoCaixaLancamentos /></Protected>} />
              <Route path="/fluxo-caixa/categorias"   element={<Protected><FluxoCaixaCategorias /></Protected>} />
              <Route path="/fluxo-caixa/importacao"   element={<Protected><FluxoCaixaImportacao /></Protected>} />
              <Route path="/assistente-anuncio"       element={<Protected><AssistenteAnuncio /></Protected>} />
              <Route path="/dre"                      element={<Protected><DRE /></Protected>} />
              <Route path="/perfil"                   element={<Protected><Perfil /></Protected>} />
              <Route path="/integrations"             element={<Protected><IntegrationsOverview /></Protected>} />
              <Route path="/integrations/:provider"   element={<Protected><IntegrationManage /></Protected>} />

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