import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fallback restritivo (não libera geral) pra plano sem linha em
// plan_permissions -- cobre "cancelado" e os planos legados da era Stripe
// (starter/profissional), que não têm cliente ativo hoje mas ainda existem
// na tabela.
const DEFAULT_LIMIT = 1;

export type MarketplaceLimitResult =
  | { allowed: true }
  | { allowed: false; limit: number; current: number };

/**
 * Reconectar uma loja que já tem linha em integration_connections nunca
 * conta como conta nova -- só barra quando o external_shop_id é inédito pro
 * par (user_id, provider) e isso estouraria o limite do plano. Linhas com
 * status 'disconnected' não ocupam vaga (o disconnect só muda o status, não
 * apaga a linha -- ver integration-disconnect).
 */
export async function checkMarketplaceAccountLimit(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  userId: string,
  provider: string,
  externalShopId: string,
): Promise<MarketplaceLimitResult> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  const plan = profile?.plan ?? "trial";

  const { data: permission } = await supabaseAdmin
    .from("plan_permissions")
    .select("limit_value")
    .eq("plan", plan)
    .eq("permission", "contas_por_marketplace")
    .maybeSingle();

  const limit = typeof permission?.limit_value === "number" ? permission.limit_value : DEFAULT_LIMIT;

  const { data: existing } = await supabaseAdmin
    .from("integration_connections")
    .select("external_shop_id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .neq("status", "disconnected");

  const distinctShopIds = new Set<string>((existing ?? []).map((r: { external_shop_id: string }) => r.external_shop_id));

  if (distinctShopIds.has(externalShopId)) return { allowed: true };
  if (distinctShopIds.size >= limit) return { allowed: false, limit, current: distinctShopIds.size };
  return { allowed: true };
}
