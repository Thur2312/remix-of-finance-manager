import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * usei todo meu conhecimento de frontend p fazer essa porra thulio
 * Componente que exibe um banner quando o usuário está no plano Trial
 * Mostra quantos dias restam e um link para fazer upgrade
 */
export function TrialBanner() {
  const { plan, trialDaysRemaining, isTrialExpired } = useAuth();

  // Não mostrar se não é trial ou se já expirou
  if (plan !== 'trial' || isTrialExpired) {
    return null;
  }

  // Determinar cor baseado em dias restantes
  const getColor = () => {
    if (trialDaysRemaining <= 1) return 'bg-red-50 border-red-200';
    if (trialDaysRemaining <= 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getTextColor = () => {
    if (trialDaysRemaining <= 1) return 'text-red-800';
    if (trialDaysRemaining <= 3) return 'text-yellow-800';
    return 'text-blue-800';
  };

  const getIconColor = () => {
    if (trialDaysRemaining <= 1) return 'text-red-600';
    if (trialDaysRemaining <= 3) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <div className={`border rounded-lg p-4 flex items-center justify-between ${getColor()}`}>
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 ${getIconColor()}`} />
        <div>
          <p className={`font-semibold ${getTextColor()}`}>
            Seu período de trial expira em {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}
          </p>
          <p className={`text-sm ${getTextColor()}`}>
            Você tem acesso a todas as funcionalidades. Faça upgrade para continuar após o trial.
          </p>
        </div>
      </div>
      <Link 
        to="/upgrade" 
        className="btn btn-primary whitespace-nowrap ml-4"
      >
        Fazer Upgrade
      </Link>
    </div>
  );
}

/**
 * chefe é chefe né pae
 * Componente alternativo: Card de Aviso
 * Use este se preferir um estilo diferente
 */
export function TrialWarningCard() {
  const { plan, trialDaysRemaining, isTrialExpired } = useAuth();

  if (plan !== 'trial' || isTrialExpired) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">Período de Trial Ativo</h3>
          <p className="mb-4">
            Você está desfrutando de acesso completo a todas as funcionalidades por mais {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}.
          </p>
          <Link 
            to="/upgrade"
            className="inline-block bg-white text-blue-600 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition"
          >
            Ver Planos de Assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}
