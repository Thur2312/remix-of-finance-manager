import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { passwordResetSchema, createValidationErrorResponse } from '../_shared/validation.ts';

// O caminho "email não existe" respondia quase instantaneamente (só a busca
// em profiles), enquanto "email existe" fazia generateLink + chamada HTTP ao
// Resend antes de responder — a diferença de tempo permitia enumerar contas
// cadastradas por timing attack. Todo retorno é nivelado a esse piso mínimo.
const MIN_RESPONSE_TIME_MS = 1200;

async function withMinDelay<T>(startTime: number, response: T): Promise<T> {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
  }
  return response;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  try {
    // ========== INPUT VALIDATION ==========
    const rawBody = await req.json();
    const validationResult = passwordResetSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error, corsHeaders);
    }
    
    const { email, redirectUrl } = validationResult.data;
    // ========== FIM INPUT VALIDATION ==========

    // Create Supabase client with service role to check if email exists
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      console.log("Email not found in profiles:", email);
      // Return success even if email doesn't exist (security best practice)
      return await withMinDelay(startTime, new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Generate password reset link using Supabase Auth
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw new Error("Erro ao gerar link de recuperação");
    }

    const resetLink = resetData.properties?.action_link;

    if (!resetLink) {
      throw new Error("Não foi possível gerar o link de recuperação");
    }

    // Send email using Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Seller Finance <no-reply@sellerfinance.com.br>",
        to: [email],
        subject: "Recuperação de Senha - Seller Finance",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #eef1f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 48px 20px;">
                  <table role="presentation" style="max-width: 480px; margin: 0 auto;">
                    <tr>
                      <td style="padding: 0 4px 24px 4px; text-align: left;">
                        <span style="font-size: 15px; font-weight: 700; color: #0A1628; letter-spacing: -0.01em;">Seller Finance</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e9f0; box-shadow: 0 1px 2px rgba(10,22,40,0.04), 0 12px 32px -12px rgba(10,22,40,0.12); overflow: hidden;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="height: 4px; background-color: #318EF1; font-size: 0; line-height: 0;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="padding: 40px 40px 8px 40px;">
                              <div style="width: 44px; height: 44px; border-radius: 12px; background-color: rgba(49,142,241,0.1); text-align: center; line-height: 44px; margin-bottom: 20px;">
                                <span style="font-size: 20px; line-height: 44px;">&#128274;</span>
                              </div>
                              <h1 style="margin: 0 0 10px 0; font-size: 21px; font-weight: 700; color: #0A1628; letter-spacing: -0.01em;">
                                Redefinir sua senha
                              </h1>
                              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 22px; color: #5b6472;">
                                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha — é rápido e seguro.
                              </p>
                              <table role="presentation" style="border-collapse: collapse;">
                                <tr>
                                  <td style="border-radius: 10px; background-color: #318EF1;">
                                    <a href="${resetLink}" style="display: inline-block; padding: 13px 28px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;">
                                      Redefinir senha →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 28px 40px 32px 40px; border-top: 1px solid #eef1f5;">
                              <p style="margin: 0 0 6px 0; font-size: 12.5px; line-height: 19px; color: #94a0b2;">
                                Não foi você? Pode ignorar este email com tranquilidade — sua senha continua a mesma.
                              </p>
                              <p style="margin: 0; font-size: 12.5px; line-height: 19px; color: #94a0b2;">
                                Este link expira em 24 horas.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 4px 0 4px; text-align: left;">
                        <p style="margin: 0; font-size: 12px; color: #a1a9b8;">
                          © 2025 Seller Finance. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Error sending email:", emailResult);
      throw new Error(emailResult.message || "Erro ao enviar email");
    }

    console.log("Email sent successfully:", emailResult);

    return await withMinDelay(startTime, new Response(
      JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    ));
  } catch (error: Error) {
    console.error("Error in send-password-reset function:", error);
    const corsHeaders = getCorsHeaders(req);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar solicitação";
    return await withMinDelay(startTime, new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    ));
  }
};

serve(handler);
