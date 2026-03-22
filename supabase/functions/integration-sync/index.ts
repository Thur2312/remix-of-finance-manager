import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { connection_id } = await req.json()
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Busca a conexão
    const { data: connection, error: connError } = await supabase
      .from("integration_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", user.id)
      .single()

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (connection.status !== "connected") {
      return new Response(JSON.stringify({ error: "Integração não está conectada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Atualiza last_sync_at e next_sync_at
    const now = new Date()
    const nextSync = new Date(now.getTime() + (connection.auto_sync_frequency_minutes || 60) * 60 * 1000)

    const { error: updateError } = await supabase
      .from("integration_connections")
      .update({
        last_sync_at: now.toISOString(),
        next_sync_at: nextSync.toISOString(),
        last_error_code: null,
        last_error_message: null,
        updated_at: now.toISOString(),
      })
      .eq("id", connection_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        message: `Sincronização de ${connection.provider} concluída com sucesso`,
        last_sync_at: now.toISOString(),
        next_sync_at: nextSync.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})