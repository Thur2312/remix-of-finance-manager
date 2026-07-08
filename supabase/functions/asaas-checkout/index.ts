import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { PLANS, resolvePlanId } from "../_shared/plans.ts";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_API_BASE_URL = Deno.env.get("ASAAS_API_BASE_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Asaas não tem "trial_period_days" nativo — simulamos o trial de 5 dias
// adiando a primeira cobrança da assinatura para daqui a 5 dias.
function firstDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId, email, planId } = await req.json();

    if (!userId || !email) {
      throw new Error("userId e email são obrigatórios.");
    }

    const selectedPlan = resolvePlanId(planId);
    const plan = PLANS[selectedPlan];

    const response = await fetch(`${ASAAS_API_BASE_URL}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: 60,
        externalReference: userId,
        callback: {
          successUrl: `${req.headers.get("origin")}/dashboard?trial=success`,
          cancelUrl: `${req.headers.get("origin")}/planos?canceled=true`,
        },
        items: [
          {
            name: `Seller Finance — Plano ${plan.label}`,
            description: `Assinatura ${plan.label}`,
            quantity: 1,
            value: plan.value,
          },
        ],
        subscription: {
          cycle: plan.cycle,
          nextDueDate: firstDueDate(),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = Array.isArray(data?.errors)
        ? data.errors.map((e: { description?: string }) => e.description).join(" ")
        : "Erro ao criar checkout na Asaas.";
      throw new Error(message);
    }

    // Guarda o checkout_id para conseguirmos correlacionar no webhook,
    // mesmo antes de qualquer pagamento ser confirmado.
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        asaas_checkout_id: data.id,
      },
      { onConflict: "user_id" }
    );

    return new Response(JSON.stringify({ url: data.link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
