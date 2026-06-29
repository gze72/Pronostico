// Fix 10 Brazil Japan final score sync: do not protect old manual-fix sources; update FIFA final scores.
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
  "Grupo A": "A", "Grupo B": "B", "Grupo C": "C", "Grupo D": "D",
  "Grupo E": "E", "Grupo F": "F", "Grupo G": "G", "Grupo H": "H",
  "Grupo I": "I", "Grupo J": "J", "Grupo K": "K", "Grupo L": "L"
};

const TEAM_CODE_MAP: Record<string, string> = {
  MEX:"MEX", RSA:"RSA", KOR:"KOR", CZE:"CZE", CAN:"CAN", BIH:"BIH", QAT:"QAT", SUI:"SUI",
  BRA:"BRA", MAR:"MAR", HAI:"HAI", SCO:"SCO", USA:"USA", PAR:"PAR", AUS:"AUS", TUR:"TUR",
  GER:"GER", CUW:"CUW", CIV:"CIV", ECU:"ECU", NED:"NED", JPN:"JPN", SWE:"SWE", TUN:"TUN",
  BEL:"BEL", EGY:"EGY", IRN:"IRN", NZL:"NZL", ESP:"ESP", CPV:"CPV", KSA:"KSA", URU:"URU",
  FRA:"FRA", SEN:"SEN", IRQ:"IRQ", NOR:"NOR", ARG:"ARG", ALG:"ALG", AUT:"AUT", JOR:"JOR",
  POR:"POR", COD:"COD", UZB:"UZB", COL:"COL", ENG:"ENG", CRO:"CRO", GHA:"GHA", PAN:"PAN"
};

const PHASE1_MATCH_MAP: Record<string, string> = {
  "A|MEX|RSA":"A1", "A|KOR|CZE":"A2", "A|MEX|KOR":"A3", "A|CZE|RSA":"A4", "A|CZE|MEX":"A5", "A|RSA|KOR":"A6",
  "B|CAN|BIH":"B1", "B|QAT|SUI":"B2", "B|CAN|QAT":"B3", "B|SUI|BIH":"B4", "B|SUI|CAN":"B5", "B|BIH|QAT":"B6",
  "C|BRA|MAR":"C1", "C|HAI|SCO":"C2", "C|BRA|HAI":"C3", "C|SCO|MAR":"C4", "C|SCO|BRA":"C5", "C|MAR|HAI":"C6",
  "D|USA|PAR":"D1", "D|AUS|TUR":"D2", "D|USA|AUS":"D3", "D|TUR|PAR":"D4", "D|TUR|USA":"D5", "D|PAR|AUS":"D6",
  "E|GER|CUW":"E1", "E|CIV|ECU":"E2", "E|GER|CIV":"E3", "E|ECU|CUW":"E4", "E|ECU|GER":"E5", "E|CUW|CIV":"E6",
  "F|NED|JPN":"F1", "F|SWE|TUN":"F2", "F|NED|SWE":"F3", "F|TUN|JPN":"F4", "F|TUN|NED":"F5", "F|JPN|SWE":"F6",
  "G|BEL|EGY":"G1", "G|IRN|NZL":"G2", "G|BEL|IRN":"G3", "G|NZL|EGY":"G4", "G|NZL|BEL":"G5", "G|EGY|IRN":"G6",
  "H|ESP|CPV":"H1", "H|KSA|URU":"H2", "H|ESP|KSA":"H3", "H|URU|CPV":"H4", "H|URU|ESP":"H5", "H|CPV|KSA":"H6",
  "I|FRA|SEN":"I1", "I|IRQ|NOR":"I2", "I|FRA|IRQ":"I3", "I|NOR|SEN":"I4", "I|NOR|FRA":"I5", "I|SEN|IRQ":"I6",
  "J|ARG|ALG":"J1", "J|AUT|JOR":"J2", "J|ARG|AUT":"J3", "J|JOR|ALG":"J4", "J|JOR|ARG":"J5", "J|ALG|AUT":"J6",
  "K|POR|COD":"K1", "K|UZB|COL":"K2", "K|POR|UZB":"K3", "K|COL|COD":"K4", "K|COL|POR":"K5", "K|COD|UZB":"K6",
  "L|ENG|CRO":"L1", "L|GHA|PAN":"L2", "L|ENG|GHA":"L3", "L|PAN|CRO":"L4", "L|PAN|ENG":"L5", "L|CRO|GHA":"L6"
};

