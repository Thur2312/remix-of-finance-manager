import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Disparada só pelo trigger send_sale_push_trigger (sale_events AFTER INSERT
// → public.trigger_send_sale_push → net.http_post), validada pelo mesmo
// segredo do auto-sync. Um pedido novo, um push — Shopee e Mercado Livre
// tratados igual porque a linha de sale_events já normaliza os dois.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const PROVIDER_LABEL: Record<string, string> = { shopee: "Shopee", mercadolivre: "Mercado Livre" };

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const CRON_SECRET = Deno.env.get("INTEGRATION_SYNC_CRON_SECRET") ?? "";
    if (!CRON_SECRET || typeof body?.cron_secret !== "string" || !timingSafeEqual(body.cron_secret, CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const saleEventId = body?.sale_event_id;
    if (!saleEventId) {
      return new Response(JSON.stringify({ error: "sale_event_id ausente." }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: event } = await supabase
      .from("sale_events")
      .select("user_id, provider, total_amount, currency, product_name, buyer_username")
      .eq("id", saleEventId)
      .maybeSingle();

    if (!event) {
      return new Response(JSON.stringify({ error: "Evento não encontrado." }), { status: 404 });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", event.user_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:suporte@sellerfinance.com.br",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const valor = Number(event.total_amount || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: event.currency || "BRL",
    });
    const marketplace = PROVIDER_LABEL[event.provider] ?? event.provider;
    const payload = JSON.stringify({
      title: "Nova venda! 🎉",
      body: `${event.product_name ?? "Pedido"} — ${valor} (${marketplace})`,
      url: "/vendas",
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Inscrição expirada/revogada pelo navegador — limpa pra não tentar de novo.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("send-sale-push: falha ao enviar", sub.id, err);
        }
      }
    }

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-sale-push erro:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
  }
});
