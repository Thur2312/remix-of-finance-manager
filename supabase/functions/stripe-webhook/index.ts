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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const userId = session.metadata?.userId;

    if (userId) {
      await supabase
        .from("profiles")
        .update({ plan: "profissional" })
        .eq("id", userId);

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: "profissional",
        status: "active",
        user_plan: "profissional",
      });
    }
  }

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
        .update({ plan: "free" })
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