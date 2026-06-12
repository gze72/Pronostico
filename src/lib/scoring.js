import { GROUPS, TEAMS, ROUND_OF_32_TEMPLATE } from './worldcupData';

export function emptyPredictions() { return {}; }
export function resultOf(homeGoals, awayGoals) {
  if (homeGoals === '' || awayGoals === '' || homeGoals == null || awayGoals == null) return null;
  const h = Number(homeGoals), a = Number(awayGoals);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  if (h > a) return 'home';
  if (h < a) return 'away';
  return 'draw';
}
export function calculateStandings(groupId, matches, predictions) {
  const group = GROUPS.find(g => g.id === groupId);
  const table = Object.fromEntries(group.teams.map(([code]) => [code, { code, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }]));
  matches.filter(m => m.groupId === groupId).forEach(m => {
    const p = predictions[m.id];
    if (!p || p.homeGoals === '' || p.awayGoals === '') return;
    const h = Number(p.homeGoals); const a = Number(p.awayGoals);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    table[m.home].pj++; table[m.away].pj++;
    table[m.home].gf += h; table[m.home].gc += a;
    table[m.away].gf += a; table[m.away].gc += h;
    if (h > a) { table[m.home].pg++; table[m.away].pp++; table[m.home].pts += 3; }
    else if (h < a) { table[m.away].pg++; table[m.home].pp++; table[m.away].pts += 3; }
    else { table[m.home].pe++; table[m.away].pe++; table[m.home].pts++; table[m.away].pts++; }
  });
  Object.values(table).forEach(t => { t.dg = t.gf - t.gc; });
  return Object.values(table).sort((x,y) => y.pts-x.pts || y.dg-x.dg || y.gf-x.gf || TEAMS[x.code].name.localeCompare(TEAMS[y.code].name));
}
export function groupCompleted(groupId, matches, predictions) {
  return matches.filter(m => m.groupId === groupId).every(m => {
    const p = predictions[m.id];
    return p && p.homeGoals !== '' && p.awayGoals !== '' && !Number.isNaN(Number(p.homeGoals)) && !Number.isNaN(Number(p.awayGoals));
  });
}
export function allGroupsCompleted(matches, predictions) { return GROUPS.every(g => groupCompleted(g.id, matches, predictions)); }
export function buildQualified(matches, predictions) {
  const standings = Object.fromEntries(GROUPS.map(g => [g.id, calculateStandings(g.id, matches, predictions)]));
  const third = GROUPS.map(g => ({ groupId:g.id, ...standings[g.id][2] })).sort((a,b)=> b.pts-a.pts || b.dg-a.dg || b.gf-a.gf);
  return { standings, bestThird: third.slice(0,8).map(t=>t.groupId) };
}
export function resolveToken(token, qualified) {
  const m = token.match(/^([123])([A-L])$/);
  if (m) return qualified.standings[m[2]]?.[Number(m[1])-1]?.code || token;
  if (token.includes('/')) {
    const opts = token.replace('3','').split('/');
    const g = opts.find(x => qualified.bestThird.includes(x));
    return g ? qualified.standings[g][2]?.code : token;
  }
  return token;
}
export function buildRoundOf32(matches, predictions) {
  const qualified = buildQualified(matches, predictions);
  return ROUND_OF_32_TEMPLATE.map(([id,a,b]) => ({ id, aToken:a, bToken:b, a:resolveToken(a,qualified), b:resolveToken(b,qualified) }));
}
export function winnerLabel(match, prediction) {
  const r = prediction ? resultOf(prediction.homeGoals, prediction.awayGoals) : null;
  if (!r) return 'Pendiente';
  if (r === 'draw') return 'Empate';
  return TEAMS[r === 'home' ? match.home : match.away]?.name || '';
}
