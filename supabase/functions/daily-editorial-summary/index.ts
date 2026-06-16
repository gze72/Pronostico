import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MatchInfo = { id: string; date: string; home: string; away: string; group: string };

const schedule: MatchInfo[] = [
  { id:"H1", date:"2026-06-15", home:"España", away:"Cabo Verde", group:"H" },
  { id:"G1", date:"2026-06-15", home:"Bélgica", away:"Egipto", group:"G" },
  { id:"H2", date:"2026-06-15", home:"Arabia Saudita", away:"Uruguay", group:"H" },
  { id:"G2", date:"2026-06-15", home:"Irán", away:"Nueva Zelanda", group:"G" },
  { id:"I1", date:"2026-06-16", home:"Francia", away:"Senegal", group:"I" },
  { id:"I2", date:"2026-06-16", home:"Irak", away:"Noruega", group:"I" },
  { id:"J1", date:"2026-06-16", home:"Argentina", away:"Argelia", group:"J" },
  { id:"J2", date:"2026-06-17", home:"Austria", away:"Jordania", group:"J" },
  { id:"K1", date:"2026-06-17", home:"Portugal", away:"RD Congo", group:"K" },
  { id:"L1", date:"2026-06-17", home:"Inglaterra", away:"Croacia", group:"L" },
  { id:"L2", date:"2026-06-17", home:"Ghana", away:"Panamá", group:"L" },
  { id:"K2", date:"2026-06-17", home:"Uzbekistán", away:"Colombia", group:"K" }
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function todayGuayaquil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dateMinusDays(dateText: string, days: number) {
  const [y, m, d] = dateText.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

function cleanText(value: string) {
  return String(value || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function resultPhrase(home: string, away: string, hg: number, ag: number) {
  if (hg === ag) return `${home} y ${away} igualaron ${hg}-${ag}`;
  const winner = hg > ag ? home : away;
  const loser = hg > ag ? away : home;
  return `${winner} superó ${hg}-${ag} a ${loser}`;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function buildQueries(targetDate: string, dayMatches: MatchInfo[], customQuery?: string) {
  const teams = unique(dayMatches.flatMap(m => [m.home, m.away])).join(" OR ");
  const queries: { label: string; q: string }[] = [];
  if (customQuery) queries.push({ label: "custom", q: customQuery });
  if (teams) {
    queries.push({ label: "matches-specific", q: `(Mundial 2026 OR "FIFA World Cup 2026" OR "Copa Mundial 2026") AND (${teams})` });
  }
  queries.push(
    { label: "worldcup-date-en", q: `"FIFA World Cup 2026" ${targetDate}` },
    { label: "worldcup-date-es", q: `"Copa Mundial 2026" ${targetDate}` },
    { label: "worldcup-general-en", q: `"FIFA World Cup 2026"` },
    { label: "worldcup-general-es", q: `"Copa Mundial 2026"` },
    { label: "mundial-general-es", q: `"Mundial 2026"` }
  );
  return queries;
}

async function fetchNewsApiAttempt(params: { query: string; label: string; from: string; to: string; language?: string }) {
  const key = Deno.env.get("NEWSAPI_KEY");
  if (!key) return { configured: false, label: params.label, language: params.language || "any", articles: [], error: "NEWSAPI_KEY no configurado" };

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", params.query);
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
  if (params.language) url.searchParams.set("language", params.language);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("apiKey", key);

  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  const text = await res.text();
  let payload: any = null;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 300) }; }

  const articles = (payload?.articles || []).map((a: any) => ({
    title: cleanText(a.title || ""),
    description: cleanText(a.description || ""),
    source: cleanText(a.source?.name || ""),
    url: a.url || ""
  })).filter((a: any) => a.title);

  return {
    configured: true,
    label: params.label,
    query: params.query,
    language: params.language || "any",
    status: res.status,
    ok: res.ok,
    newsapiStatus: payload?.status,
    code: payload?.code || null,
    message: payload?.message || null,
    totalResults: payload?.totalResults ?? 0,
    articles
  };
}

async function fetchNewsApiMultiLevel(targetDate: string, dayMatches: MatchInfo[], customQuery?: string, daysBack = 7) {
  const from = dateMinusDays(targetDate, Math.max(0, Number(daysBack) || 0));
  const to = targetDate;
  const attempts: any[] = [];
  const queries = buildQueries(targetDate, dayMatches, customQuery);
  for (const queryDef of queries) {
    for (const language of ["es", "en", undefined]) {
      const attempt = await fetchNewsApiAttempt({ query: queryDef.q, label: queryDef.label, from, to, language });
      attempts.push({ ...attempt, articles: undefined, articlesFound: attempt.articles?.length || 0 });
      if (attempt.articles?.length) return { sourceLabel: queryDef.label, from, to, articles: attempt.articles, attempts };
    }
  }
  return { sourceLabel: null, from, to, articles: [], attempts };
}

async function fetchGenericEditorial(targetDate: string, matches: any[]) {
  const endpoint = Deno.env.get("EDITORIAL_NEWS_ENDPOINT");
  if (!endpoint) return null;
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ date: targetDate, matches }) });
  if (!res.ok) throw new Error(`EDITORIAL_NEWS_ENDPOINT HTTP ${res.status}`);
  const payload = await res.json();
  if (Array.isArray(payload?.bullets)) return payload.bullets.map((x: string) => cleanText(x)).filter(Boolean).slice(0, 5);
  if (payload?.summary_text) return String(payload.summary_text).split("\n").map((x: string) => cleanText(x.replace(/^•\s*/, ""))).filter(Boolean).slice(0, 5);
  return null;
}

