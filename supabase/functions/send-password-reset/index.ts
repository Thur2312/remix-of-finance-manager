import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { passwordResetSchema, createValidationErrorResponse } from '../_shared/validation.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

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
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
        from: "Seller Finance <onboarding@resend.dev>",
        to: [email],
        subject: "Recuperação de Senha - Seller Finance",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <div style="display: inline-block; padding: 12px 16px; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); border-radius: 12px; margin-bottom: 24px;">
                          <span style="font-size: 24px; font-weight: bold; color: #ffffff;">SF</span>
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #18181b;">
                          Recuperação de Senha
                        </h1>
                        <p style="margin: 0; font-size: 14px; color: #71717a;">
                          Seller Finance
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px;">
                        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #3f3f46;">
                          Olá,
                        </p>
                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #3f3f46;">
                          Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
                        </p>
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="text-align: center; padding: 8px 0 24px 0;">
                              <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                                Redefinir Senha
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 20px; color: #71717a;">
                          Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá a mesma.
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #71717a;">
                          Este link expira em 24 horas.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px 40px 40px; border-top: 1px solid #e4e4e7;">
                        <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
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

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado com sucesso!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar solicitação" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
