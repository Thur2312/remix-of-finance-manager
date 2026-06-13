import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStripeCheckout() {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingCancel, setLoadingCancel]     = useState(false);

  // ── Iniciar checkout (com trial) ──────────────────────────────────
  const handleCheckout = async (planId: 'mensal' | 'semestral' | 'anual' = 'mensal') => {
    setLoadingCheckout(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { userId: user.id, email: user.email, planId },
      });

      if (error) {
        console.error("Erro ao iniciar checkout:", error);
        return;
      }

      window.location.href = data.url;
    } finally {
      setLoadingCheckout(false);
    }
  };

  // ── Cancelar assinatura ───────────────────────────────────────────
  const handleCancel = async (): Promise<{ success: boolean; error?: string }> => {
    setLoadingCancel(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Usuário não autenticado." };

      const { data, error } = await supabase.functions.invoke("stripe-cancel", {
        body: { userId: user.id },
      });

      if (error) {
        console.error("Erro ao cancelar assinatura:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } finally {
      setLoadingCancel(false);
    }
  };

  return { handleCheckout, handleCancel, loadingCheckout, loadingCancel };
}