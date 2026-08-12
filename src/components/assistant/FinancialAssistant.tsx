import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, TrendingUp, DollarSign, BarChart2, X, ChevronDown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SugestaoProps {
  texto: string;
  onClick: () => void;
}

const FINN_SUGESTOES = [
  { icone: TrendingUp, texto: "Qual canal me deu mais lucro esse mês?" },
  { icone: DollarSign, texto: "Quais produtos estão no prejuízo?" },
  { icone: BarChart2, texto: "Qual minha margem real na Shopee?" },
  { icone: Sparkles, texto: "Quanto vou receber nos próximos dias?" },
];

function Sugestao({ texto, onClick }: SugestaoProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 w-full text-left px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
    >
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/50 group-hover:text-primary transition-colors" />
      {texto}
    </button>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const isUser = mensagem.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted/60 text-foreground rounded-bl-sm border border-border/40"
        }`}
      >
        {mensagem.content.split("\n").map((linha, i, arr) => (
          <span key={i}>{linha}{i < arr.length - 1 && <br />}</span>
        ))}
        <div className={`text-[10px] mt-1.5 ${isUser ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>
          {mensagem.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function IndicadorDigitando() {
  return (
    <div className="flex gap-3 items-end">
      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FinancialAssistant() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  // Carrega histórico ao abrir pela primeira vez
  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      carregarHistorico();
    }
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("assistant_conversations")
        .select("messages")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        const historico = (data.messages as { role: "user" | "assistant"; content: string }[]).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(), // timestamp exato não é salvo, usamos now como fallback
        }));
        setMensagens(historico);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensagens, carregando]);

  useEffect(() => {
    if (aberto && !minimizado) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aberto, minimizado]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const enviarMensagem = async (texto?: string) => {
    const pergunta = (texto ?? input).trim();
    if (!pergunta || carregando) return;

    const novaMensagemUser: Mensagem = { role: "user", content: pergunta, timestamp: new Date() };
    setMensagens((prev) => [...prev, novaMensagemUser]);
    setInput("");
    setErro(null);
    setCarregando(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pergunta }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erro ao consultar o assistente.");

      const novaMensagemAssistente: Mensagem = {
        role: "assistant",
        content: data.resposta,
        timestamp: new Date(),
      };
      setMensagens((prev) => [...prev, novaMensagemAssistente]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido.");
      setMensagens((prev) => prev.slice(0, -1));
    } finally {
      setCarregando(false);
    }
  };

  const limparConversa = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "clear" }),
      }
    );

    setMensagens([]);
    setErro(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const conversamVazia = mensagens.length === 0 && !carregandoHistorico;

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        title="Assistente Financeiro"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300 ${minimizado ? "h-14 w-80" : "h-[600px] w-[380px]"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none">Finn</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assistente financeiro</p>
        </div>
        <div className="flex items-center gap-1">
          {mensagens.length > 0 && (
            <button
              onClick={limparConversa}
              className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              title="Limpar conversa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setMinimizado(!minimizado)}
            className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${minimizado ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setAberto(false)}
            className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimizado && (
        <>
          <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
            {/* Carregando histórico */}
            {carregandoHistorico && (
              <div className="flex justify-center py-8">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {conversamVazia && (
              <div className="flex flex-col gap-4 h-full justify-center">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Olá! Sou o Finn.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tenho acesso aos seus dados de vendas. Pergunte sobre lucros, margens, produtos e recebimentos.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {FINN_SUGESTOES.map((s) => (
                    <Sugestao key={s.texto} texto={s.texto} onClick={() => enviarMensagem(s.texto)} />
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((msg, i) => (
              <BolhaMensagem key={i} mensagem={msg} />
            ))}

            {carregando && <IndicadorDigitando />}

            {erro && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
                {erro}
                <button onClick={() => setErro(null)} className="ml-2 underline underline-offset-2">Fechar</button>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border/60 shrink-0">
            <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border/60 px-3 py-2 focus-within:border-primary/40 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seus dados financeiros..."
                rows={1}
                disabled={carregando}
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed disabled:opacity-50 max-h-[120px]"
                style={{ height: "24px" }}
              />
              <button
                onClick={() => enviarMensagem()}
                disabled={!input.trim() || carregando}
                className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity mb-0.5"
              >
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </>
      )}
    </div>
  );
}