import { useNavigate } from 'react-router-dom';
import { AlertTriangle, XCircle, Info, ArrowRight } from 'lucide-react';
import { DREAlerta } from '@/lib/dre-calculations';
import { Button } from '@/components/ui/button';

interface DREAlertsProps {
  alertas: DREAlerta[];
}

// Mapa de campo → ação corretiva
const ALERT_ACTIONS: Record<string, { label: string; path: string }> = {
  impostosSobreVendasTotal: {
    label: 'Configurar impostos (Shopee)',
    path: '/shopee/configuracoes',
  },
  cogsTotal: {
    label: 'Cadastrar custos dos produtos',
    path: '/shopee/configuracoes',
  },
  margemContribuicao: {
    label: 'Revisar custos variáveis',
    path: '/shopee/configuracoes',
  },
  lucroOperacional: {
    label: 'Gerenciar custos fixos',
    path: '/gestao',
  },
  custosFixosTotal: {
    label: 'Cadastrar custos fixos',
    path: '/gestao',
  },
};

const ICON = {
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const STYLES = {
  warning: {
    wrapper: 'bg-warning/10 border-warning/30',
    icon: 'text-warning',
    text: 'text-warning',
    sub: 'text-warning/90',
    btn: 'text-warning hover:text-warning/80',
  },
  error: {
    wrapper: 'bg-destructive/10 border-destructive/30',
    icon: 'text-destructive',
    text: 'text-destructive',
    sub: 'text-destructive/90',
    btn: 'text-destructive hover:text-destructive/80',
  },
  info: {
    wrapper: 'bg-accent border-primary/20',
    icon: 'text-accent-foreground',
    text: 'text-accent-foreground',
    sub: 'text-accent-foreground/90',
    btn: 'text-accent-foreground hover:text-accent-foreground/80',
  },
};

// Mensagens amigáveis com instrução clara
const FRIENDLY_MESSAGES: Record<string, { titulo: string; instrucao: string }> = {
  impostosSobreVendasTotal: {
    titulo: 'Imposto sobre vendas não configurado',
    instrucao: 'Acesse Configurações da Shopee ou TikTok → campo "Imposto NF Saída (%)" e informe sua alíquota do Simples Nacional ou ISS.',
  },
  cogsTotal: {
    titulo: 'Custo dos produtos zerado',
    instrucao: 'Acesse Configurações da Shopee → aba "Custos por Produto" e cadastre o custo unitário de cada produto para calcular o lucro real.',
  },
  margemContribuicao: {
    titulo: 'Margem de contribuição negativa',
    instrucao: 'Seus custos variáveis estão maiores que o lucro bruto. Revise as taxas de comissão, ads e custos de produto.',
  },
  lucroOperacional: {
    titulo: 'Lucro operacional negativo',
    instrucao: 'Seus custos fixos estão acima da margem de contribuição. Revise os custos fixos cadastrados ou aumente suas vendas.',
  },
  custosFixosTotal: {
    titulo: 'Nenhum custo fixo cadastrado',
    instrucao: 'Cadastre seus custos fixos (aluguel, funcionários, etc.) para ter uma DRE completa e precisa.',
  },
};

export function DREAlerts({ alertas }: DREAlertsProps) {
  const navigate = useNavigate();

  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="space-y-3">
      {alertas.map((alerta, index) => {
        const Icon = ICON[alerta.tipo];
        const style = STYLES[alerta.tipo];
        const action = ALERT_ACTIONS[alerta.campo];
        const friendly = FRIENDLY_MESSAGES[alerta.campo];

        return (
          <div
            key={index}
            className={`flex items-start gap-3 p-4 rounded-lg border ${style.wrapper}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.icon}`} />

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${style.text}`}>
                {friendly?.titulo || alerta.mensagem}
              </p>
              {friendly?.instrucao && (
                <p className={`text-xs mt-1 ${style.sub}`}>
                  {friendly.instrucao}
                </p>
              )}
            </div>

            {action && (
              <Button
                variant="ghost"
                size="sm"
                className={`shrink-0 text-xs font-medium gap-1 px-2 h-7 ${style.btn}`}
                onClick={() => navigate(action.path)}
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}