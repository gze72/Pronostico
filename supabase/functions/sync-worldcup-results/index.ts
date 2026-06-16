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

const TEAM_CODE_MAP: Record<string, string> = {
  MEX: "MX", RSA: "ZA", KOR: "KR", CZE: "CZ",
  CAN: "CA", SUI: "CH", BIH: "BA", QAT: "QA",
  BRA: "BR", MAR: "MA", SCO: "SCO", HAI: "HT",
  TUR: "TR", USA: "US", PAR: "PY", AUS: "AU",
  ECU: "EC", GER: "DE", CIV: "CI", CUW: "CW",
  JPN: "JP", NED: "NL", SWE: "SE", TUN: "TN",
  BEL: "BE", EGY: "EG", IRN: "IR", NZL: "NZ",
  ESP: "ES", URU: "UY", KSA: "SA", CPV: "CV",
  FRA: "FR", SEN: "SN", IRQ: "IQ", NOR: "NO",
  ARG: "AR", ALG: "DZ", AUT: "AT", JOR: "JO",
  POR: "PT", COD: "CD", UZB: "UZ", COL: "CO",
  ENG: "ENG", CRO: "HR", GHA: "GH", PAN: "PA"
};

// Mapa seguro: grupo + local + visitante => ID interno de tu APP.
const SAFE_MATCH_MAP: Record<string, string> = {
  "A|MX|ZA": "A1", "A|KR|CZ": "A2", "A|MX|KR": "A3", "A|CZ|ZA": "A4", "A|CZ|MX": "A5", "A|ZA|KR": "A6",
  "B|CA|BA": "B1", "B|QA|CH": "B2", "B|CA|CH": "B3", "B|BA|QA": "B4", "B|BA|CH": "B5", "B|QA|CA": "B6",
  "C|BR|MA": "C1", "C|SCO|HT": "C2", "C|BR|SCO": "C3", "C|HT|MA": "C4", "C|HT|BR": "C5", "C|MA|SCO": "C6",
  "D|TR|US": "D1", "D|PY|AU": "D2", "D|TR|PY": "D3", "D|AU|US": "D4", "D|AU|TR": "D5", "D|US|PY": "D6",
  "E|EC|DE": "E1", "E|CI|CW": "E2", "E|EC|CI": "E3", "E|CW|DE": "E4", "E|CW|EC": "E5", "E|DE|CI": "E6",
  "F|JP|NL": "F1", "F|SE|TN": "F2", "F|JP|SE": "F3", "F|TN|NL": "F4", "F|TN|JP": "F5", "F|NL|SE": "F6",
  "G|BE|EG": "G1", "G|IR|NZ": "G2", "G|BE|IR": "G3", "G|NZ|EG": "G4", "G|NZ|BE": "G5", "G|EG|IR": "G6",
  "H|ES|CV": "H1", "H|SA|UY": "H2", "H|ES|SA": "H3", "H|UY|CV": "H4", "H|UY|ES": "H5", "H|CV|SA": "H6",
  "I|FR|SN": "I1", "I|IQ|NO": "I2", "I|FR|IQ": "I3", "I|NO|SN": "I4", "I|NO|FR": "I5", "I|SN|IQ": "I6",
  "J|AR|DZ": "J1", "J|AT|JO": "J2", "J|AR|AT": "J3", "J|JO|DZ": "J4", "J|JO|AR": "J5", "J|DZ|AT": "J6",
  "K|PT|CD": "K1", "K|UZ|CO": "K2", "K|PT|UZ": "K3", "K|CO|CD": "K4", "K|CO|PT": "K5", "K|CD|UZ": "K6",
  "L|ENG|HR": "L1", "L|GH|PA": "L2", "L|ENG|GH": "L3", "L|PA|HR": "L4", "L|PA|ENG": "L5", "L|HR|GH": "L6"
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
    IdCountry?: string;
    ShortClubName?: string;
    TeamName?: Array<{ Locale: string; Description: string }>;
  };
  Away?: {
    Score?: number;
    Abbreviation?: string;
    IdCountry?: string;
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
  return GROUP_LETTER_MAP[textOf(match.GroupName)] || null;
}

function normalizeTeamCode(fifaCode?: string) {
  if (!fifaCode) return null;
  const key = String(fifaCode).toUpperCase();
  return TEAM_CODE_MAP[key] || key;
}

function homeCode(match: FifaMatch) {
  return normalizeTeamCode(match.Home?.Abbreviation || match.Home?.IdCountry);
}

