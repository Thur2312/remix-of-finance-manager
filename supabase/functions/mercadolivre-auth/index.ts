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

    // Gera um state curto e salva o token no Supabase temporariamente
    const stateId = crypto.randomUUID();

    // Salva o mapeamento state -> token no banco
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("integration_connections").upsert({
      user_id: stateId, // temporário
      provider: "mercadolivre_pending",
      access_token: userToken, // guarda o JWT aqui temporariamente
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

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