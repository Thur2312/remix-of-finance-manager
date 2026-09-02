import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface DeleteStep {
  table: string;
  run: () => Promise<{ error: { message: string } | null }>;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Mesmo padrão do asaas-cancel: nunca confiar em userId vindo do corpo
    // da requisição — o usuário é resolvido a partir do JWT já validado.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      throw new Error("Não autorizado.");
    }

    const userId = user.id;

    // Tabelas de negócio/marketplace que não têm user_id direto — dependem
    // de integration_connections / shopee_integrations / tiktok_integrations.
    const [{ data: connections }, { data: shopeeIntegrations }, { data: tiktokIntegrations }] =
      await Promise.all([
        supabase.from("integration_connections").select("id").eq("user_id", userId),
        supabase.from("shopee_integrations").select("id").eq("user_id", userId),
        supabase.from("tiktok_integrations").select("id, shop_id").eq("user_id", userId),
      ]);

    const connectionIds = (connections ?? []).map((c) => c.id);
    const shopeeIntegrationIds = (shopeeIntegrations ?? []).map((s) => s.id);
    const tiktokShopIds = (tiktokIntegrations ?? []).map((t) => t.shop_id).filter(Boolean);

    let orderIds: string[] = [];
    if (connectionIds.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("integration_id", connectionIds);
      orderIds = (orders ?? []).map((o) => o.id);
    }

    // Ordem: filhos antes dos pais, pra não esbarrar em foreign keys.
    const steps: DeleteStep[] = [
      {
        table: "order_items",
        run: () =>
          orderIds.length > 0
            ? supabase.from("order_items").delete().in("order_id", orderIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "fees",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("fees").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "payments",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("payments").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "payouts",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("payouts").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "shop_balances",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("shop_balances").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "shop_metrics",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("shop_metrics").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "orders",
        run: () =>
          connectionIds.length > 0
            ? supabase.from("orders").delete().in("integration_id", connectionIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "shopee_financial_transactions",
        run: () =>
          shopeeIntegrationIds.length > 0
            ? supabase.from("shopee_financial_transactions").delete().in("integration_id", shopeeIntegrationIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "shopee_orders",
        run: () =>
          shopeeIntegrationIds.length > 0
            ? supabase.from("shopee_orders").delete().in("integration_id", shopeeIntegrationIds)
            : Promise.resolve({ error: null }),
      },
      {
        table: "tiktok_financial_transactions",
        run: () =>
          tiktokShopIds.length > 0
            ? supabase.from("tiktok_financial_transactions").delete().in("shop_id", tiktokShopIds)
            : Promise.resolve({ error: null }),
      },
      { table: "integration_sync_logs", run: () => supabase.from("integration_sync_logs").delete().eq("user_id", userId) },
      { table: "integration_connections", run: () => supabase.from("integration_connections").delete().eq("user_id", userId) },
      { table: "shopee_integrations", run: () => supabase.from("shopee_integrations").delete().eq("user_id", userId) },
      { table: "tiktok_integrations", run: () => supabase.from("tiktok_integrations").delete().eq("user_id", userId) },
      { table: "integrations", run: () => supabase.from("integrations").delete().eq("user_id", userId) },
      { table: "ml_orders", run: () => supabase.from("ml_orders").delete().eq("user_id", userId) },
      { table: "ml_settings", run: () => supabase.from("ml_settings").delete().eq("user_id", userId) },
      { table: "anuncios", run: () => supabase.from("anuncios").delete().eq("user_id", userId) },
      { table: "product_costs", run: () => supabase.from("product_costs").delete().eq("user_id", userId) },
      { table: "custom_cost_categories", run: () => supabase.from("custom_cost_categories").delete().eq("user_id", userId) },
      { table: "fixed_costs", run: () => supabase.from("fixed_costs").delete().eq("user_id", userId) },
      { table: "fixed_costs_settings", run: () => supabase.from("fixed_costs_settings").delete().eq("user_id", userId) },
      // cash_flow_entries tem auto-referência (parent_entry_id) para lançamentos
      // recorrentes — apaga as instâncias filhas antes dos lançamentos-pai.
      {
        table: "cash_flow_entries (recorrências)",
        run: () => supabase.from("cash_flow_entries").delete().eq("user_id", userId).not("parent_entry_id", "is", null),
      },
      { table: "cash_flow_entries", run: () => supabase.from("cash_flow_entries").delete().eq("user_id", userId) },
      { table: "cash_flow_categories", run: () => supabase.from("cash_flow_categories").delete().eq("user_id", userId) },
      { table: "raw_orders", run: () => supabase.from("raw_orders").delete().eq("user_id", userId) },
      { table: "settings", run: () => supabase.from("settings").delete().eq("user_id", userId) },
      { table: "tiktok_orders", run: () => supabase.from("tiktok_orders").delete().eq("user_id", userId) },
      { table: "tiktok_settings", run: () => supabase.from("tiktok_settings").delete().eq("user_id", userId) },
      { table: "tiktok_settlements", run: () => supabase.from("tiktok_settlements").delete().eq("user_id", userId) },
      { table: "tiktok_statements", run: () => supabase.from("tiktok_statements").delete().eq("user_id", userId) },
      { table: "assistant_conversations", run: () => supabase.from("assistant_conversations").delete().eq("user_id", userId) },
      { table: "companies", run: () => supabase.from("companies").delete().eq("user_id", userId) },
    ];

    const failures: { table: string; message: string }[] = [];

    for (const step of steps) {
      const { error } = await step.run();
      if (error) {
        console.error(`delete-account-data: falha ao apagar ${step.table} para user ${userId}:`, error.message);
        failures.push({ table: step.table, message: error.message });
      }
    }

    if (failures.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          partial: true,
          message: "Alguns dados não puderam ser apagados. Tente novamente ou contate o suporte.",
          failures,
        }),
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