const PHASE32_MATCH_MAP: Record<string, { id: string; home: string; away: string }> = {
  "RSA|CAN": { id:"R32-01", home:"RSA", away:"CAN" }, "CAN|RSA": { id:"R32-01", home:"RSA", away:"CAN" },
  "BRA|JPN": { id:"R32-02", home:"BRA", away:"JPN" }, "JPN|BRA": { id:"R32-02", home:"BRA", away:"JPN" },
  "GER|PAR": { id:"R32-03", home:"GER", away:"PAR" }, "PAR|GER": { id:"R32-03", home:"GER", away:"PAR" },
  "NED|MAR": { id:"R32-04", home:"NED", away:"MAR" }, "MAR|NED": { id:"R32-04", home:"NED", away:"MAR" },
  "FRA|SWE": { id:"R32-05", home:"FRA", away:"SWE" }, "SWE|FRA": { id:"R32-05", home:"FRA", away:"SWE" },
  "ESP|AUT": { id:"R32-06", home:"ESP", away:"AUT" }, "AUT|ESP": { id:"R32-06", home:"ESP", away:"AUT" },
  "USA|BIH": { id:"R32-07", home:"USA", away:"BIH" }, "BIH|USA": { id:"R32-07", home:"USA", away:"BIH" },
  "ENG|COD": { id:"R32-08", home:"ENG", away:"COD" }, "COD|ENG": { id:"R32-08", home:"ENG", away:"COD" },
  "BEL|SEN": { id:"R32-09", home:"BEL", away:"SEN" }, "SEN|BEL": { id:"R32-09", home:"BEL", away:"SEN" },
  "CIV|NOR": { id:"R32-10", home:"CIV", away:"NOR" }, "NOR|CIV": { id:"R32-10", home:"CIV", away:"NOR" },
  "MEX|ECU": { id:"R32-11", home:"ECU", away:"MEX" }, "ECU|MEX": { id:"R32-11", home:"ECU", away:"MEX" },
  "POR|CRO": { id:"R32-12", home:"POR", away:"CRO" }, "CRO|POR": { id:"R32-12", home:"POR", away:"CRO" },
  "SUI|ALG": { id:"R32-13", home:"SUI", away:"ALG" }, "ALG|SUI": { id:"R32-13", home:"SUI", away:"ALG" },
  "AUS|EGY": { id:"R32-14", home:"AUS", away:"EGY" }, "EGY|AUS": { id:"R32-14", home:"AUS", away:"EGY" },
  "ARG|CPV": { id:"R32-15", home:"ARG", away:"CPV" }, "CPV|ARG": { id:"R32-15", home:"ARG", away:"CPV" },
  "COL|GHA": { id:"R32-16", home:"COL", away:"GHA" }, "GHA|COL": { id:"R32-16", home:"COL", away:"GHA" }
};

type FifaMatch = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textOf(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0]?.Description || value[0]?.Name || value[0]?.Text || "";
  return value.Description || value.Name || value.Text || "";
}

function stageName(match: FifaMatch) {
  return textOf(match.StageName) || textOf(match.Stage) || textOf(match.PhaseName) || textOf(match.RoundName) || textOf(match.CompetitionStage) || "";
}

function groupLetter(match: FifaMatch) {
  return GROUP_LETTER_MAP[textOf(match.GroupName)] || null;
}

function normalizeTeamCode(code?: string) {
  if (!code) return null;
  const key = String(code).toUpperCase();
  return TEAM_CODE_MAP[key] || key;
}

function homeCode(match: FifaMatch) {
  return normalizeTeamCode(match.Home?.Abbreviation || match.Home?.IdCountry || match.HomeTeam?.Abbreviation || match.HomeTeam?.IdCountry);
}