function buildBulletsFromNews(articles: any[], matchSummaries: string[]) {
  const bullets: string[] = [];
  for (const line of matchSummaries.slice(0, 2)) bullets.push(line);
  for (const article of articles.slice(0, 5)) {
    const source = article.source ? ` (${article.source})` : "";
    const title = article.title.replace(/\s-\s.*$/, "");
    const text = cleanText(`${title}${source}`);
    if (text && !bullets.some(b => b.includes(title.slice(0, 28)))) bullets.push(text);
    if (bullets.length >= 5) break;
  }
  return bullets.slice(0, 5);
}

function fallbackBullets(matchSummaries: string[]) {
  if (!matchSummaries.length) return [
    "No hay resultados reales cargados para la jornada seleccionada.",
    "El ranking se actualizó con los marcadores disponibles en la base de datos.",
    "Cuando el administrador registre nuevos Score real, el reporte reflejará la jornada actualizada."
  ];
  const drawCount = matchSummaries.filter(x => x.includes("igualaron")).length;
  return [
    drawCount >= 2 ? "Jornada marcada por empates y grupos muy abiertos." : "Jornada con movimientos importantes en la tabla de posiciones.",
    ...matchSummaries.slice(0, 4)
  ].slice(0, 5);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetDate = body?.date || todayGuayaquil();
    const debug = Boolean(body?.debug);
    const customQuery = body?.query ? String(body.query) : undefined;
    const daysBack = body?.daysBack == null ? 7 : Number(body.daysBack);
    const dayMatches = schedule.filter(m => m.date === targetDate);

    const { data: results, error } = await supabase.from("match_results").select("match_id,home_goals,away_goals,status,updated_at").in("match_id", dayMatches.map(m => m.id));
    if (error) throw error;

    const resultMap = new Map((results || []).map((r: any) => [r.match_id, r]));
    const completed = dayMatches.map(m => ({ ...m, result: resultMap.get(m.id) })).filter((m: any) => m.result?.home_goals != null && m.result?.away_goals != null);
    const matchSummaries = completed.map((m: any) => resultPhrase(m.home, m.away, Number(m.result.home_goals), Number(m.result.away_goals)));

    let bullets: string[] | null = null;
    let source = "results-generated";
    let sourceUrl: string | null = null;
    let articles: any[] = [];
    let newsapi: any = { configured: Boolean(Deno.env.get("NEWSAPI_KEY")), attempts: [], from: null, to: targetDate };

    try {
      bullets = await fetchGenericEditorial(targetDate, completed);
      if (bullets?.length) {
        source = "editorial-endpoint";
        sourceUrl = Deno.env.get("EDITORIAL_NEWS_ENDPOINT") || null;
      }
    } catch (err) {
      if (debug) newsapi.editorialEndpointError = err instanceof Error ? err.message : String(err);
      bullets = null;
    }

    if (!bullets?.length) {
      const news = await fetchNewsApiMultiLevel(targetDate, completed.length ? completed : dayMatches, customQuery, daysBack);
      articles = news.articles;
      newsapi = { ...newsapi, sourceLabel: news.sourceLabel, from: news.from, to: news.to, attempts: news.attempts };
      if (articles.length) {
        bullets = buildBulletsFromNews(articles, matchSummaries);
        source = news.sourceLabel ? `newsapi-${news.sourceLabel}` : "newsapi";
        sourceUrl = "https://newsapi.org/v2/everything";
      }
    }

    if (!bullets?.length) bullets = fallbackBullets(matchSummaries);
    const summaryText = ["Claves de la jornada:", ...bullets.map(b => `• ${b}`)].join("\n");

    await supabase.from("daily_editorial_summaries").upsert({
      summary_date: targetDate,
      summary_text: summaryText,
      source,
      source_url: sourceUrl,
      payload: { matches: completed, articles: articles.slice(0, 5), newsapi, generated_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: "summary_date" });

    console.log("Daily editorial summary", JSON.stringify({ date: targetDate, source, matches: completed.length, newsapiConfigured: newsapi.configured, attempts: newsapi.attempts?.length || 0, articlesFound: articles.length }));

    return json({ ok: true, date: targetDate, source, summaryText, bullets, matches: completed.length, ...(debug ? { newsapi } : {}) });
  } catch (err) {
    console.error("daily-editorial-summary error", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err), summaryText: "Claves de la jornada:\n• No se pudo actualizar el resumen editorial en línea.\n• El ranking se generó con los puntajes disponibles al momento." }, 500);
  }
});
