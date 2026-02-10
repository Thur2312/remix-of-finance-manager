import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/resultados" element={<ProtectedRoute><Resultados /></ProtectedRoute>} />
            <Route path="/resultados-variacoes" element={<ProtectedRoute><ResultadosVariacoes /></ProtectedRoute>} />
            <Route path="/calculadora" element={<ProtectedRoute><CalculadoraPrecificacao /></ProtectedRoute>} />
            <Route path="/precificacao/custos" element={<ProtectedRoute><CadastroCustos /></ProtectedRoute>} />
            <Route path="/fluxo-caixa" element={<ProtectedRoute><FluxoCaixaDashboard /></ProtectedRoute>} />
            <Route path="/fluxo-caixa/lancamentos" element={<ProtectedRoute><FluxoCaixaLancamentos /></ProtectedRoute>} />
            <Route path="/fluxo-caixa/categorias" element={<ProtectedRoute><FluxoCaixaCategorias /></ProtectedRoute>} />
            <Route path="/fluxo-caixa/importacao" element={<ProtectedRoute><FluxoCaixaImportacao /></ProtectedRoute>} />
            <Route path="/assistente-anuncio" element={<ProtectedRoute><AssistenteAnuncio /></ProtectedRoute>} />
            <Route path="/tiktok/dashboard" element={<ProtectedRoute><TikTokDashboard /></ProtectedRoute>} />
            <Route path="/tiktok/configuracoes" element={<ProtectedRoute><TikTokConfiguracoes /></ProtectedRoute>} />
            <Route path="/tiktok/upload" element={<ProtectedRoute><TikTokUpload /></ProtectedRoute>} />
            <Route path="/tiktok/resultados" element={<ProtectedRoute><TikTokResultados /></ProtectedRoute>} />
            <Route path="/tiktok/variacoes" element={<ProtectedRoute><TikTokVariacoes /></ProtectedRoute>} />
            <Route path="/tiktok/pagamentos" element={<ProtectedRoute><TikTokPagamentos /></ProtectedRoute>} />
            <Route path="/tiktok/pagamentos/upload" element={<ProtectedRoute><TikTokPagamentosUpload /></ProtectedRoute>} />
            <Route path="/dre" element={<ProtectedRoute><DRE /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
