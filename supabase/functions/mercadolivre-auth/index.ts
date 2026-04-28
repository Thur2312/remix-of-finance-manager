import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const REDIRECT_URI = Deno.env.get("ML_REDIRECT_URI")?.trim(); // https://www.sellerfinance.com.br/callback

    if (!CLIENT_ID || !REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "Mercado Livre env vars não configuradas" }),
        { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");

    // ✅ Embute provider e token no redirect_uri para o IntegrationCallback identificar
    const redirectWithParams = `${REDIRECT_URI}?provider=mercadolivre&token=${userToken}`;

    const authorization_url =
      `https://auth.mercadolivre.com.br/authorization?response_type=code` +
      `&client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectWithParams)}`;

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
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      }
    );
  }
});