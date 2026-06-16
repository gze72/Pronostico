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

// Tu APP usa códigos FIFA de 3 letras en worldcupData.js.
// Por eso NO debemos convertir a 2 letras.
const TEAM_CODE_MAP: Record<string, string> = {
  RSA: "RSA",
  CZE: "CZE",
  SUI: "SUI",
  HAI: "HAI",
  USA: "USA",
  PAR: "PAR",
  AUS: "AUS",
  TUR: "TUR",
  ECU: "ECU",
  GER: "GER",
  CIV: "CIV",
  CUW: "CUW",
  JPN: "JPN",
  NED: "NED",
  SWE: "SWE",
  TUN: "TUN",
  BEL: "BEL",
  EGY: "EGY",
  IRN: "IRN",
  NZL: "NZL",
  ESP: "ESP",
  CPV: "CPV",
  KSA: "KSA",
  URU: "URU",
  FRA: "FRA",
  SEN: "SEN",
  IRQ: "IRQ",
  NOR: "NOR",
  ARG: "ARG",
  ALG: "ALG",
  AUT: "AUT",
  JOR: "JOR",
  POR: "POR",
  COD: "COD",
  UZB: "UZB",
  COL: "COL",
  ENG: "ENG",
  CRO: "CRO",
  GHA: "GHA",
  PAN: "PAN",
  BRA: "BRA",
  MAR: "MAR",
  SCO: "SCO",
  MEX: "MEX",
  KOR: "KOR",
  CAN: "CAN",
  BIH: "BIH",
  QAT: "QAT"
};

