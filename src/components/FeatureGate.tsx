import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface FeatureGateProps {
  permission: string;
  children: ReactNode;
  requiredPlanName?: string;
  onUpgradeClick?: () => void;
}

export function FeatureGate({
  permission,
  children,
  requiredPlanName,
  onUpgradeClick,
}: FeatureGateProps) {
  const { hasPermission, profileLoading } = useAuth();

  if (profileLoading) return null;

  const allowed = hasPermission(permission);

  return (
    <div className="relative">
      {/* Conteúdo */}
      <div className={allowed ? "" : "opacity-50 pointer-events-none blur-[1px]"}>
        {children}
      </div>

      {/* Overlay de bloqueio */}
      {!allowed && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6">
            <div className="text-lg font-semibold mb-2">
              🔒 Recurso Premium
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Disponível no plano {requiredPlanName ?? "superior"}.
            </p>

            <button
              onClick={onUpgradeClick}
              className="px-4 py-2 bg-black text-white rounded-md hover:opacity-90 transition"
            >
              Fazer Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