function awayCode(match: FifaMatch) {
  return normalizeTeamCode(match.Away?.Abbreviation || match.Away?.IdCountry || match.AwayTeam?.Abbreviation || match.AwayTeam?.IdCountry);
}

function scoreHome(match: FifaMatch) { return match.HomeTeamScore ?? match.Home?.Score ?? match.HomeScore; }
function scoreAway(match: FifaMatch) { return match.AwayTeamScore ?? match.Away?.Score ?? match.AwayScore; }
function penaltyHome(match: FifaMatch) { return match.HomeTeamPenaltyScore ?? match.HomePenaltyScore ?? match.Home?.PenaltyScore ?? match.PenaltyScoreHome; }
function penaltyAway(match: FifaMatch) { return match.AwayTeamPenaltyScore ?? match.AwayPenaltyScore ?? match.Away?.PenaltyScore ?? match.PenaltyScoreAway; }
function hasScore(match: FifaMatch) { return scoreHome(match) != null && scoreAway(match) != null; }

function kickoffTime(match: FifaMatch) {
  const value = match.Date || match.LocalDate || match.MatchDate || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isFuture(match: FifaMatch) {
  const t = kickoffTime(match);
  return t ? t > Date.now() : false;
}

function minutesPlayed(match: FifaMatch) {
  return Number(String(match.MatchTime || "").replace(/[^0-9]/g, ""));
}

function isFinal(match: FifaMatch) {
  if (!hasScore(match) || isFuture(match)) return false;
  if (match.ResultType === 1) return true;

  const status = String(match.MatchStatusName || match.StatusName || match.MatchStatus || match.Status || "").toLowerCase();
  if (status.includes("final") || status.includes("termin") || status.includes("completed")) return true;

  return minutesPlayed(match) >= 90;
}

function isManualAdminScore(row: any) {
  const source = String(row?.source || "").toLowerCase();
  return source === "manual-admin" || source.includes("manual-admin") || source.includes("admin-final");
}

function hasStoredScore(row: any) {
  return row && row.home_goals != null && row.away_goals != null;
}

function isAutoScore(row: any) {
  if (!row || isManualAdminScore(row)) return false;
  const source = String(row.source || "").toLowerCase();
  return source.includes("fifa") || source.includes("auto") || source.includes("sync") || source === "";
}

function phase1Key(match: FifaMatch) {
  const g = groupLetter(match);
  const h = homeCode(match);
  const a = awayCode(match);
  return g && h && a ? `${g}|${h}|${a}` : null;
}

function phase32Key(match: FifaMatch) {
  const h = homeCode(match);
  const a = awayCode(match);
  return h && a ? `${h}|${a}` : null;
}

function phase32Internal(match: FifaMatch) {
  const key = phase32Key(match);
  return key ? PHASE32_MATCH_MAP[key] : null;
}

function phase32NormalizedScore(match: FifaMatch, internal: { id: string; home: string; away: string }) {
  const hCode = homeCode(match);
  const h = scoreHome(match);
  const a = scoreAway(match);
  if (h == null || a == null) return { homeGoals: null, awayGoals: null };
  return hCode === internal.home
    ? { homeGoals: Number(h), awayGoals: Number(a) }
    : { homeGoals: Number(a), awayGoals: Number(h) };
}

function isPhase32(match: FifaMatch) {
  const stage = stageName(match).toLowerCase();
  const key = phase32Key(match) || "";
  return stage.includes("dieciseis") || stage.includes("round of 32") || Boolean(PHASE32_MATCH_MAP[key]);
}

function phase32PenaltyWinner(match: FifaMatch) {
  const ph = penaltyHome(match);
  const pa = penaltyAway(match);
  if (ph != null && pa != null && Number(ph) !== Number(pa)) return Number(ph) > Number(pa) ? homeCode(match) : awayCode(match);
  return null;
}

async function fetchFifaMatches() {
  const res = await fetch(FIFA_CALENDAR_URL, {
    headers: { "Accept": "application/json", "User-Agent": "Zambranada-Mundial-2026/1.0" }
  });

  if (!res.ok) throw new Error(`FIFA HTTP ${res.status}`);

  const payload = await res.json();
  return Array.isArray(payload?.Results) ? payload.Results as FifaMatch[] : [];
}

async function loadMap(supabase: any, table: string) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;

  const map = new Map<string, any>();
  for (const row of data || []) map.set(String(row.match_id), row);
  return map;
}

