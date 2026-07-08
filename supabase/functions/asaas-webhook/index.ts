import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PlanId, planIdByCycle } from "../_shared/plans.ts";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_API_BASE_URL = Deno.env.get("ASAAS_API_BASE_URL")!;
const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function fetchSubscription(subscriptionId: string) {
  const response = await fetch(`${ASAAS_API_BASE_URL}/subscriptions/${subscriptionId}`, {
    headers: { access_token: ASAAS_API_KEY },
  });
  if (!response.ok) return null;
  return await response.json();
}

// ── Helper: o checkout codifica "userId:planId" no externalReference, já que
// planos semestral/anual (INSTALLMENT) não têm subscription/cycle pra inferir o plano ──
const PLAN_IDS: PlanId[] = ["mensal", "semestral", "anual"];

function parseRef(ref?: string | null): { userId: string | null; planId: PlanId | null } {
  if (!ref) return { userId: null, planId: null };
  const idx = ref.indexOf(":");
  if (idx === -1) return { userId: ref, planId: null };
  const userId = ref.slice(0, idx);
  const rawPlanId = ref.slice(idx + 1);
  const planId = PLAN_IDS.includes(rawPlanId as PlanId) ? (rawPlanId as PlanId) : null;
  return { userId, planId };
}

// ── Helper: resolve userId com fallbacks (equivalente ao resolveUserId do antigo stripe-webhook) ──
async function resolveUserId(
  externalReference?: string | null,
  asaasSubscriptionId?: string | null,
  asaasCustomerId?: string | null,
): Promise<string | null> {
  if (externalReference) return externalReference;

  if (asaasSubscriptionId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("asaas_subscription_id", asaasSubscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (asaasCustomerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("asaas_customer_id", asaasCustomerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

Deno.serve(async (req) => {
  const token = req.headers.get("asaas-access-token");
  if (token !== ASAAS_WEBHOOK_TOKEN) {
    return new Response("Token inválido", { status: 401 });
  }

  const body = await req.json();
  const eventType = body.event as string;

  // ──────────────────────────────────────────────────────────────────
  // CHECKOUT_PAID — comprador concluiu o checkout (cartão capturado).
  // Só guarda a referência do checkout; a ativação do plano de verdade
  // acontece em PAYMENT_CONFIRMED/PAYMENT_RECEIVED (dinheiro confirmado),
  // seja cobrança recorrente (mensal) ou parcelada única (semestral/anual).
  // ──────────────────────────────────────────────────────────────────
  if (eventType === "CHECKOUT_PAID") {
    const checkout = body.checkout;
    const { userId: refUserId } = parseRef(checkout?.externalReference);

    const userId = await resolveUserId(refUserId, undefined, checkout?.customer);

    if (userId) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          asaas_customer_id: checkout?.customer ?? null,
          asaas_checkout_id: checkout?.id ?? null,
        },
        { onConflict: "user_id" }
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // SUBSCRIPTION_CREATED — guarda o id da assinatura assim que ela
  // existe, sem esperar o primeiro pagamento confirmar.
  // ──────────────────────────────────────────────────────────────────
  if (eventType === "SUBSCRIPTION_CREATED") {
    const subscription = body.subscription;
    const { userId: refUserId } = parseRef(subscription?.externalReference);

    const userId = await resolveUserId(refUserId, undefined, subscription?.customer);

    if (userId) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          asaas_customer_id: subscription?.customer ?? null,
          asaas_subscription_id: subscription?.id ?? null,
        },
        { onConflict: "user_id" }
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PAYMENT_CONFIRMED / PAYMENT_RECEIVED — dinheiro confirmado: ativa o
  // plano pago. Cobre tanto a assinatura recorrente (mensal, tem
  // subscription/cycle) quanto a parcela única (semestral/anual,
  // INSTALLMENT, sem subscription — o plano vem do externalReference).
  // ──────────────────────────────────────────────────────────────────
  if (eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") {
    const payment = body.payment;
    const asaasSubscriptionId = payment?.subscription as string | undefined;

    const subscription = asaasSubscriptionId
      ? await fetchSubscription(asaasSubscriptionId)
      : null;

    const refFromSubscription = parseRef(subscription?.externalReference);
    const refFromPayment = parseRef(payment?.externalReference);

    const userId = await resolveUserId(
      refFromSubscription.userId ?? refFromPayment.userId,
      asaasSubscriptionId,
      payment?.customer,
    );

    if (userId) {
      const planoPago =
        refFromSubscription.planId ??
        refFromPayment.planId ??
        (subscription?.cycle ? planIdByCycle(subscription.cycle) : null) ??
        "mensal";

      await supabase
        .from("profiles")
        .update({ plan: planoPago, trial_ends_at: null })
        .eq("id", userId);

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan: planoPago,
          status: "active",
          user_plan: planoPago,
          asaas_customer_id: payment?.customer ?? null,
          asaas_subscription_id: asaasSubscriptionId ?? null,
        },
        { onConflict: "user_id" }
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // SUBSCRIPTION_DELETED / SUBSCRIPTION_INACTIVATED — cancelamento
  // efetivo (a Asaas não tem "cancelar no fim do período").
  // ──────────────────────────────────────────────────────────────────
  if (eventType === "SUBSCRIPTION_DELETED" || eventType === "SUBSCRIPTION_INACTIVATED") {
    const subscription = body.subscription;
    const { userId: refUserId } = parseRef(subscription?.externalReference);

    const userId = await resolveUserId(refUserId, subscription?.id, subscription?.customer);

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
