import { PaywallModal } from "@/components/PaywallModal";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { isCalculadoraAllowed } from "@/lib/allowlist";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function TrialGuard({ children }: { children: React.ReactNode }) {
  const { isTrialExpired, isLoading } = useTrialStatus();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? undefined);
    });
  }, []);

  const ALLOWED_PATHS = ["/calculadora", "/precificacao/custos"];
  const isAllowedPath = ALLOWED_PATHS.includes(location.pathname);
  const isLiberated   = isAllowedPath && isCalculadoraAllowed(userEmail);

  return (
    <>
      {children}
      {!isLiberated && <PaywallModal />}
    </>
  );
}