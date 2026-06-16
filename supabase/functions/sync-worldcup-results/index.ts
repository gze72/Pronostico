import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIFA_CALENDAR_URL =
  Deno.env.get("FIFA_CALENDAR_URL") ||
  "https://api.fifa.com/api/v3/calendar/matches?language=es&count=500&idSeason=285023";

const GROUP_LETTER_MAP: Record<string, string> = {
  "Grupo A": "A",
  "Grupo B": "B",
  "Grupo C": "C",
  "Grupo D": "D",
  "Grupo E": "E",
  "Grupo F": "F",
  "Grupo G": "G",
  "Grupo H": "H",
  "Grupo I": "I",
  "Grupo J": "J",
  "Grupo K": "K",
  "Grupo L": "L"
};

type FifaMatch = {
  IdMatch: string;
  MatchNumber?: number;
  Date?: string;
  LocalDate?: string;
  GroupName?: Array<{ Locale: string; Description: string }>;
  Home?: {
    Score?: number;
    Abbreviation?: string;
    ShortClubName?: string;
    TeamName?: Array<{ Locale: string; Description: string }>;
  };
  Away?: {
    Score?: number;
    Abbreviation?: string;
    ShortClubName?: string;
    TeamName?: Array<{ Locale: string; Description: string }>;
  };
  HomeTeamScore?: number;
  AwayTeamScore?: number;
  MatchStatus?: number;
  ResultType?: number;
  MatchTime?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textOf(list?: Array<{ Locale: string; Description: string }>) {
  return list?.[0]?.Description || "";
}

function groupLetter(match: FifaMatch) {
  const groupName = textOf(match.GroupName);
  return GROUP_LETTER_MAP[groupName] || null;
}

function teamName(team?: FifaMatch["Home"]) {
  return textOf(team?.TeamName) || team?.ShortClubName || team?.Abbreviation || "";
}

function scoreHome(match: FifaMatch) {
  return match.HomeTeamScore ?? match.Home?.Score;
}

function scoreAway(match: FifaMatch) {
  return match.AwayTeamScore ?? match.Away?.Score;
}

function isCompleted(match: FifaMatch) {
  const h = scoreHome(match);
  const a = scoreAway(match);

  if (h == null || a == null) return false;

  // En el JSON FIFA validado, ResultType = 1 representa resultado publicable.
  if (match.ResultType === 1) return true;

  // Respaldo por tiempo de partido.
  const minutes = Number(String(match.MatchTime || "").replace(/[^0-9]/g, ""));
  return minutes >= 90;
}

function kickoffTime(match: FifaMatch) {
  return new Date(match.Date || match.LocalDate || "2100-01-01T00:00:00Z").getTime();
}

function buildGroupSlotMap(fifaMatches: FifaMatch[]) {
  const byGroup = new Map<string, FifaMatch[]>();

  for (const match of fifaMatches) {
    const g = groupLetter(match);
    if (!g) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(match);
  }

  const map = new Map<string, string>();

  for (const [g, matches] of byGroup.entries()) {
    matches.sort((a, b) => {
      const byNumber = Number(a.MatchNumber || 0) - Number(b.MatchNumber || 0);
      if (byNumber !== 0) return byNumber;
      return kickoffTime(a) - kickoffTime(b);
    });

    matches.forEach((match, index) => {
      map.set(String(match.IdMatch), `${g}${index + 1}`);
    });
  }

  return map;
}

async function assertAdmin(supabase: any, adminParticipantId: string | null) {
  if (!adminParticipantId) throw new Error("Administrador requerido");

  const { data, error } = await supabase
    .from("participants")
    .select("id,role")
    .eq("id", adminParticipantId)
    .maybeSingle();

  if (error) throw error;

  if (!data || data.role !== "admin") {
    throw new Error("Solo el rol administrador puede sincronizar resultados oficiales.");
  }
}

async function fetchFifaMatches() {
  const res = await fetch(FIFA_CALENDAR_URL, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Zambranada-Mundial-2026/1.0"
    }
  });

  if (!res.ok) throw new Error(`FIFA HTTP ${res.status}`);

  const payload = await res.json();
  return Array.isArray(payload?.Results) ? payload.Results as FifaMatch[] : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const adminParticipantId = body?.adminParticipantId || null;
    const debug = Boolean(body?.debug);

    await assertAdmin(supabase, adminParticipantId);

    const fifaMatches = await fetchFifaMatches();
    const slotMap = buildGroupSlotMap(fifaMatches);
    const completed = fifaMatches.filter(isCompleted);

    const updated: any[] = [];
    const skipped: any[] = [];

    for (const match of completed) {
      const matchId = slotMap.get(String(match.IdMatch));
      const h = scoreHome(match);
      const a = scoreAway(match);

      if (!matchId || h == null || a == null) {
        skipped.push({
          fifaId: match.IdMatch,
          matchNumber: match.MatchNumber,
          reason: "No se pudo mapear a slot interno",
          group: groupLetter(match),
          home: teamName(match.Home),
          away: teamName(match.Away)
        });
        continue;
      }

      const payload = {
        match_id: matchId,
        home_goals: Number(h),
        away_goals: Number(a),
        status: "finished",
        source: "fifa",
        source_url: FIFA_CALENDAR_URL,
        external_match_key: String(match.IdMatch),
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("match_results")
        .upsert(payload, { onConflict: "match_id" });

      if (error) {
        skipped.push({
          match_id: matchId,
          fifaId: match.IdMatch,
          reason: error.message
        });
        continue;
      }

      updated.push({
        match_id: matchId,
        fifa_id: match.IdMatch,
        match_number: match.MatchNumber,
        group: groupLetter(match),
        home: teamName(match.Home),
        away: teamName(match.Away),
        score: `${h}-${a}`
      });
    }

    let recalculated = false;
    let recalculateError = null;

    try {
      const { error } = await supabase.rpc("recalculate_phase1_scores");
      if (error) {
        recalculateError = error.message;
      } else {
        recalculated = true;
      }
    } catch (err) {
      recalculateError = err instanceof Error ? err.message : String(err);
    }

    return json({
      ok: true,
      source: "fifa",
      endpoint: FIFA_CALENDAR_URL,
      fifaMatches: fifaMatches.length,
      completedMatches: completed.length,
      updated: updated.length,
      skipped: skipped.length,
      recalculated,
      recalculateError,
      message: updated.length
        ? `Resultados oficiales sincronizados desde FIFA: ${updated.length}.`
        : "No se encontraron nuevos resultados oficiales para actualizar.",
      ...(debug ? { updatedRows: updated, skippedRows: skipped.slice(0, 50) } : {})
    });
  } catch (err) {
    console.error("sync-worldcup-results error", err);

    return json({
      ok: false,
      source: "fifa",
      error: err instanceof Error ? err.message : String(err),
      message: "No se pudo sincronizar resultados desde FIFA. Puede registrar el Score real manualmente."
    }, 500);
  }
});
