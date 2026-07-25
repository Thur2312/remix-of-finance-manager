import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; 


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")?.trim();
    const REDIRECT_URI = Deno.env.get("ML_REDIRECT_URI")?.trim();

    if (!CLIENT_ID || !REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "Mercado Livre env vars não configuradas" }),
        { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    // Gera um state opaco de uso único, mapeado para o usuário no banco —
    // antes essa linha guardava o JWT completo do usuário em texto puro numa
    // linha "pending" que nunca era lida de volta (código morto e um vazamento
    // de token gratuito). Agora só um UUID sem valor nenhum fora de contexto
    // trafega pela URL, e o mapeamento real fica em oauth_state.
    const stateId = crypto.randomUUID();

    await supabase
      .from("oauth_state")
      .delete()
      .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    const { error: stateError } = await supabase
      .from("oauth_state")
      .insert({ state: stateId, user_id: user.id, provider: "mercadolivre" });

    if (stateError) {
      return new Response(
        JSON.stringify({ error: "Erro interno na ML Auth" }),
        { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const authorization_url =
      `https://auth.mercadolivre.com.br/authorization?response_type=code` +
      `&client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${stateId}`;
       // só o UUID curto
    console.log("ML authorization_url:", authorization_url);

    return new Response(
      JSON.stringify({ authorization_url }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro na ML Auth:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno na ML Auth" }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }
});