import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PlanProtectedRoute } from "@/components/layout/PlanProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Configuracoes from "./pages/Configuracoes";
import Upload from "./pages/Upload";
import Resultados from "./pages/Resultados";
import ResultadosVariacoes from "./pages/ResultadosVariacoes";
import CalculadoraPrecificacao from "./pages/CalculadoraPrecificacao";
import CadastroCustos from "./pages/precificacao/CadastroCustos";
import FluxoCaixaDashboard from "./pages/fluxo-caixa/FluxoCaixaDashboard";
import FluxoCaixaLancamentos from "./pages/fluxo-caixa/FluxoCaixaLancamentos";
import FluxoCaixaCategorias from "./pages/fluxo-caixa/FluxoCaixaCategorias";
import FluxoCaixaImportacao from "./pages/fluxo-caixa/FluxoCaixaImportacao";
import AssistenteAnuncio from "./pages/AssistenteAnuncio";
import TikTokDashboard from "./pages/tiktok/TikTokDashboard";
import TikTokConfiguracoes from "./pages/tiktok/TikTokConfiguracoes";
import TikTokUpload from "./pages/tiktok/TikTokUpload";
import TikTokResultados from "./pages/tiktok/TikTokResultados";
import TikTokVariacoes from "./pages/tiktok/TikTokVariacoes";
import TikTokPagamentos from "./pages/tiktok/TikTokPagamentos";
import TikTokPagamentosUpload from "./pages/tiktok/TikTokPagamentosUpload";
import DRE from "./pages/DRE";
import Perfil from "./pages/Perfil";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Planos from "./pages/Planos";
import { FeatureGate } from "./components/FeatureGate";

const queryClient = new QueryClient();

const App = () => {
  const navigate = useNavigate();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ========== ROTAS PÚBLICAS ========== */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* ========== ROTAS PROTEGIDAS (Autenticação) ========== */}
              {/* Dashboard - Disponível em todos os planos */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              
              {/* Configurações - Disponível em todos os planos */}
              <Route 
                path="/configuracoes" 
                element={
                  <ProtectedRoute>
                    <Configuracoes />
                  </ProtectedRoute>
                } 
              />
              
              {/* Upload - Disponível em todos os planos */}
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                } 
              />
              
              {/* Resultados - Disponível em todos os planos */}
              <Route 
                path="/resultados" 
                element={
                  <ProtectedRoute>
                    <Resultados />
                  </ProtectedRoute>
                } 
              />
              
              {/* Resultados Variações - Disponível em todos os planos */}
              <Route 
                path="/resultados-variacoes" 
                element={
                  <ProtectedRoute>
                    <ResultadosVariacoes />
                  </ProtectedRoute>
                } 
              />

              {/* ========== CALCULADORA / PRECIFICAÇÃO (Todos os planos) ========== */}
              <Route 
                path="/calculadora" 
                element={
                  <ProtectedRoute>
                    <CalculadoraPrecificacao />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/precificacao/custos" 
                element={
                  <ProtectedRoute>
                    <CadastroCustos />
                  </ProtectedRoute>
                } 
              />

              {/* ========== DRE AUTOMATIZADO (Profissional + Empresarial) ========== */}
              <Route 
                path="/dre" 
                element={
                  <PlanProtectedRoute requiredPermission="dre_automatizado">
                    <FeatureGate
                      permission="advanced_dashboard"
                      requiredPlanName="Profissional ou superior"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <DRE />
                    </FeatureGate>
                  </PlanProtectedRoute>
                  
                } 
              />

              {/* ========== FLUXO DE CAIXA AVANÇADO (Apenas Empresarial) ========== */}
              <Route 
                path="/fluxo-caixa" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FeatureGate
                      permission="fluxo_caixa_avancado"
                      requiredPlanName="Empresarial"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <FluxoCaixaDashboard />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/lancamentos" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FeatureGate
                      permission="fluxo_caixa_avancado"
                      requiredPlanName="Empresarial"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <FluxoCaixaLancamentos />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/categorias" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FeatureGate
                      permission="fluxo_caixa_avancado"
                      requiredPlanName="Empresarial"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <FluxoCaixaCategorias />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/importacao" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FeatureGate
                      permission="fluxo_caixa_avancado"
                      requiredPlanName="Empresarial"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <FluxoCaixaImportacao />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />

              {/* ========== ASSISTENTE DE ANÚNCIO (Todos os planos) ========== */}
              <Route 
                path="/assistente-anuncio" 
                element={
                  <ProtectedRoute>
                    <AssistenteAnuncio />
                  </ProtectedRoute>
                } 
              />

              {/* ========== TIKTOK INTEGRATION (Básico: 1 conta, Profissional: 2 contas, Empresarial: Ilimitado) ========== */}
              <Route 
                path="/tiktok/dashboard" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokDashboard />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/configuracoes" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokConfiguracoes />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/upload" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokUpload />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/resultados" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokResultados />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/variacoes" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokVariacoes />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/pagamentos" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokPagamentos />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/pagamentos/upload" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <FeatureGate
                      permission="tiktok_integration"
                      requiredPlanName="Profissional ou superior para múltiplas contas"
                      onUpgradeClick={() => navigate("/Planos")}
                    >
                    <TikTokPagamentosUpload />
                    </FeatureGate>
                  </PlanProtectedRoute>
                } 
              />

              {/* ========== PERFIL ========== */}
              <Route 
                path="/perfil" 
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                } 
              />

              {/* ========== CATCH-ALL ========== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
