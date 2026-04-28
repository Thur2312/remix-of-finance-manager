import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FRONTEND_URL = "https://www.sellerfinance.com.br";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userToken = url.searchParams.get("token") ?? "";

  try {
    if (!code) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_code`, 302);
    }

    const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")?.trim();
    const CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")?.trim();
    const REDIRECT_URI = Deno.env.get("ML_REDIRECT_URI")?.trim(); 
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_env`, 302);
    }

    const redirectUsed = `${REDIRECT_URI}?provider=mercadolivre&token=${userToken}`;

    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: redirectUsed,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("ML token response:", tokenData);

    if (tokenData.error) {
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent(tokenData.error_description ?? tokenData.error)}`,
        302
      );
    }

    const { access_token, refresh_token, expires_in, user_id: mlUserId } = tokenData;

    // Busca o nickname da conta ML
    const profileRes = await fetch(`https://api.mercadolibre.com/users/${mlUserId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profileData = await profileRes.json();
    const shopName = profileData.nickname ?? profileData.first_name ?? "";

    // Valida o usuário do Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !user) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=unauthorized`, 302);
    }

    const now = new Date();
    const safeTokenExpiresAt = (expireSeconds: number | undefined | null): string | null => {
      if (!expireSeconds || expireSeconds <= 0) return null;
      const futureDate = new Date(now.getTime() + expireSeconds * 1000);
      return isNaN(futureDate.getTime()) ? null : futureDate.toISOString();
    };
    const { error: dbError } = await supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "mercadolivre",
          status: "connected",
          external_shop_id: String(mlUserId),
          shop_name: shopName,
          access_token,
          refresh_token,
          token_expires_at: safeTokenExpiresAt(expires_in),
          refresh_token_expires_at: null, 
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) {
      console.error("DB error:", dbError);
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro ao salvar integração")}`,
        302
      );
    }

    console.log("✅ Mercado Livre integrado com sucesso!", { mlUserId, shopName });

    return Response.redirect(`${FRONTEND_URL}/integrations?connected=mercadolivre`, 302);
  } catch (error) {
    console.error("ML Callback error:", error);
    return Response.redirect(
      `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro interno no callback")}`,
      302
    );
  }
});