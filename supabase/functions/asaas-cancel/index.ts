import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_API_BASE_URL = Deno.env.get("ASAAS_API_BASE_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId é obrigatório.");
    }

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    if (error || !subscription?.asaas_subscription_id) {
      throw new Error("Nenhuma assinatura ativa encontrada.");
    }

    // Cancelamento é imediato na Asaas — não existe "cancelar no fim do período".
    const response = await fetch(
      `${ASAAS_API_BASE_URL}/subscriptions/${subscription.asaas_subscription_id}`,
      {
        method: "DELETE",
        headers: { access_token: ASAAS_API_KEY },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.errors?.[0]?.description ?? "Erro ao cancelar assinatura na Asaas.");
    }

    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId);

    await supabase
      .from("profiles")
      .update({ plan: "cancelado" })
      .eq("id", userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
