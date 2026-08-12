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
const AssistenteAnuncio         = lazy(() => import("./pages/AssistenteAnuncio"));
const DRE                       = lazy(() => import("./pages/DRE"));
const Perfil                    = lazy(() => import("./pages/Perfil"));

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
                <Route path="/dashboard" element={<UnifiedDashboard />} />
                <Route path="/gestao" element={<Gestao />} />

                <Route path="/mercadolivre/resultados" element={<MercadoLivreResultados />} />
                <Route path="/mercadolivre/variacoes" element={<MercadoLivreVariacoes />} />
                <Route path="/mercadolivre/pagamentos" element={<MercadoLivrePagamentos />} />
                <Route path="/mercadolivre/configuracoes" element={<MercadoLivreConfiguracoes />} />

                <Route path="/shopee/dashboard" element={<Navigate to="/gestao" replace />} />
                <Route path="/shopee/configuracoes" element={<Configuracoes />} />
                <Route path="/shopee/upload" element={<Upload />} />
                <Route path="/shopee/resultados" element={<Resultados />} />
                <Route path="/shopee/variacoes" element={<ResultadosVariacoes />} />

                <Route path="/tiktok/dashboard" element={<Navigate to="/gestao" replace />} />
                <Route path="/tiktok/configuracoes" element={<TikTokConfiguracoes />} />
                <Route path="/tiktok/upload" element={<TikTokUpload />} />
                <Route path="/tiktok/resultados" element={<TikTokResultados />} />
                <Route path="/tiktok/variacoes" element={<TikTokVariacoes />} />
                <Route path="/tiktok/pagamentos" element={<TikTokPagamentos />} />
                <Route path="/tiktok/pagamentos/upload" element={<TikTokPagamentosUpload />} />

                <Route path="/calculadora" element={<CalculadoraPrecificacao />} />
                <Route path="/precificacao/custos" element={<CadastroCustos />} />
                <Route path="/fluxo-caixa" element={<FluxoCaixaDashboard />} />
                <Route path="/fluxo-caixa/lancamentos" element={<FluxoCaixaLancamentos />} />
                <Route path="/fluxo-caixa/categorias" element={<FluxoCaixaCategorias />} />
                <Route path="/assistente-anuncio" element={<AssistenteAnuncio />} />
                <Route path="/dre" element={<DRE />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/integrations" element={<IntegrationsOverview />} />
                <Route path="/integrations/:provider" element={<IntegrationManage />} />
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