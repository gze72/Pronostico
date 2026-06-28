import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertAdmin(supabase: any, adminParticipantId: string) {
  if (!adminParticipantId) throw new Error("Administrador requerido");
  const { data, error } = await supabase
    .from("participants")
    .select("id,role")
    .eq("id", adminParticipantId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.role !== "admin") throw new Error("Solo el rol administrador puede ejecutar esta acción");
}

async function setSetting(supabase: any, key: string, value: boolean) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw error;
}

async function logAction(supabase: any, adminParticipantId: string, action: string, payload: Record<string, unknown>) {
  await supabase.from("admin_actions").insert({
    admin_participant_id: adminParticipantId,
    action,
    payload,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { adminParticipantId, action, value } = body;

    await assertAdmin(supabase, adminParticipantId);

    if (action === "set_registration_enabled") {
      await setSetting(supabase, "registration_enabled", Boolean(value));
      await logAction(supabase, adminParticipantId, action, { value: Boolean(value) });
      return json({ ok: true, message: Boolean(value) ? "Registro de nuevos usuarios habilitado" : "Registro de nuevos usuarios inhabilitado" });
    }

    if (action === "set_phase32_unlocked") {
      await setSetting(supabase, "phase32_predictions_unlocked", Boolean(value));
      await logAction(supabase, adminParticipantId, action, { value: Boolean(value) });
      return json({ ok: true, message: Boolean(value) ? "Pronóstico 16° habilitado por ADMIN" : "Pronóstico 16° bloqueado por ADMIN" });
    }

    if (action === "lock_all_predictions") {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("forecasts")
        .update({ confirmed: true, status: "confirmed", confirmed_at: now })
        .neq("status", "confirmed");

      if (error) throw error;

      await setSetting(supabase, "phase1_predictions_locked", true);

      const { error: rpcError } = await supabase.rpc("recalculate_phase1_scores");
      if (rpcError) throw rpcError;

      await logAction(supabase, adminParticipantId, action, { locked: true });
      return json({ ok: true, message: "Todos los pronósticos fueron bloqueados como CONFIRMADOS" });
    }

    if (action === "unlock_all_predictions") {
      const { error } = await supabase
        .from("forecasts")
        .update({ confirmed: false, status: "draft", confirmed_at: null });

      if (error) throw error;

      await setSetting(supabase, "phase1_predictions_locked", false);
      await logAction(supabase, adminParticipantId, action, { locked: false });

      return json({ ok: true, message: "Todos los usuarios fueron habilitados para pronosticar nuevamente" });
    }

    return json({ ok: false, error: "Acción administrativa no reconocida" }, 400);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
