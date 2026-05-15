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

  // ----------------------------------------------------------------
  // Checkout concluído — usuário cadastrou o cartão
  // ----------------------------------------------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const userId = session.metadata?.userId;

    if (userId && session.subscription) {
      // Buscar detalhes da subscription para saber se está em trial
      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const emTrial = sub.status === "trialing";
      const plano = emTrial ? "trial" : "profissional";

      await supabase
        .from("profiles")
        .update({
          plan: plano,
          trial_ends_at: emTrial && sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        })
        .eq("id", userId);

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: plano,
        status: sub.status,
        user_plan: plano,
      });
    }
  }

  // ----------------------------------------------------------------
  // Trial converteu para pago — Stripe cobrou com sucesso
  // ----------------------------------------------------------------
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    // Só processar faturas de subscription (não avulsas)
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
        .update({ plan: "profissional", status: "active", user_plan: "profissional" })
        .eq("user_id", userId);
    }
  }

  // ----------------------------------------------------------------
  // Subscription atualizada — cobre mudanças de status (trial → active, etc.)
  // ----------------------------------------------------------------
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;

    if (userId) {
      const emTrial = sub.status === "trialing";
      const plano = emTrial ? "trial" : "profissional";

      await supabase
        .from("profiles")
        .update({
          plan: plano,
          trial_ends_at: emTrial && sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        })
        .eq("id", userId);

      await supabase
        .from("subscriptions")
        .update({ plan: plano, status: sub.status, user_plan: plano })
        .eq("user_id", userId);
    }
  }

  // ----------------------------------------------------------------
  // Subscription cancelada ou expirada — igual ao original, sem alteração
  // ----------------------------------------------------------------
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customer.email)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ plan: "free", trial_ends_at: null })
        .eq("id", profile.id);

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", plan: "free" })
        .eq("user_id", profile.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});