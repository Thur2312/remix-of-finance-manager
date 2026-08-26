import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"

// Segmentos pré-definidos — resolvidos pra uma lista concreta de user_ids no
// momento da criação (não é uma query dinâmica que se atualiza depois).
// Adicionar um segmento novo é só adicionar uma entrada aqui.
const SEGMENT_QUERIES: Record<string, { table: string; filters: Record<string, string> }> = {
  shopee_connected: { table: "integration_connections", filters: { provider: "shopee", status: "connected" } },
  tiktok_connected: { table: "integration_connections", filters: { provider: "tiktok", status: "connected" } },
  mercadolivre_connected: { table: "integration_connections", filters: { provider: "mercadolivre", status: "connected" } },
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // is_admin é checado aqui (servidor, com service_role) — não confiar em
    // nada que venha do client pra decidir isso. RLS em `notifications`
    // também exige is_admin pro insert, então mesmo se esse check falhasse
    // a gravação seria recusada; isso é defesa em profundidade.
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem criar avisos" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const body = await req.json()
    const { title, body: message, type, targetType, segment, emails } = body as {
      title?: string
      body?: string
      type?: string
      targetType?: "all" | "segment" | "emails"
      segment?: string
      emails?: string[]
    }

    if (!title?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "Título e mensagem são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const VALID_TYPES = ["feature", "fix", "alert", "info"]
    const notificationType = VALID_TYPES.includes(type || "") ? type : "info"

    let dbTargetType: "all" | "specific" = "all"
    let targetUserIds: string[] | null = null
    let notFoundEmails: string[] = []

    if (targetType === "segment") {
      const seg = segment ? SEGMENT_QUERIES[segment] : null
      if (!seg) {
        return new Response(JSON.stringify({ error: "Segmento inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
      let query = supabaseAdmin.from(seg.table).select("user_id")
      for (const [col, val] of Object.entries(seg.filters)) query = query.eq(col, val)
      const { data: rows, error: segError } = await query
      if (segError) throw segError
      const uniqueIds = Array.from(new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)))
      dbTargetType = "specific"
      targetUserIds = uniqueIds
    } else if (targetType === "emails") {
      const cleanEmails = (emails ?? []).map(e => e.trim().toLowerCase()).filter(Boolean)
      if (cleanEmails.length === 0) {
        return new Response(JSON.stringify({ error: "Informe ao menos um e-mail" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
      const { data: rows, error: emailError } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("email", cleanEmails)
      if (emailError) throw emailError
      const foundEmails = new Set((rows ?? []).map((r: { email: string }) => r.email?.toLowerCase()))
      notFoundEmails = cleanEmails.filter(e => !foundEmails.has(e))
      dbTargetType = "specific"
      targetUserIds = (rows ?? []).map((r: { id: string }) => r.id)
    }
    // targetType === "all" (ou ausente) mantém dbTargetType = "all"

    const { data: created, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        title: title.trim(),
        body: message.trim(),
        type: notificationType,
        target_type: dbTargetType,
        target_user_ids: targetUserIds,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({
        id: created.id,
        recipientCount: dbTargetType === "all" ? null : (targetUserIds?.length ?? 0),
        notFoundEmails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
