import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapa de planos -> price_id no Stripe
const PRICE_IDS: Record<string, string> = {
  mensal: "price_1TWhxh2E4GCWvClvbQrPxqy9",
  semestral: "price_1Thw3m2E4GCWvClvH7VhYD8N",
  anual: "price_1Thw0Q2E4GCWvClvEIMF4mCy",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, email, planId } = await req.json();

    const selectedPlan = PRICE_IDS[planId] ? planId : "mensal";
    const priceId = PRICE_IDS[selectedPlan];

    // ── 1. Busca o stripe_customer_id salvo no Supabase ──────────────
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId: string | undefined = subData?.stripe_customer_id ?? undefined;
    let jaUsouTrial = false;

    // ── 2. Se já tem customer, verifica se já usou trial ─────────────
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });
      jaUsouTrial = subscriptions.data.some((sub) => sub.trial_end !== null);
    } else {
      const existingCustomers = await stripe.customers.list({ email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
        });
        jaUsouTrial = subscriptions.data.some((sub) => sub.trial_end !== null);

        await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            plan: "cancelado",
            status: "canceled",
            user_plan: "cancelado",
          });
      }
    }

    // ── 4. Cria a sessão de checkout ──────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",

      ...(customerId
        ? { customer: customerId }
        : { customer_email: email }
      ),

      payment_method_collection: "always",

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      subscription_data: {
        ...(jaUsouTrial
          ? {}
          : {
              trial_period_days: 5,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: "cancel",
                },
              },
            }),
        metadata: { userId, plan: selectedPlan },
      },

      custom_text: {
        submit: {
          message: jaUsouTrial
            ? "Você será cobrado imediatamente após confirmar."
            : "Você não será cobrado agora. O período gratuito de 5 dias começa hoje — cancele a qualquer momento.",
        },
      },

      metadata: { userId, plan: selectedPlan },
      success_url: `${req.headers.get("origin")}/dashboard?trial=success`,
      cancel_url: `${req.headers.get("origin")}/planos?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});