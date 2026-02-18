import { Toaster } from "@/components/ui/toaster";
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
import Upgrade from "./pages/Upgrade";

const queryClient = new QueryClient();

const App = () => {
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
                    <DRE />
                  </PlanProtectedRoute>
                } 
              />

              {/* ========== FLUXO DE CAIXA AVANÇADO (Apenas Empresarial) ========== */}
              <Route 
                path="/fluxo-caixa" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FluxoCaixaDashboard />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/lancamentos" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FluxoCaixaLancamentos />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/categorias" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FluxoCaixaCategorias />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/fluxo-caixa/importacao" 
                element={
                  <PlanProtectedRoute requiredPermission="fluxo_caixa_avancado">
                    <FluxoCaixaImportacao />
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
                    <TikTokDashboard />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/configuracoes" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokConfiguracoes />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/upload" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokUpload />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/resultados" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokResultados />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/variacoes" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokVariacoes />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/pagamentos" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokPagamentos />
                  </PlanProtectedRoute>
                } 
              />
              
              <Route 
                path="/tiktok/pagamentos/upload" 
                element={
                  <PlanProtectedRoute requiredPermission="tiktok_integration">
                    <TikTokPagamentosUpload />
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

              {/* ========== UPGRADE ========== */}
              <Route 
                path="/upgrade" 
                element={
                  <ProtectedRoute>
                    <Upgrade />
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
