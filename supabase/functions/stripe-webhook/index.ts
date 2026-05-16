import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Helper: resolve userId com fallbacks ──────────────────────────────────────
// Ordem: 1) metadata da subscription  2) metadata do checkout  3) tabela subscriptions
async function resolveUserId(
  subId?: string,
  metaUserId?: string,
  sessionUserId?: string
): Promise<string | null> {
  if (metaUserId)  return metaUserId;
  if (sessionUserId) return sessionUserId;

  if (subId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subId)
      .single();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

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
  // checkout.session.completed
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;

    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const userId = await resolveUserId(
        sub.id,
        sub.metadata?.userId,
        session.metadata?.userId   // fallback: metadata do checkout
      );

      if (userId) {
        const emTrial    = sub.status === "trialing";
        const plano      = emTrial ? "trial" : "profissional";
        const trialEndsAt = emTrial && sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

        await supabase
          .from("profiles")
          .update({ plan: plano, trial_ends_at: trialEndsAt })
          .eq("id", userId);

        await supabase.from("subscriptions").upsert({
          user_id:               userId,
          plan:                  plano,
          status:                sub.status,
          user_plan:             plano,
          stripe_subscription_id: sub.id,
          stripe_customer_id:    sub.customer as string,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // invoice.payment_succeeded — trial converteu OU renovação mensal
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

    const userId = await resolveUserId(sub.id, sub.metadata?.userId);

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

  // ──────────────────────────────────────────────────────────────────
  // customer.subscription.updated — trialing → active, etc.
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;

    const userId = await resolveUserId(sub.id, sub.metadata?.userId);

    if (userId) {
      const emTrial     = sub.status === "trialing";
      const plano       = emTrial ? "trial" : "profissional";
      const trialEndsAt = emTrial && sub.trial_end
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
  // customer.subscription.deleted — cancelamento efetivo
  // ──────────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;

    const userId = await resolveUserId(sub.id, sub.metadata?.userId);

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