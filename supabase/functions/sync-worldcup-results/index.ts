import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type PublicMatchResult = {
  match_id?: string;
  matchId?: string;
  home_goals?: number;
  homeGoals?: number;
  away_goals?: number;
  awayGoals?: number;
  status?: string;
  source_url?: string;
  sourceUrl?: string;
  external_match_key?: string;
  externalMatchKey?: string;
};

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
  if (["finished", "final", "ft", "completed", "fulltime"].includes(clean)) return "finished";
  if (["live", "in_progress", "playing"].includes(clean)) return "live";
  if (["postponed"].includes(clean)) return "postponed";
  if (["cancelled", "canceled"].includes(clean)) return "cancelled";
  return "scheduled";
}

async function fetchPublicResults(): Promise<PublicMatchResult[]> {
  const endpoint = Deno.env.get("RESULTS_PUBLIC_JSON_URL");

  if (!endpoint) return [];

  const res = await fetch(endpoint, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Zambranada-WorldCup-Results-Sync/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Fuente pública respondió HTTP ${res.status}`);
  }

  const payload = await res.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.matches)) return payload.matches;
  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let runId: string | null = null;

  const { data: run } = await supabase
    .from("result_sync_runs")
    .insert({
      source: Deno.env.get("RESULTS_PUBLIC_JSON_URL") || "not-configured",
      status: "started",
      message: "Sincronización iniciada"
    })
    .select("id")
    .single();

  runId = run?.id || null;

  try {
    const publicResults = await fetchPublicResults();
    let updated = 0;

    for (const item of publicResults) {
      const matchId = item.match_id || item.matchId;
      if (!matchId) continue;

      const homeGoals = item.home_goals ?? item.homeGoals;
      const awayGoals = item.away_goals ?? item.awayGoals;

      if (homeGoals == null || awayGoals == null) continue;

      const { error } = await supabase
        .from("match_results")
        .upsert({
          match_id: matchId,
          home_goals: Number(homeGoals),
          away_goals: Number(awayGoals),
          status: normalizeStatus(item.status || "finished"),
          source: "public-auto-sync",
          source_url: item.source_url || item.sourceUrl || Deno.env.get("RESULTS_PUBLIC_JSON_URL") || null,
          external_match_key: item.external_match_key || item.externalMatchKey || null,
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "match_id" });

      if (error) throw error;
      updated += 1;
    }

    const { error: rpcError } = await supabase.rpc("recalculate_phase1_scores");
    if (rpcError) throw rpcError;

    const message = publicResults.length
      ? `Sincronización completada. Resultados procesados: ${updated}.`
      : "Sin fuente pública configurada o sin resultados nuevos. Puntajes recalculados con datos existentes.";

    if (runId) {
      await supabase
        .from("result_sync_runs")
        .update({ status: publicResults.length ? "success" : "partial", matches_updated: updated, message })
        .eq("id", runId);
    }

    return json({ ok: true, matches_updated: updated, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("result_sync_runs")
        .update({ status: "failed", message })
        .eq("id", runId);
    }
    return json({ ok: false, error: message }, 500);
  }
});