function awayCode(match: FifaMatch) {
  return normalizeTeamCode(match.Away?.Abbreviation || match.Away?.IdCountry);
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

function matchKey(match: FifaMatch) {
  const g = groupLetter(match);
  const h = homeCode(match);
  const a = awayCode(match);
  if (!g || !h || !a) return null;
  return `${g}|${h}|${a}`;
}

function internalMatchId(match: FifaMatch) {
  const key = matchKey(match);
  return key ? SAFE_MATCH_MAP[key] || null : null;
}

function minutesPlayed(match: FifaMatch) {
  return Number(String(match.MatchTime || "").replace(/[^0-9]/g, ""));
}

function hasScore(match: FifaMatch) {
  return scoreHome(match) != null && scoreAway(match) != null;
}

function kickoffTime(match: FifaMatch) {
  const value = match.Date || match.LocalDate || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isFuture(match: FifaMatch) {
  const t = kickoffTime(match);
  if (!t) return false;
  return t > Date.now();
}

function isFinal(match: FifaMatch) {
  if (!hasScore(match)) return false;
  if (isFuture(match)) return false;

  // Resultado oficial/publicable.
  if (match.ResultType === 1) return true;

  const min = minutesPlayed(match);
  return min >= 90;
}

function isLive(match: FifaMatch) {
  if (!hasScore(match)) return false;
  if (isFinal(match)) return false;
  if (isFuture(match)) return false;

  const min = minutesPlayed(match);
  return min > 0 && min < 130;
}

function isManualAdminScore(row: any) {
  const source = String(row?.source || "").toLowerCase();
  return source.includes("manual") || source.includes("admin");
}

function hasStoredScore(row: any) {
  return row && row.home_goals != null && row.away_goals != null;
}

function isAutoScore(row: any) {
  if (!row) return false;
  if (isManualAdminScore(row)) return false;
  const source = String(row.source || "").toLowerCase();
  return source.includes("fifa") || source.includes("auto") || source.includes("sync") || source === "";
}

async function assertAdmin(supabase: any, adminParticipantId: string | null) {
  if (!adminParticipantId) {
    return { ok: true, mode: "frontend-without-admin-id" };
  }

  const { data, error } = await supabase
    .from("participants")
    .select("id,role")
    .eq("id", adminParticipantId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.role !== "admin") {
    throw new Error("Solo el rol administrador puede sincronizar resultados oficiales.");
  }

  return { ok: true, mode: "admin-validated" };
}

async function loadExistingResults(supabase: any) {
  const { data, error } = await supabase
    .from("match_results")
    .select("match_id,home_goals,away_goals,status,source,updated_at,external_match_key");

  if (error) throw error;

  const map = new Map<string, any>();
  for (const row of data || []) {
    map.set(String(row.match_id), row);
  }

  return map;
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

function toDebugMatch(match: FifaMatch) {
  return {
    fifaId: match.IdMatch,
    matchNumber: match.MatchNumber,
    group: groupLetter(match),
    key: matchKey(match),
    internalMatchId: internalMatchId(match),
    home: teamName(match.Home),
    away: teamName(match.Away),
    homeCode: homeCode(match),
    awayCode: awayCode(match),
    score: hasScore(match) ? `${scoreHome(match)}-${scoreAway(match)}` : null,
    kickoff: match.Date || match.LocalDate || null,
    matchTime: match.MatchTime,
    resultType: match.ResultType,
    matchStatus: match.MatchStatus,
    future: isFuture(match),
    final: isFinal(match),
    live: isLive(match)
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 200);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const adminParticipantId = body?.adminParticipantId || null;
    const debug = Boolean(body?.debug);
    const saveLive = body?.saveLive === true;

    const adminCheck = await assertAdmin(supabase, adminParticipantId);

    const fifaMatches = await fetchFifaMatches();
    const existingResults = await loadExistingResults(supabase);

    const updated: any[] = [];
    const correctedAuto: any[] = [];
    const clearedFutureAuto: any[] = [];
    const protectedRows: any[] = [];
    const liveRows: any[] = [];
    const skipped: any[] = [];

    for (const match of fifaMatches) {
      const matchId = internalMatchId(match);
      const h = scoreHome(match);
      const a = scoreAway(match);
      const existing = matchId ? existingResults.get(String(matchId)) : null;

      if (!matchId) {
        if (hasScore(match) || debug) {
          skipped.push({ ...toDebugMatch(match), reason: "Sin mapeo seguro por grupo/local/visitante." });
        }
        continue;
      }

      // 1) Partido futuro o sin resultado final:
      // Si había score automático anterior, lo limpiamos. Si es manual/admin, se respeta.
      if (!isFinal(match)) {
        if (hasStoredScore(existing) && isManualAdminScore(existing)) {
          protectedRows.push({
            match_id: matchId,
            ...toDebugMatch(match),
            existing_home_goals: existing.home_goals,
            existing_away_goals: existing.away_goals,
            existing_source: existing.source,
            reason: "Protegido: resultado manual/ADMIN. No se limpia."
          });
        } else if (hasStoredScore(existing) && isAutoScore(existing)) {
          const newStatus = isLive(match) ? "live" : "scheduled";
          const { error } = await supabase
            .from("match_results")
            .upsert({
              match_id: matchId,
              home_goals: null,
              away_goals: null,
              status: newStatus,
              source: "fifa-auto-cleared",
              source_url: FIFA_CALENDAR_URL,
              external_match_key: String(match.IdMatch),
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: "match_id" });

          if (error) {
            skipped.push({ match_id: matchId, ...toDebugMatch(match), reason: error.message });
          } else {
            clearedFutureAuto.push({
              match_id: matchId,
              ...toDebugMatch(match),
              previous_home_goals: existing.home_goals,
              previous_away_goals: existing.away_goals,
              previous_source: existing.source,
              reason: "Score automático eliminado porque el partido no está finalizado."
            });
          }
        }

        if (isLive(match)) {
          liveRows.push({
            match_id: matchId,
            ...toDebugMatch(match),
            message: `Partido en curso: ${teamName(match.Home)} ${h}-${a} ${teamName(match.Away)}. Marcador parcial, puede cambiar.`
          });

          if (saveLive && !hasStoredScore(existing)) {
            await supabase
              .from("match_results")
              .upsert({
                match_id: matchId,
                home_goals: null,
                away_goals: null,
                status: "live",
                source: "fifa-live-info",
                source_url: FIFA_CALENDAR_URL,
                external_match_key: String(match.IdMatch),
                fetched_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: "match_id" });
          }
        }

        continue;
      }

      // 2) Partido final FIFA.
      if (h == null || a == null) {
        skipped.push({ match_id: matchId, ...toDebugMatch(match), reason: "Partido final sin marcador numérico." });
        continue;
      }

      // 3) Prioridad ADMIN/manual.
      if (hasStoredScore(existing) && isManualAdminScore(existing)) {
        protectedRows.push({
          match_id: matchId,
          ...toDebugMatch(match),
          existing_home_goals: existing.home_goals,
          existing_away_goals: existing.away_goals,
          existing_source: existing.source,
          reason: "Protegido: resultado manual/ADMIN. FIFA no sobrescribe."
        });
        continue;
      }

      // 4) Si existe score automático previo, FIFA puede corregirlo.
      const isCorrection =
        hasStoredScore(existing) &&
        isAutoScore(existing) &&
        (Number(existing.home_goals) !== Number(h) || Number(existing.away_goals) !== Number(a));

      const { error } = await supabase
        .from("match_results")
        .upsert({
          match_id: matchId,
          home_goals: Number(h),
          away_goals: Number(a),
          status: "finished",
          source: "fifa",
          source_url: FIFA_CALENDAR_URL,
          external_match_key: String(match.IdMatch),
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "match_id" });

      if (error) {
        skipped.push({ match_id: matchId, ...toDebugMatch(match), reason: error.message });
        continue;
      }

      const item = {
        match_id: matchId,
        ...toDebugMatch(match),
        previous_home_goals: existing?.home_goals ?? null,
        previous_away_goals: existing?.away_goals ?? null,
        previous_source: existing?.source ?? null
      };

      if (isCorrection) correctedAuto.push(item);
      else updated.push(item);
    }

    let recalculated = false;
    let recalculateError = null;

    if (updated.length || correctedAuto.length || clearedFutureAuto.length) {
      try {
        const { error } = await supabase.rpc("recalculate_phase1_scores");
        if (error) recalculateError = error.message;
        else recalculated = true;
      } catch (err) {
        recalculateError = err instanceof Error ? err.message : String(err);
      }
    }

    const liveMessage = liveRows.length
      ? ` Hay ${liveRows.length} partido(s) en curso; el marcador parcial se informa, pero no altera puntajes hasta finalizar.`
      : "";

    const clearMessage = clearedFutureAuto.length
      ? ` Se limpiaron ${clearedFutureAuto.length} score(s) automáticos de partidos no finalizados.`
      : "";

    return json({
      ok: true,
      source: "fifa",
      endpoint: FIFA_CALENDAR_URL,
      adminCheck,
      fifaMatches: fifaMatches.length,
      updated: updated.length,
      correctedAuto: correctedAuto.length,
      clearedFutureAuto: clearedFutureAuto.length,
      protected: protectedRows.length,
      liveMatches: liveRows.length,
      skipped: skipped.length,
      recalculated,
      recalculateError,
      message: `Sincronización FIFA ejecutada. Nuevos: ${updated.length}. Corregidos auto: ${correctedAuto.length}. Protegidos ADMIN/manual: ${protectedRows.length}.${clearMessage}${liveMessage}`,
      liveNotice: liveRows.length
        ? "Existen partidos en curso. Los marcadores parciales no se usan para puntajes hasta que FIFA publique el resultado final."
        : null,
      futureNotice: clearedFutureAuto.length
        ? "Se eliminaron marcadores automáticos de partidos futuros o no finalizados."
        : null,
      protectedNotice: protectedRows.length
        ? "Los resultados manuales/ADMIN se respetaron y no fueron modificados."
        : null,
      liveMatchesInfo: liveRows,
      ...(debug ? {
        updatedRows: updated,
        correctedAutoRows: correctedAuto,
        clearedFutureAutoRows: clearedFutureAuto,
        protectedRows: protectedRows.slice(0, 100),
        skippedRows: skipped.slice(0, 100),
        liveRows
      } : {})
    });
  } catch (err) {
    console.error("sync-worldcup-results error", err);

    return json({
      ok: false,
      source: "fifa",
      error: err instanceof Error ? err.message : String(err),
      message: "No se pudo sincronizar resultados desde FIFA. Puede registrar el Score real manualmente.",
      handled: true
    }, 200);
  }
});
