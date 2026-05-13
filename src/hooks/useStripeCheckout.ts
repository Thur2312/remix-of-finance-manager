import { supabase } from "@/integrations/supabase/client";

export function useStripeCheckout() {
  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: { userId: user.id, email: user.email },
    });

    if (error) {
      console.error("Erro ao iniciar checkout:", error);
      return;
    }

    window.location.href = data.url;
  };

  return { handleCheckout };
}