async function assertAdmin(supabase: any, adminParticipantId: string | null) {
  if (!adminParticipantId) return { ok: true, mode: "frontend-without-admin-id" };

  const { data, error } = await supabase
    .from("participants")
    .select("id,role")
    .eq("id", adminParticipantId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.role !== "admin") throw new Error("Solo el rol administrador puede sincronizar resultados oficiales.");

  return { ok: true, mode: "admin-validated" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 200);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const debug = Boolean(body?.debug);
    const adminCheck = await assertAdmin(supabase, body?.adminParticipantId || null);

    const fifaMatches = await fetchFifaMatches();
    const phase1Existing = await loadMap(supabase, "match_results");
    const phase32Existing = await loadMap(supabase, "phase32_results");

    const phase1Updated: any[] = [];
    const phase1Cleared: any[] = [];
    const phase1Protected: any[] = [];
    const phase32Updated: any[] = [];
    const phase32Cleared: any[] = [];
    const phase32Protected: any[] = [];
    const skipped: any[] = [];

    for (const match of fifaMatches) {
      const h = scoreHome(match);
      const a = scoreAway(match);
      const final = isFinal(match);
      const p32 = phase32Internal(match);
      const p32Id = p32?.id;

      if (isPhase32(match) && p32Id) {
        const existing = phase32Existing.get(p32Id);

        if (!final) {
          if (hasStoredScore(existing) && isManualAdminScore(existing)) {
            phase32Protected.push({ match_id: p32Id, reason: "manual/admin protegido" });
          } else if (hasScore(match) && p32 && !isFuture(match)) {
            const normalized = phase32NormalizedScore(match, p32);
            const { error } = await supabase.from("phase32_results").upsert({
              match_id: p32Id,
              home_goals: normalized.homeGoals,
              away_goals: normalized.awayGoals,
              went_penalties: false,
              penalty_winner: null,
              status: "live",
              source: "fifa-live",
              source_url: FIFA_CALENDAR_URL,
              external_match_key: String(match.IdMatch),
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: "match_id" });

            if (error) skipped.push({ phase: "phase32", match_id: p32Id, error: error.message });
            else phase32Updated.push({ match_id: p32Id, key: phase32Key(match), status: "live" });
          } else if (hasStoredScore(existing) && isAutoScore(existing)) {
            const { error } = await supabase.from("phase32_results").upsert({
              match_id: p32Id,
              home_goals: null,
              away_goals: null,
              went_penalties: false,
              penalty_winner: null,
              status: "scheduled",
              source: "fifa-auto-cleared",
              source_url: FIFA_CALENDAR_URL,
              external_match_key: String(match.IdMatch),
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: "match_id" });

            if (error) skipped.push({ phase: "phase32", match_id: p32Id, error: error.message });
            else phase32Cleared.push({ match_id: p32Id });
          }
          continue;
        }

        if (h == null || a == null) continue;

        if (hasStoredScore(existing) && isManualAdminScore(existing)) {
          phase32Protected.push({ match_id: p32Id, reason: "manual/admin protegido" });
          continue;
        }

        const normalized = p32 ? phase32NormalizedScore(match, p32) : { homeGoals: Number(h), awayGoals: Number(a) };
        const wentPenalties = normalized.homeGoals === normalized.awayGoals && (penaltyHome(match) != null || penaltyAway(match) != null);
        const penaltyWinner = wentPenalties ? phase32PenaltyWinner(match) : null;

        const { error } = await supabase.from("phase32_results").upsert({
          match_id: p32Id,
          home_goals: normalized.homeGoals,
          away_goals: normalized.awayGoals,
          went_penalties: wentPenalties,
          penalty_winner: penaltyWinner,
          status: "finished",
          source: "fifa",
          source_url: FIFA_CALENDAR_URL,
          external_match_key: String(match.IdMatch),
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "match_id" });

        if (error) skipped.push({ phase: "phase32", match_id: p32Id, error: error.message });
        else phase32Updated.push({
          match_id: p32Id,
          key: phase32Key(match),
          score: `${normalized.homeGoals}-${normalized.awayGoals}`,
          penalties: wentPenalties ? `${penaltyHome(match)}-${penaltyAway(match)}` : null,
          penaltyWinner
        });
        continue;
      }

      const p1key = phase1Key(match);
      const p1Id = p1key ? PHASE1_MATCH_MAP[p1key] : null;

      if (!p1Id) {
        if (debug && (hasScore(match) || isPhase32(match))) {
          skipped.push({ key: p1key || phase32Key(match), stage: stageName(match), reason: "Sin mapeo interno" });
        }
        continue;
      }

      const existing = phase1Existing.get(p1Id);

      if (!final) {
        if (hasStoredScore(existing) && isManualAdminScore(existing)) {
          phase1Protected.push({ match_id: p1Id });
        } else if (hasStoredScore(existing) && isAutoScore(existing)) {
          const { error } = await supabase.from("match_results").upsert({
            match_id: p1Id,
            home_goals: null,
            away_goals: null,
            status: "scheduled",
            source: "fifa-auto-cleared",
            source_url: FIFA_CALENDAR_URL,
            external_match_key: String(match.IdMatch),
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: "match_id" });

          if (error) skipped.push({ phase: "phase1", match_id: p1Id, error: error.message });
          else phase1Cleared.push({ match_id: p1Id });
        }
        continue;
      }

      if (h == null || a == null) continue;

      if (hasStoredScore(existing) && isManualAdminScore(existing)) {
        phase1Protected.push({ match_id: p1Id });
        continue;
      }

      const { error } = await supabase.from("match_results").upsert({
        match_id: p1Id,
        home_goals: Number(h),
        away_goals: Number(a),
        status: "finished",
        source: "fifa",
        source_url: FIFA_CALENDAR_URL,
        external_match_key: String(match.IdMatch),
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "match_id" });

      if (error) skipped.push({ phase: "phase1", match_id: p1Id, error: error.message });
      else phase1Updated.push({ match_id: p1Id });
    }

    let recalculated = false;
    let recalculateError = null;

    if (phase1Updated.length || phase1Cleared.length) {
      try {
        const { error } = await supabase.rpc("recalculate_phase1_scores");
        if (error) recalculateError = error.message;
        else recalculated = true;
      } catch (err) {
        recalculateError = err instanceof Error ? err.message : String(err);
      }
    }

    return json({
      ok: true,
      source: "fifa",
      endpoint: FIFA_CALENDAR_URL,
      adminCheck,
      fifaMatches: fifaMatches.length,
      phase1Updated: phase1Updated.length,
      phase1Cleared: phase1Cleared.length,
      phase1Protected: phase1Protected.length,
      phase32Updated: phase32Updated.length,
      phase32Cleared: phase32Cleared.length,
      phase32Protected: phase32Protected.length,
      skipped: skipped.length,
      recalculated,
      recalculateError,
      message: `Sincronización ejecutada. FASE 1: ${phase1Updated.length} actualizados. 16°: ${phase32Updated.length} actualizados.`,
      ...(debug ? {
        phase32UpdatedRows: phase32Updated,
        phase32ClearedRows: phase32Cleared,
        phase32ProtectedRows: phase32Protected,
        skippedRows: skipped.slice(0, 150)
      } : {})
    });
  } catch (err) {
    console.error("sync-worldcup-results error", err);
    return json({
      ok: false,
      source: "fifa",
      error: err instanceof Error ? err.message : String(err),
      message: "No se pudo sincronizar resultados desde FIFA.",
      handled: true
    }, 200);
  }
});
