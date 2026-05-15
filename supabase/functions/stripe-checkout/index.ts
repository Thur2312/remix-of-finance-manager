import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();

    // Buscar se o usuário já tem um customer no Stripe (para evitar trial duplo)
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    const existingCustomer = existingCustomers.data[0];

    // Verificar se já usou trial alguma vez
    let jaUsouTrial = false;
    if (existingCustomer) {
      const subscriptions = await stripe.subscriptions.list({
        customer: existingCustomer.id,
        limit: 10,
      });
      jaUsouTrial = subscriptions.data.some((sub) => sub.trial_end !== null);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,

      // Cartão obrigatório mesmo durante o trial
      payment_method_collection: "always",

      line_items: [
        {
          price: "price_1TWhxh2E4GCWvClvbQrPxqy9",
          quantity: 1,
        },
      ],

      subscription_data: {
        // Só aplica trial se o usuário nunca usou antes
        ...(jaUsouTrial ? {} : { trial_period_days: 5 }),
        metadata: { userId },
      },

      // Mensagem clara na tela do Stripe
      custom_text: {
        submit: {
          message: jaUsouTrial
            ? "Você será cobrado imediatamente após confirmar."
            : "Você não será cobrado agora. O período gratuito de 5 dias começa hoje — cancele a qualquer momento.",
        },
      },

      metadata: { userId },
      success_url: `${req.headers.get("origin")}/dashboard?trial=success`,
      cancel_url: `${req.headers.get("origin")}/setup-payment?canceled=true`,
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