import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Finn proativo (Aposta F, parte 1) — cron diário que roda gatilhos
// DETERMINÍSTICOS (nada de LLM) e, quando algum dispara, cria uma notificação
// pro vendedor. Os gatilhos são a mesma matemática das telas Previsão de caixa
// e Reposição, numa versão enxuta suficiente pra um alerta.
//
// Chamado só pelo cron (public.trigger_finn_alerts → net.http_post), validado
// pelo mesmo segredo do auto-sync (INTEGRATION_SYNC_CRON_SECRET). Processa
// todos os usuários com plano ativo numa execução.

const PAID_PLANS = ["mensal", "semestral", "anual", "cancel_at_period_end"];
const DEDUP_DIAS = 3;               // não repete o mesmo alerta dentro disso
const CAIXA_HORIZONTE_DIAS = 7;
const RUPTURA_JANELA_VENDA_DIAS = 60;
const LEAD_TIME_PADRAO = 14;
// Só alerta ruptura de SKU com giro mínimo (≥ isto por dia) — um SKU que
// vendeu 2 unidades em 60 dias não é urgência.
const RUPTURA_VELOCIDADE_MIN = 0.15;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const centsFrom = (reais: unknown, cents: unknown): number => {
  const c = Number(cents);
  if (Number.isFinite(c) && c !== 0) return Math.round(c);
  return Math.round((Number(reais) || 0) * 100);
};
const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const EXCLUIDOS = ["cancel", "nao pago", "unpaid", "devolu", "reembols", "refund", "return"];
const statusExcluido = (s: string | null | undefined) => {
  if (!s) return false;
  const n = s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  return EXCLUIDOS.some((k) => n.includes(k));
};
const skuKey = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[\s\-_./\\]+/g, "");

interface Alerta {
  title: string;
  body: string;
}

// ── Gatilho 1: caixa projetado negativo nos próximos 7 dias ──────────────────
async function checarCaixa(supabase: SupabaseClient, userId: string): Promise<Alerta | null> {
  const { data: settings } = await supabase
    .from("cash_flow_settings")
    .select("opening_balance_cents")
    .eq("user_id", userId)
    .maybeSingle();
  // Sem âncora de saldo confirmada não dá pra projetar — a tela de Previsão
  // já nudge o vendedor pra isso.
  if (!settings) return null;

  const hoje = isoDay(new Date());
  const limite = addDaysIso(hoje, CAIXA_HORIZONTE_DIAS);

  const { data: conns } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "mercadolivre")
    .eq("status", "connected");
  const mlIds = (conns ?? []).map((c) => c.id);

  let entradasCents = 0;
  if (mlIds.length > 0) {
    const { data: recs } = await supabase
      .from("payments")
      .select("net_amount, net_amount_cents, release_date")
      .in("integration_id", mlIds)
      .not("release_date", "is", null)
      .gte("release_date", hoje)
      .lte("release_date", limite);
    for (const p of recs ?? []) entradasCents += Math.max(0, centsFrom(p.net_amount, p.net_amount_cents));
  }

  // Fluxo de Caixa: entradas pendentes e saídas não pagas na janela.
  const { data: entries } = await supabase
    .from("cash_flow_entries")
    .select("type, status, amount, amount_cents, date, due_date, is_recurring, recurrence_type")
    .eq("user_id", userId);

  let saidasCents = 0;
  for (const e of entries ?? []) {
    const venc = (e.due_date ?? e.date ?? "").slice(0, 10);
    const naJanela = (iso: string) => iso >= hoje && iso <= limite;

    if (e.type === "income" && e.status === "pending" && naJanela(venc)) {
      entradasCents += Math.max(0, centsFrom(e.amount, e.amount_cents));
      continue;
    }
    if (e.type !== "expense" || e.status === "paid") continue;

    if (naJanela(venc)) {
      saidasCents += Math.max(0, centsFrom(e.amount, e.amount_cents));
    } else if (venc && e.is_recurring && e.recurrence_type === "monthly") {
      // Próxima ocorrência mensal (mesmo dia do mês) — neste mês ou no próximo.
      const diaVenc = Number(venc.slice(8, 10));
      const [y, m] = hoje.split("-").map(Number);
      for (let k = 0; k <= 1; k++) {
        const occ = new Date(Date.UTC(y, m - 1 + k, diaVenc)).toISOString().slice(0, 10);
        if (naJanela(occ)) { saidasCents += Math.max(0, centsFrom(e.amount, e.amount_cents)); break; }
      }
    }
  }

  // Pedidos ao fornecedor em aberto com vencimento na janela.
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("qty_units, unit_cost_cents, expected_at, payment_due_at")
    .eq("user_id", userId)
    .is("received_at", null);
  for (const p of pos ?? []) {
    const venc = (p.payment_due_at ?? p.expected_at ?? "").slice(0, 10);
    if (venc && venc >= hoje && venc <= limite) {
      saidasCents += Math.max(0, Math.round((Number(p.qty_units) || 0) * (Number(p.unit_cost_cents) || 0)));
    }
  }

  const projetado = Number(settings.opening_balance_cents) + entradasCents - saidasCents;
  if (projetado >= 0) return null;

  return {
    title: "Seu caixa projetado fica negativo esta semana",
    body:
      `Contando só o dinheiro já garantido (saldo atual, recebíveis do Mercado Livre com data e contas lançadas), ` +
      `nos próximos ${CAIXA_HORIZONTE_DIAS} dias o seu caixa fecha em ${brl(projetado)}. ` +
      `Antecipe um recebível, adie uma conta ou reforce o caixa. Veja o dia exato em Previsão de caixa.`,
  };
}

