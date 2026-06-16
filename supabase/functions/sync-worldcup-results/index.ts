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
  MEX: "MX",
  RSA: "ZA",
  KOR: "KR",
  CZE: "CZ",

  CAN: "CA",
  SUI: "CH",
  BIH: "BA",
  QAT: "QA",

  BRA: "BR",
  MAR: "MA",
  SCO: "SCO",
  HAI: "HT",

  TUR: "TR",
  USA: "US",
  PAR: "PY",
  AUS: "AU",

  ECU: "EC",
  GER: "DE",
  CIV: "CI",
  CUW: "CW",

  JPN: "JP",
  NED: "NL",
  SWE: "SE",
  TUN: "TN",

  BEL: "BE",
  EGY: "EG",
  IRN: "IR",
  NZL: "NZ",

  ESP: "ES",
  URU: "UY",
  KSA: "SA",
  CPV: "CV",

  FRA: "FR",
  SEN: "SN",
  IRQ: "IQ",
  NOR: "NO",

  ARG: "AR",
  ALG: "DZ",
  AUT: "AT",
  JOR: "JO",

  POR: "PT",
  COD: "CD",
  UZB: "UZ",
  COL: "CO",

  ENG: "ENG",
  CRO: "HR",
  GHA: "GH",
  PAN: "PA"
};

