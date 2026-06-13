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

function normalizeStatus(status?: string) {
  const clean = String(status || "").toLowerCase();
  if (["finished", "final", "ft", "complete", "completed"].includes(clean)) return "finished";
  if (["live", "in_progress", "playing"].includes(clean)) return "live";
  if (["postponed"].includes(clean)) return "postponed";
  if (["cancelled", "canceled"].includes(clean)) return "cancelled";
  return "scheduled";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { adminParticipantId, matchId, homeGoals, awayGoals, status } = body;

    if (!adminParticipantId) return json({ ok: false, error: "Administrador requerido" }, 400);
    if (!matchId) return json({ ok: false, error: "Partido requerido" }, 400);

    const { data: admin, error: adminErr } = await supabase
      .from("participants")
      .select("id,role")
      .eq("id", adminParticipantId)
      .maybeSingle();

    if (adminErr) throw adminErr;
    if (!admin || admin.role !== "admin") {
      return json({ ok: false, error: "Solo el rol administrador puede registrar Score real" }, 403);
    }

    const parsedHome = homeGoals === "" || homeGoals == null ? null : Number(homeGoals);
    const parsedAway = awayGoals === "" || awayGoals == null ? null : Number(awayGoals);

    if ((parsedHome != null && (Number.isNaN(parsedHome) || parsedHome < 0 || parsedHome > 99)) ||
        (parsedAway != null && (Number.isNaN(parsedAway) || parsedAway < 0 || parsedAway > 99))) {
      return json({ ok: false, error: "Score inválido" }, 400);
    }

    const { error } = await supabase
      .from("match_results")
      .upsert({
        match_id: matchId,
        home_goals: parsedHome,
        away_goals: parsedAway,
        status: parsedHome == null || parsedAway == null ? "scheduled" : normalizeStatus(status || "finished"),
        source: "manual-admin",
        updated_at: new Date().toISOString(),
      }, { onConflict: "match_id" });

    if (error) throw error;

    const { error: rpcError } = await supabase.rpc("recalculate_phase1_scores");
    if (rpcError) throw rpcError;

    return json({ ok: true, message: "Score real guardado y puntajes recalculados" });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