// ── Gatilho 2: SKU rompe o estoque antes do próximo pedido chegar ────────────
async function checarRuptura(supabase: SupabaseClient, userId: string): Promise<Alerta | null> {
  const { data: conns } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("user_id", userId);
  const connIds = (conns ?? []).map((c) => c.id);

  const desde = addDaysIso(isoDay(new Date()), -RUPTURA_JANELA_VENDA_DIAS);

  const [shopeeRes, mlRes, tiktokRes] = await Promise.all([
    connIds.length
      ? supabase
          .from("orders")
          .select("status, order_created_at, order_items(sku, quantity)")
          .in("integration_id", connIds)
          .gte("order_created_at", desde)
      : Promise.resolve({ data: [] }),
    supabase.from("ml_orders").select("sku, quantidade, status_pedido, data_pedido")
      .eq("user_id", userId).gte("data_pedido", desde),
    supabase.from("tiktok_orders").select("sku, quantidade, status_pedido, data_pedido")
      .eq("user_id", userId).gte("data_pedido", desde),
  ]);

  const vendasPorSku = new Map<string, { nome: string; qtd: number }>();
  const somar = (rawSku: string | null | undefined, qtd: number) => {
    const key = skuKey(rawSku);
    if (!key || qtd <= 0) return;
    const cur = vendasPorSku.get(key) ?? { nome: (rawSku ?? "").trim(), qtd: 0 };
    cur.qtd += qtd;
    vendasPorSku.set(key, cur);
  };
  for (const o of (shopeeRes.data as { status: string | null; order_items?: { sku: string | null; quantity: number | null }[] }[]) ?? []) {
    if (statusExcluido(o.status)) continue;
    for (const it of o.order_items ?? []) somar(it.sku, Number(it.quantity) || 0);
  }
  for (const r of mlRes.data ?? []) {
    if (statusExcluido(r.status_pedido)) continue;
    somar(r.sku, Number(r.quantidade) || 0);
  }
  for (const r of tiktokRes.data ?? []) {
    if (statusExcluido(r.status_pedido)) continue;
    somar(r.sku, Number(r.quantidade) || 0);
  }
  if (vendasPorSku.size === 0) return null;

  const [invRes, stockRes, poRes] = await Promise.all([
    supabase.from("inventory_settings").select("sku, stock_units, stock_updated_at, lead_time_days").eq("user_id", userId),
    supabase.from("product_stock").select("sku, stock_units, synced_at").eq("user_id", userId),
    supabase.from("purchase_orders").select("sku, qty_units").eq("user_id", userId).is("received_at", null),
  ]);

  const invByKey = new Map((invRes.data ?? []).map((r) => [skuKey(r.sku), r]));
  const stockByKey = new Map((stockRes.data ?? []).map((r) => [skuKey(r.sku), r]));
  const transitByKey = new Map<string, number>();
  for (const p of poRes.data ?? []) {
    const k = skuKey(p.sku);
    transitByKey.set(k, (transitByKey.get(k) ?? 0) + (Number(p.qty_units) || 0));
  }

  const rompendo: { nome: string; dias: number }[] = [];
  for (const [key, venda] of vendasPorSku) {
    const v = venda.qtd / RUPTURA_JANELA_VENDA_DIAS;
    if (v < RUPTURA_VELOCIDADE_MIN) continue;

    const settings = invByKey.get(key);
    const synced = stockByKey.get(key);
    // Sem número de estoque (nem sincronizado nem digitado) não dá pra dizer
    // que rompe — não alerta com base num zero-default.
    if (!synced && (settings?.stock_units == null || !settings.stock_updated_at)) continue;

    const manualAt = settings?.stock_updated_at ? new Date(settings.stock_updated_at).getTime() : 0;
    const syncedAt = synced?.synced_at ? new Date(synced.synced_at).getTime() : 0;
    const usaSync = !!synced && (manualAt === 0 || syncedAt >= manualAt);
    const stock = usaSync ? Number(synced!.stock_units) || 0 : Number(settings?.stock_units) || 0;

    const disponivel = stock + (transitByKey.get(key) ?? 0);
    const cobertura = disponivel / v;
    const leadTime = Number(settings?.lead_time_days) || LEAD_TIME_PADRAO;

    if (cobertura <= leadTime) rompendo.push({ nome: venda.nome, dias: Math.max(0, Math.floor(cobertura)) });
  }
  if (rompendo.length === 0) return null;

  rompendo.sort((a, b) => a.dias - b.dias);
  const top = rompendo.slice(0, 3).map((r) => `${r.nome} (${r.dias}d)`).join(", ");
  const resto = rompendo.length > 3 ? ` e mais ${rompendo.length - 3}` : "";

  return {
    title: `${rompendo.length} ${rompendo.length === 1 ? "produto vai" : "produtos vão"} acabar antes de repor`,
    body:
      `Pelo ritmo de venda dos últimos ${RUPTURA_JANELA_VENDA_DIAS} dias, ${rompendo.length === 1 ? "esse produto zera" : "esses produtos zeram"} ` +
      `o estoque antes de um novo pedido ao fornecedor chegar: ${top}${resto}. ` +
      `Veja quanto pedir e o que cabe no caixa em Reposição de estoque.`,
  };
}

