import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/resultados-variacoes" element={<ResultadosVariacoes />} />
            <Route path="/calculadora" element={<CalculadoraPrecificacao />} />
            <Route path="/precificacao/custos" element={<CadastroCustos />} />
            <Route path="/fluxo-caixa" element={<FluxoCaixaDashboard />} />
            <Route path="/fluxo-caixa/lancamentos" element={<FluxoCaixaLancamentos />} />
            <Route path="/fluxo-caixa/categorias" element={<FluxoCaixaCategorias />} />
            <Route path="/fluxo-caixa/importacao" element={<FluxoCaixaImportacao />} />
            <Route path="/assistente-anuncio" element={<AssistenteAnuncio />} />
            <Route path="/tiktok/dashboard" element={<TikTokDashboard />} />
            <Route path="/tiktok/configuracoes" element={<TikTokConfiguracoes />} />
            <Route path="/tiktok/upload" element={<TikTokUpload />} />
            <Route path="/tiktok/resultados" element={<TikTokResultados />} />
            <Route path="/tiktok/variacoes" element={<TikTokVariacoes />} />
            <Route path="/tiktok/pagamentos" element={<TikTokPagamentos />} />
            <Route path="/tiktok/pagamentos/upload" element={<TikTokPagamentosUpload />} />
            <Route path="/dre" element={<DRE />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
