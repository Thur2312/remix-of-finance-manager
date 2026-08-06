import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")?.trim();
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim();
    const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")?.trim();
    const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")?.trim(); // ✅ usa a env var

    if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
      return new Response(
        JSON.stringify({ error: "Shopee env vars não configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? ""
    const userToken = authHeader.replace("Bearer ", "")

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // O JWT do usuário nunca deve trafegar pela URL enviada à Shopee (fica em
    // logs de acesso deles, Referer headers e histórico do navegador). Em vez
    // disso, geramos um state opaco de uso único, mapeado para o usuário no
    // banco — a Shopee não devolve esse state de volta (ver comentário abaixo),
    // então quem reenvia ele pro callback é o front-end via sessionStorage.
    const state = crypto.randomUUID()

    // Limpeza oportunista de states abandonados (>30min) — não há scheduler
    // confiável rodando neste projeto para fazer isso de outra forma.
    await supabaseAdmin
      .from("oauth_state")
      .delete()
      .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())

    const { error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .insert({ state, user_id: user.id, provider: "shopee" })

    if (stateError) {
      console.error("Erro ao salvar oauth_state:", stateError)
      return new Response(
        JSON.stringify({ error: "Erro interno na Shopee Auth" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // A Shopee não tem um parâmetro "state" no auth_partner — o "redirect"
    // enviado precisa bater exatamente com a Redirect URL cadastrada no
    // Partner Center (valor fixo, sem query string variável). Grudar
    // "?state=" nele quebrava a autorização. O state vai só na resposta, pro
    // front-end guardar em sessionStorage e reenviar depois no callback.
    const partnerIdNum = parseInt(PARTNER_ID, 10);
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/auth_partner";
    const baseString = `${partnerIdNum}${path}${timestamp}`;

    const sign = createHmac("sha256", PARTNER_KEY)
      .update(baseString)
      .digest("hex");

    const authorization_url = `${BASE_URL}${path}?partner_id=${partnerIdNum}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT_URI)}`;

    return new Response(
      JSON.stringify({ authorization_url, state }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro na Shopee Auth:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno na Shopee Auth" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
