// supabase/functions/stripe-cancel/index.ts
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId é obrigatório.");
    }

    // Buscar subscription ativa do usuário
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    if (error || !subscription) {
      throw new Error("Nenhuma assinatura ativa encontrada.");
    }

    // Buscar customer_id pelo email no Stripe
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      throw new Error("Perfil do usuário não encontrado.");
    }

    const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      throw new Error("Customer não encontrado no Stripe.");
    }

    // Buscar subscription ativa no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      throw new Error("Subscription não encontrada no Stripe.");
    }

    // Cancelar ao fim do período (não imediatamente — melhor UX)
    await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: true,
    });

    // Atualizar Supabase para refletir o cancelamento agendado
    await supabase
      .from("subscriptions")
      .update({ status: "cancel_at_period_end" })
      .eq("user_id", userId);

    await supabase
      .from("profiles")
      .update({ plan: "cancel_at_period_end" })
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