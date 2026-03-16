import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface FeatureGateProps {

  children: ReactNode;
  requiredPlanName?: string;
  onUpgradeClick?: () => void;
}

export function Developer({

  children,
  requiredPlanName,
  onUpgradeClick,
}: FeatureGateProps) {
  const { hasPermission, loading,  profileLoading } = useAuth();

  if (loading || profileLoading) return null;

  return (  
    <div>
         <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg">
             <div className="text-center p-6">
             <div className="text-lg font-semibold mb-2">
                 🔒 Recurso em Desenvolvimento
                </div>
            </div>
        </div>
    </div>
  );
}