// Mapeo seguro: SOLO se actualiza cuando grupo + local + visitante coinciden.
// Este mapa se ajusta a la nomenclatura interna actual de match_results: A1, A2, B1...
// IMPORTANTE: no se actualiza por orden FIFA, porque el orden puede no coincidir con la APP.
const SAFE_MATCH_MAP: Record<string, string> = {
  // Grupo A
  "A|MX|ZA": "A1",
  "A|KR|CZ": "A2",
  "A|MX|KR": "A3",
  "A|CZ|ZA": "A4",
  "A|CZ|MX": "A5",
  "A|ZA|KR": "A6",

  // Grupo B
  "B|CA|BA": "B1",
  "B|QA|CH": "B2",
  "B|CA|CH": "B3",
  "B|BA|QA": "B4",
  "B|BA|CH": "B5",
  "B|QA|CA": "B6",

  // Grupo C
  "C|BR|MA": "C1",
  "C|SCO|HT": "C2",
  "C|BR|SCO": "C3",
  "C|HT|MA": "C4",
  "C|HT|BR": "C5",
  "C|MA|SCO": "C6",

  // Grupo D
  "D|TR|US": "D1",
  "D|PY|AU": "D2",
  "D|TR|PY": "D3",
  "D|AU|US": "D4",
  "D|AU|TR": "D5",
  "D|US|PY": "D6",

  // Grupo E
  "E|EC|DE": "E1",
  "E|CI|CW": "E2",
  "E|EC|CI": "E3",
  "E|CW|DE": "E4",
  "E|CW|EC": "E5",
  "E|DE|CI": "E6",

  // Grupo F
  "F|JP|NL": "F1",
  "F|SE|TN": "F2",
  "F|JP|SE": "F3",
  "F|TN|NL": "F4",
  "F|TN|JP": "F5",
  "F|NL|SE": "F6",

  // Grupo G
  "G|BE|EG": "G1",
  "G|IR|NZ": "G2",
  "G|BE|IR": "G3",
  "G|NZ|EG": "G4",
  "G|NZ|BE": "G5",
  "G|EG|IR": "G6",

  // Grupo H
  "H|ES|CV": "H1",
  "H|SA|UY": "H2",
  "H|ES|SA": "H3",
  "H|UY|CV": "H4",
  "H|UY|ES": "H5",
  "H|CV|SA": "H6",

  // Grupo I
  "I|FR|SN": "I1",
  "I|IQ|NO": "I2",
  "I|FR|IQ": "I3",
  "I|NO|SN": "I4",
  "I|NO|FR": "I5",
  "I|SN|IQ": "I6",

  // Grupo J
  "J|AR|DZ": "J1",
  "J|AT|JO": "J2",
  "J|AR|AT": "J3",
  "J|JO|DZ": "J4",
  "J|JO|AR": "J5",
  "J|DZ|AT": "J6",

  // Grupo K
  "K|PT|CD": "K1",
  "K|UZ|CO": "K2",
  "K|PT|UZ": "K3",
  "K|CO|CD": "K4",
  "K|CO|PT": "K5",
  "K|CD|UZ": "K6",

  // Grupo L
  "L|ENG|HR": "L1",
  "L|GH|PA": "L2",
  "L|ENG|GH": "L3",
  "L|PA|HR": "L4",
  "L|PA|ENG": "L5",
  "L|HR|GH": "L6"
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
  const groupName = textOf(match.GroupName);
  return GROUP_LETTER_MAP[groupName] || null;
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

function minutesPlayed(match: FifaMatch) {
  return Number(String(match.MatchTime || "").replace(/[^0-9]/g, ""));
}

function hasScore(match: FifaMatch) {
  return scoreHome(match) != null && scoreAway(match) != null;
}

function isFinal(match: FifaMatch) {
  if (!hasScore(match)) return false;

  // FIFA ResultType = 1 fue validado como resultado publicable en el JSON compartido.
  if (match.ResultType === 1 && minutesPlayed(match) >= 90) return true;

  // Respaldo: si ResultType = 1, lo consideramos final aunque MatchTime venga vacío.
  if (match.ResultType === 1) return true;

  return false;
}

function isLive(match: FifaMatch) {
  if (!hasScore(match)) return false;
  if (isFinal(match)) return false;

  const min = minutesPlayed(match);
  return min > 0 && min < 130;
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

function toDebugMatch(match: FifaMatch) {
  return {
    fifaId: match.IdMatch,
    matchNumber: match.MatchNumber,
    group: groupLetter(match),
    key: matchKey(match),
    internalMatchId: matchKey(match) ? SAFE_MATCH_MAP[matchKey(match)!] || null : null,
    home: teamName(match.Home),
    away: teamName(match.Away),
    homeCode: homeCode(match),
    awayCode: awayCode(match),
    score: hasScore(match) ? `${scoreHome(match)}-${scoreAway(match)}` : null,
    matchTime: match.MatchTime,
    resultType: match.ResultType,
    matchStatus: match.MatchStatus,
    final: isFinal(match),
    live: isLive(match)
  };
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
    const saveLive = body?.saveLive === true;

    await assertAdmin(supabase, adminParticipantId);

    const fifaMatches = await fetchFifaMatches();

    const finalMatches = fifaMatches.filter(isFinal);
    const liveMatches = fifaMatches.filter(isLive);

    const updated: any[] = [];
    const live: any[] = [];
    const skipped: any[] = [];

    for (const match of finalMatches) {
      const key = matchKey(match);
      const internalMatchId = key ? SAFE_MATCH_MAP[key] : null;
      const h = scoreHome(match);
      const a = scoreAway(match);

      if (!key || !internalMatchId || h == null || a == null) {
        skipped.push({
          ...toDebugMatch(match),
          reason: "Sin mapeo seguro por grupo/local/visitante. No se actualiza."
        });
        continue;
      }

      const payload = {
        match_id: internalMatchId,
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
          ...toDebugMatch(match),
          match_id: internalMatchId,
          reason: error.message
        });
        continue;
      }

      updated.push({
        match_id: internalMatchId,
        ...toDebugMatch(match)
      });
    }

    for (const match of liveMatches) {
      const key = matchKey(match);
      const internalMatchId = key ? SAFE_MATCH_MAP[key] : null;
      const h = scoreHome(match);
      const a = scoreAway(match);

      const liveInfo = {
        match_id: internalMatchId,
        ...toDebugMatch(match),
        message: `Partido en curso: ${teamName(match.Home)} ${h}-${a} ${teamName(match.Away)}. Marcador parcial, puede cambiar.`
      };

      live.push(liveInfo);

      // Por defecto NO guardamos live para evitar alterar puntajes con marcador parcial.
      // Si en el futuro quieres visualizarlo desde BD, invoca con saveLive:true.
      if (saveLive && internalMatchId && h != null && a != null) {
        await supabase
          .from("match_results")
          .upsert({
            match_id: internalMatchId,
            home_goals: Number(h),
            away_goals: Number(a),
            status: "live",
            source: "fifa-live",
            source_url: FIFA_CALENDAR_URL,
            external_match_key: String(match.IdMatch),
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: "match_id" });
      }
    }

    let recalculated = false;
    let recalculateError = null;

    if (updated.length) {
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
    }

    const liveMessage = live.length
      ? ` Hay ${live.length} partido(s) en curso; el marcador parcial se informa, pero no altera puntajes hasta finalizar.`
      : "";

    return json({
      ok: true,
      source: "fifa",
      endpoint: FIFA_CALENDAR_URL,
      fifaMatches: fifaMatches.length,
      finalMatches: finalMatches.length,
      liveMatches: live.length,
      updated: updated.length,
      skipped: skipped.length,
      recalculated,
      recalculateError,
      message: updated.length
        ? `Resultados finales sincronizados desde FIFA: ${updated.length}.${liveMessage}`
        : `No se encontraron nuevos resultados finales para actualizar.${liveMessage}`,
      liveNotice: live.length
        ? "Existen partidos en curso. Los marcadores parciales no se usan para puntajes hasta que FIFA publique el resultado final."
        : null,
      liveMatchesInfo: live,
      ...(debug ? { updatedRows: updated, skippedRows: skipped.slice(0, 80), liveRows: live } : {})
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
