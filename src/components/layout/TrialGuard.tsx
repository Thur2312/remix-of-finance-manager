import { PaywallModal } from "@/components/PaywallModal";
import { isCalculadoraAllowed } from "@/lib/allowlist";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function TrialGuard({ children }: { children: React.ReactNode }) {
  // PaywallModal (abaixo) já chama useTrialStatus() e decide tudo sozinho —
  // esta tela não usava isTrialExpired/isLoading pra nada, só duplicava a
  // consulta a profiles e o setInterval(60s) de useTrialStatus à toa.
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