async function jaAlertou(supabase: SupabaseClient, userId: string, title: string): Promise<boolean> {
  const desde = new Date(Date.now() - DEDUP_DIAS * 86_400_000).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", "alert")
    .eq("title", title)
    .contains("target_user_ids", [userId])
    .gte("created_at", desde)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function publicar(supabase: SupabaseClient, userId: string, a: Alerta) {
  await supabase.from("notifications").insert({
    title: a.title,
    body: a.body,
    type: "alert",
    target_type: "specific",
    target_user_ids: [userId],
    created_by: null,
  });
}

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const CRON_SECRET = Deno.env.get("INTEGRATION_SYNC_CRON_SECRET") ?? "";
    if (!CRON_SECRET || typeof body?.cron_secret !== "string" || !timingSafeEqual(body.cron_secret, CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles } = await supabase.from("profiles").select("id, plan, trial_ends_at");
    const ativos = (profiles ?? []).filter((p) => {
      if (PAID_PLANS.includes(p.plan)) return true;
      if (p.plan === "trial" && p.trial_ends_at) return new Date(p.trial_ends_at).getTime() > Date.now();
      return false;
    });

    let alertas = 0;
    for (const p of ativos) {
      try {
        const checks = await Promise.all([checarCaixa(supabase, p.id), checarRuptura(supabase, p.id)]);
        for (const a of checks) {
          if (!a) continue;
          if (await jaAlertou(supabase, p.id, a.title)) continue;
          await publicar(supabase, p.id, a);
          alertas++;
        }
      } catch (e) {
        console.error(`finn-alerts: erro no usuário ${p.id}:`, e);
      }
    }

    console.log(`finn-alerts: ${ativos.length} usuários, ${alertas} alertas criados`);
    return new Response(JSON.stringify({ usuarios: ativos.length, alertas }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("finn-alerts erro:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
  }
});
