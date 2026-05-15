import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch {
    return new Response("Webhook signature inválida", { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────────
  // Checkout concluído — usuário cadastrou o cartão no Stripe
  // Neste momento o plano muda para "trial" (ou "profissional" se já
  // usou trial antes e foi cobrado direto)
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const userId = session.metadata?.userId;

    if (userId && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const emTrial = sub.status === "trialing";
      const plano = emTrial ? "trial" : "profissional";
      const trialEndsAt =
        emTrial && sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

      await supabase
        .from("profiles")
        .update({ plan: plano, trial_ends_at: trialEndsAt })
        .eq("id", userId);

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: plano,
        status: sub.status,
        user_plan: plano,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer as string,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Trial converteu — Stripe cobrou com sucesso após os 5 dias
  // Plano vira "profissional"
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    if (!invoice.subscription) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const sub = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );
    const userId = sub.metadata?.userId;

    if (userId) {
      await supabase
        .from("profiles")
        .update({ plan: "profissional", trial_ends_at: null })
        .eq("id", userId);

      await supabase
        .from("subscriptions")
        .update({
          plan: "profissional",
          status: "active",
          user_plan: "profissional",
        })
        .eq("user_id", userId);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Subscription atualizada — cobre transições de status do Stripe
  // (trialing → active, active → past_due, etc.)
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;

    if (userId) {
      const emTrial = sub.status === "trialing";
      const plano = emTrial ? "trial" : "profissional";
      const trialEndsAt =
        emTrial && sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

      await supabase
        .from("profiles")
        .update({ plan: plano, trial_ends_at: trialEndsAt })
        .eq("id", userId);

      await supabase
        .from("subscriptions")
        .update({ plan: plano, status: sub.status, user_plan: plano })
        .eq("user_id", userId);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Subscription cancelada ou expirada
  // O Stripe só dispara este evento ao FIM do período pago —
  // comportamento padrão que você escolheu (sem bloqueio imediato)
  //
  // CORREÇÃO vs versão anterior: usa metadata.userId em vez de
  // buscar por email (mais seguro e sem dependência do customer object)
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;

    // Tenta pegar userId direto dos metadados da subscription
    let userId = sub.metadata?.userId;

    // Fallback: busca pela tabela subscriptions usando o ID da sub
    if (!userId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .single();
      userId = data?.user_id;
    }

    if (userId) {
      await supabase
        .from("profiles")
        .update({ plan: "cancelado", trial_ends_at: null })
        .eq("id", userId);

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", plan: "cancelado", user_plan: "cancelado" })
        .eq("user_id", userId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});