// Mapeo generado desde src/lib/worldcupData.js:
// const [a,b,c,d] = group.teams;
// pairings = [[a,b],[c,d],[a,c],[d,b],[d,a],[b,c]]
const SAFE_MATCH_MAP: Record<string, string> = {
  "A|MEX|RSA": "A1", "A|KOR|CZE": "A2", "A|MEX|KOR": "A3", "A|CZE|RSA": "A4", "A|CZE|MEX": "A5", "A|RSA|KOR": "A6",
  "B|CAN|BIH": "B1", "B|QAT|SUI": "B2", "B|CAN|QAT": "B3", "B|SUI|BIH": "B4", "B|SUI|CAN": "B5", "B|BIH|QAT": "B6",
  "C|BRA|MAR": "C1", "C|HAI|SCO": "C2", "C|BRA|HAI": "C3", "C|SCO|MAR": "C4", "C|SCO|BRA": "C5", "C|MAR|HAI": "C6",
  "D|USA|PAR": "D1", "D|AUS|TUR": "D2", "D|USA|AUS": "D3", "D|TUR|PAR": "D4", "D|TUR|USA": "D5", "D|PAR|AUS": "D6",
  "E|GER|CUW": "E1", "E|CIV|ECU": "E2", "E|GER|CIV": "E3", "E|ECU|CUW": "E4", "E|ECU|GER": "E5", "E|CUW|CIV": "E6",
  "F|NED|JPN": "F1", "F|SWE|TUN": "F2", "F|NED|SWE": "F3", "F|TUN|JPN": "F4", "F|TUN|NED": "F5", "F|JPN|SWE": "F6",
  "G|BEL|EGY": "G1", "G|IRN|NZL": "G2", "G|BEL|IRN": "G3", "G|NZL|EGY": "G4", "G|NZL|BEL": "G5", "G|EGY|IRN": "G6",
  "H|ESP|CPV": "H1", "H|KSA|URU": "H2", "H|ESP|KSA": "H3", "H|URU|CPV": "H4", "H|URU|ESP": "H5", "H|CPV|KSA": "H6",
  "I|FRA|SEN": "I1", "I|IRQ|NOR": "I2", "I|FRA|IRQ": "I3", "I|NOR|SEN": "I4", "I|NOR|FRA": "I5", "I|SEN|IRQ": "I6",
  "J|ARG|ALG": "J1", "J|AUT|JOR": "J2", "J|ARG|AUT": "J3", "J|JOR|ALG": "J4", "J|JOR|ARG": "J5", "J|ALG|AUT": "J6",
  "K|POR|COD": "K1", "K|UZB|COL": "K2", "K|POR|UZB": "K3", "K|COL|COD": "K4", "K|COL|POR": "K5", "K|COD|UZB": "K6",
  "L|ENG|CRO": "L1", "L|GHA|PAN": "L2", "L|ENG|GHA": "L3", "L|PAN|CRO": "L4", "L|PAN|ENG": "L5", "L|CRO|GHA": "L6"
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
  if (match.ResultType === 1) return true;
  return minutesPlayed(match) >= 90;
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
    const clearKnownBadAuto = body?.clearKnownBadAuto !== false;

    const adminCheck = await assertAdmin(supabase, adminParticipantId);

    const fifaMatches = await fetchFifaMatches();
    const existingResults = await loadExistingResults(supabase);

    const updated: any[] = [];
    const correctedAuto: any[] = [];
    const clearedAuto: any[] = [];
    const protectedRows: any[] = [];
    const liveRows: any[] = [];
    const skipped: any[] = [];

    // Limpieza directa de errores conocidos generados por el mapeo anterior.
    // Solo limpia si source es automático/FIFA; jamás toca manual/admin.
    if (clearKnownBadAuto) {
      for (const badId of ["D5", "D6"]) {
        const existing = existingResults.get(badId);
        if (hasStoredScore(existing) && isAutoScore(existing)) {
          const { error } = await supabase
            .from("match_results")
            .upsert({
              match_id: badId,
              home_goals: null,
              away_goals: null,
              status: "scheduled",
              source: "fifa-auto-cleared-bad-map",
              source_url: FIFA_CALENDAR_URL,
              external_match_key: existing.external_match_key || null,
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: "match_id" });

          if (!error) {
            clearedAuto.push({
              match_id: badId,
              previous_home_goals: existing.home_goals,
              previous_away_goals: existing.away_goals,
              previous_source: existing.source,
              reason: "Limpieza de marcador automático generado por mapeo anterior incorrecto."
            });
            existingResults.set(badId, {
              ...existing,
              home_goals: null,
              away_goals: null,
              status: "scheduled",
              source: "fifa-auto-cleared-bad-map"
            });
          } else {
            skipped.push({ match_id: badId, reason: error.message });
          }
        }
      }
    }

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

          if (!error) {
            clearedAuto.push({
              match_id: matchId,
              ...toDebugMatch(match),
              previous_home_goals: existing.home_goals,
              previous_away_goals: existing.away_goals,
              previous_source: existing.source,
              reason: "Score automático eliminado porque el partido no está finalizado."
            });
          } else {
            skipped.push({ match_id: matchId, ...toDebugMatch(match), reason: error.message });
          }
        }

        if (isLive(match)) {
          liveRows.push({
            match_id: matchId,
            ...toDebugMatch(match),
            message: `Partido en curso: ${teamName(match.Home)} ${h}-${a} ${teamName(match.Away)}. Marcador parcial, puede cambiar.`
          });
        }

        continue;
      }

      if (h == null || a == null) {
        skipped.push({ match_id: matchId, ...toDebugMatch(match), reason: "Partido final sin marcador numérico." });
        continue;
      }

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

    if (updated.length || correctedAuto.length || clearedAuto.length) {
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

    const clearMessage = clearedAuto.length
      ? ` Se limpiaron ${clearedAuto.length} score(s) automáticos incorrectos/no finalizados.`
      : "";

    return json({
      ok: true,
      source: "fifa",
      endpoint: FIFA_CALENDAR_URL,
      adminCheck,
      fifaMatches: fifaMatches.length,
      updated: updated.length,
      correctedAuto: correctedAuto.length,
      clearedAuto: clearedAuto.length,
      protected: protectedRows.length,
      liveMatches: liveRows.length,
      skipped: skipped.length,
      recalculated,
      recalculateError,
      message: `Sincronización FIFA ejecutada. Nuevos: ${updated.length}. Corregidos auto: ${correctedAuto.length}. Protegidos ADMIN/manual: ${protectedRows.length}.${clearMessage}${liveMessage}`,
      liveNotice: liveRows.length
        ? "Existen partidos en curso. Los marcadores parciales no se usan para puntajes hasta que FIFA publique el resultado final."
        : null,
      futureNotice: clearedAuto.length
        ? "Se eliminaron marcadores automáticos incorrectos o de partidos no finalizados."
        : null,
      protectedNotice: protectedRows.length
        ? "Los resultados manuales/ADMIN se respetaron y no fueron modificados."
        : null,
      liveMatchesInfo: liveRows,
      ...(debug ? {
        updatedRows: updated,
        correctedAutoRows: correctedAuto,
        clearedAutoRows: clearedAuto,
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
