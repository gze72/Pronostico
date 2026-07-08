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
  const table = Object.fromEntries(
    group.teams.map(([code]) => [code, { code, groupId, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }])
  );

  matches.filter(m => m.groupId === groupId).forEach(m => {
    const p = predictions[m.id];
    if (!p || p.homeGoals === '' || p.awayGoals === '') return;

    const h = Number(p.homeGoals);
    const a = Number(p.awayGoals);
    if (Number.isNaN(h) || Number.isNaN(a)) return;

    table[m.home].pj++;
    table[m.away].pj++;
    table[m.home].gf += h;
    table[m.home].gc += a;
    table[m.away].gf += a;
    table[m.away].gc += h;

    if (h > a) {
      table[m.home].pg++;
      table[m.away].pp++;
      table[m.home].pts += 3;
    } else if (h < a) {
      table[m.away].pg++;
      table[m.home].pp++;
      table[m.away].pts += 3;
    } else {
      table[m.home].pe++;
      table[m.away].pe++;
      table[m.home].pts++;
      table[m.away].pts++;
    }
  });

  Object.values(table).forEach(t => { t.dg = t.gf - t.gc; });

  return Object.values(table).sort(
    (x,y) =>
      y.pts - x.pts ||
      y.dg - x.dg ||
      y.gf - x.gf ||
      TEAMS[x.code].name.localeCompare(TEAMS[y.code].name)
  );
}

export function groupCompleted(groupId, matches, predictions) {
  return matches.filter(m => m.groupId === groupId).every(m => {
    const p = predictions[m.id];
    return p && p.homeGoals !== '' && p.awayGoals !== '' && !Number.isNaN(Number(p.homeGoals)) && !Number.isNaN(Number(p.awayGoals));
  });
}

export function allGroupsCompleted(matches, predictions) {
  return GROUPS.every(g => groupCompleted(g.id, matches, predictions));
}

function rankTeams(a, b) {
  return (
    b.pts - a.pts ||
    b.dg - a.dg ||
    b.gf - a.gf ||
    TEAMS[a.code].name.localeCompare(TEAMS[b.code].name)
  );
}

export function buildQualified(matches, predictions) {
  const standings = Object.fromEntries(
    GROUPS.map(g => [g.id, calculateStandings(g.id, matches, predictions)])
  );

  const firstSecond = GROUPS.flatMap(g => [
    { ...standings[g.id][0], groupId: g.id, groupRank: 1, slot: `1${g.id}` },
    { ...standings[g.id][1], groupId: g.id, groupRank: 2, slot: `2${g.id}` }
  ]);

  const thirdRanked = GROUPS
    .map(g => ({ ...standings[g.id][2], groupId: g.id, groupRank: 3, slot: `3${g.id}` }))
    .sort(rankTeams);

  const bestThird = thirdRanked.slice(0, 8);

  const qualifiedTeams = [...firstSecond, ...bestThird];
  const uniqueCodes = new Set(qualifiedTeams.map(t => t.code));

  return {
    standings,
    firstSecond,
    bestThird,
    bestThirdGroups: bestThird.map(t => t.groupId),
    qualifiedTeams,
    hasDuplicateQualified: uniqueCodes.size !== qualifiedTeams.length
  };
}

function resolveDirectToken(token, qualified) {
  const m = token.match(/^([12])([A-L])$/);
  if (!m) return null;
  return qualified.standings[m[2]]?.[Number(m[1]) - 1]?.code || null;
}

function resolveThirdToken(token, qualified, usedTeamCodes, usedThirdGroups) {
  const allowedGroups = token
    .replace(/^3/, '')
    .split('/')
    .filter(Boolean);

  const candidate = qualified.bestThird
    .filter(team => allowedGroups.includes(team.groupId))
    .filter(team => !usedTeamCodes.has(team.code))
    .filter(team => !usedThirdGroups.has(team.groupId))
    .sort(rankTeams)[0];

  if (!candidate) return null;

  usedTeamCodes.add(candidate.code);
  usedThirdGroups.add(candidate.groupId);
  return candidate.code;
}

export function buildRoundOf32(matches, predictions) {
  const qualified = buildQualified(matches, predictions);
  const usedTeamCodes = new Set();
  const usedThirdGroups = new Set();

  const bracket = ROUND_OF_32_TEMPLATE.map(([id, aToken, bToken]) => {
    let a = resolveDirectToken(aToken, qualified);
    if (!a && aToken.startsWith('3')) a = resolveThirdToken(aToken, qualified, usedTeamCodes, usedThirdGroups);

    if (a && !aToken.startsWith('3')) usedTeamCodes.add(a);

    let b = resolveDirectToken(bToken, qualified);
    if (!b && bToken.startsWith('3')) b = resolveThirdToken(bToken, qualified, usedTeamCodes, usedThirdGroups);

    if (b && !bToken.startsWith('3')) usedTeamCodes.add(b);

    return {
      id,
      aToken,
      bToken,
      a: a || aToken,
      b: b || bToken
    };
  });

  const seen = new Set();
  const duplicates = [];

  bracket.forEach(match => {
    [match.a, match.b].forEach(code => {
      if (TEAMS[code]) {
        if (seen.has(code)) duplicates.push(code);
        seen.add(code);
      }
    });
  });

  return bracket.map(match => ({
    ...match,
    duplicateWarning: duplicates.includes(match.a) || duplicates.includes(match.b)
  }));
}

export function winnerLabel(match, prediction) {
  const r = prediction ? resultOf(prediction.homeGoals, prediction.awayGoals) : null;
  if (!r) return 'Pendiente';
  if (r === 'draw') return 'Empate';
  return TEAMS[r === 'home' ? match.home : match.away]?.name || '';
}


export function actualResultOf(result) {
  if (!result || result.homeGoals === '' || result.awayGoals === '' || result.homeGoals == null || result.awayGoals == null) return null;
  return resultOf(result.homeGoals, result.awayGoals);
}

export function evaluatePrediction(matchId, predictions, realScores) {
  const prediction = predictions?.[matchId];
  const real = realScores?.[matchId];

  if (!prediction || !real || real.homeGoals == null || real.awayGoals == null) {
    return { winnerHit: null, scoreHit: null, points: 0 };
  }

  const predictedResult = resultOf(prediction.homeGoals, prediction.awayGoals);
  const actualResult = actualResultOf(real);

  if (!predictedResult || !actualResult) {
    return { winnerHit: null, scoreHit: null, points: 0 };
  }

  const predictedHome = Number(prediction.homeGoals);
  const predictedAway = Number(prediction.awayGoals);
  const actualHome = Number(real.homeGoals);
  const actualAway = Number(real.awayGoals);

  const winnerHit = predictedResult === actualResult;
  const scoreHit = predictedHome === actualHome && predictedAway === actualAway;

  return {
    winnerHit,
    scoreHit,
    points: (winnerHit ? 1 : 0) + (scoreHit ? 1 : 0)
  };
}

export function calculateParticipantScore(matches, predictions, realScores) {
  return matches.reduce((acc, match) => {
    const result = evaluatePrediction(match.id, predictions, realScores);
    if (result.winnerHit !== null || result.scoreHit !== null) acc.evaluatedMatches += 1;
    if (result.winnerHit) acc.winnerPoints += 1;
    if (result.scoreHit) acc.scorePoints += 1;
    acc.totalPoints += result.points;
    return acc;
  }, { winnerPoints: 0, scorePoints: 0, totalPoints: 0, evaluatedMatches: 0 });
}


export function calculateRealStandings(groupId, matches, realScores) {
  const group = GROUPS.find(g => g.id === groupId);
  const table = Object.fromEntries(
    group.teams.map(([code]) => [code, { code, groupId, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }])
  );

  matches.filter(m => m.groupId === groupId).forEach(m => {
    const r = realScores?.[m.id];
    if (!r || r.homeGoals == null || r.awayGoals == null) return;

    const h = Number(r.homeGoals);
    const a = Number(r.awayGoals);
    if (Number.isNaN(h) || Number.isNaN(a)) return;

    table[m.home].pj++;
    table[m.away].pj++;
    table[m.home].gf += h;
    table[m.home].gc += a;
    table[m.away].gf += a;
    table[m.away].gc += h;

    if (h > a) {
      table[m.home].pg++;
      table[m.away].pp++;
      table[m.home].pts += 3;
    } else if (h < a) {
      table[m.away].pg++;
      table[m.home].pp++;
      table[m.away].pts += 3;
    } else {
      table[m.home].pe++;
      table[m.away].pe++;
      table[m.home].pts++;
      table[m.away].pts++;
    }
  });

  Object.values(table).forEach(t => { t.dg = t.gf - t.gc; });

  return Object.values(table).sort(
    (x,y) =>
      y.pts - x.pts ||
      y.dg - x.dg ||
      y.gf - x.gf ||
      TEAMS[x.code].name.localeCompare(TEAMS[y.code].name)
  );
}



export function buildRealQualified(matches, realScores) {
  const standings = Object.fromEntries(
    GROUPS.map(g => [g.id, calculateRealStandings(g.id, matches, realScores)])
  );

  const firstSecond = GROUPS.flatMap(g => [
    { ...standings[g.id][0], groupId: g.id, groupRank: 1, slot: `1${g.id}` },
    { ...standings[g.id][1], groupId: g.id, groupRank: 2, slot: `2${g.id}` }
  ]);

  const thirdRanked = GROUPS
    .map(g => ({ ...standings[g.id][2], groupId: g.id, groupRank: 3, slot: `3${g.id}` }))
    .sort(rankTeams);

  const bestThird = thirdRanked.slice(0, 8);

  return {
    standings,
    firstSecond,
    bestThird,
    bestThirdGroups: bestThird.map(t => t.groupId),
    qualifiedTeams: [...firstSecond, ...bestThird]
  };
}

export function buildRealRoundOf32(matches, realScores) {
  // Fix 4:
  // Llave fija de Pronóstico 16° respetando IDs ya usados por los pronósticos guardados.
  // No se debe recalcular desde grupos ni usar IDs internos antiguos.
  // La orientación home/away se alinea con los datos confirmados en Supabase.

  return [
    { id:'R32-01', matchNo:'16°-01', phase:'ROUND_OF_32', home:'RSA', away:'CAN', kickoff:'2026-06-28T16:00:00-07:00', venue:'Los Ángeles Stadium' },
    { id:'R32-02', matchNo:'16°-02', phase:'ROUND_OF_32', home:'BRA', away:'JPN', kickoff:'2026-06-29T14:00:00-05:00', venue:'Houston Stadium' },
    { id:'R32-03', matchNo:'16°-03', phase:'ROUND_OF_32', home:'GER', away:'PAR', kickoff:'2026-06-29T17:30:00-04:00', venue:'Boston Stadium' },
    { id:'R32-04', matchNo:'16°-04', phase:'ROUND_OF_32', home:'NED', away:'MAR', kickoff:'2026-06-29T22:00:00-06:00', venue:'Estadio Monterrey' },
    { id:'R32-05', matchNo:'16°-05', phase:'ROUND_OF_32', home:'FRA', away:'SWE', kickoff:'2026-06-30T17:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-06', matchNo:'16°-06', phase:'ROUND_OF_32', home:'ESP', away:'AUT', kickoff:'2026-07-02T15:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-07', matchNo:'16°-07', phase:'ROUND_OF_32', home:'USA', away:'BIH', kickoff:'2026-07-01T20:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-08', matchNo:'16°-08', phase:'ROUND_OF_32', home:'ENG', away:'COD', kickoff:'2026-07-01T12:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-09', matchNo:'16°-09', phase:'ROUND_OF_32', home:'BEL', away:'SEN', kickoff:'2026-07-01T16:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-10', matchNo:'16°-10', phase:'ROUND_OF_32', home:'CIV', away:'NOR', kickoff:'2026-06-30T13:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-11', matchNo:'16°-11', phase:'ROUND_OF_32', home:'ECU', away:'MEX', kickoff:'2026-06-30T21:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-12', matchNo:'16°-12', phase:'ROUND_OF_32', home:'POR', away:'CRO', kickoff:'2026-07-02T19:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-13', matchNo:'16°-13', phase:'ROUND_OF_32', home:'SUI', away:'ALG', kickoff:'2026-07-02T23:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-14', matchNo:'16°-14', phase:'ROUND_OF_32', home:'AUS', away:'EGY', kickoff:'2026-07-03T14:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-15', matchNo:'16°-15', phase:'ROUND_OF_32', home:'ARG', away:'CPV', kickoff:'2026-07-03T18:00:00-04:00', venue:'Horario FIFA por confirmar en app' },
    { id:'R32-16', matchNo:'16°-16', phase:'ROUND_OF_32', home:'COL', away:'GHA', kickoff:'2026-07-03T21:30:00-04:00', venue:'Horario FIFA por confirmar en app' }
  ];
}

// Reglas de cierre Pronóstico 16°:
// - 28/jun/2026: cierre excepcional 14:30 Ecuador = 19:30 UTC.
// - Desde 29/jun/2026 en adelante: cierre diario 12:00 Ecuador = 17:00 UTC.
export const PHASE32_INITIAL_CUTOFF_ISO = '2026-06-28T19:30:00.000Z';
export const PHASE32_DAILY_LOCK_HOUR_EC = 12;
export const PHASE32_DAILY_LOCK_MINUTE_EC = 0;

function ecLocalPartsFromUtc(dateLike) {
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return null;
  const ecDate = new Date(time - (5 * 60 * 60 * 1000));
  return {
    year: ecDate.getUTCFullYear(),
    month: ecDate.getUTCMonth() + 1,
    day: ecDate.getUTCDate(),
    hour: ecDate.getUTCHours(),
    minute: ecDate.getUTCMinutes(),
    second: ecDate.getUTCSeconds()
  };
}

export function phase32CutoffIsoForConfirmedAt(confirmedAt) {
  const parts = ecLocalPartsFromUtc(confirmedAt);
  if (!parts) return PHASE32_INITIAL_CUTOFF_ISO;

  if (parts.year === 2026 && parts.month === 6 && parts.day === 28) {
    return PHASE32_INITIAL_CUTOFF_ISO;
  }

  // Para fechas desde el 29/jun/2026, el corte diario es 12:00 Ecuador.
  const cutoffUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    PHASE32_DAILY_LOCK_HOUR_EC + 5,
    PHASE32_DAILY_LOCK_MINUTE_EC,
    0,
    0
  );

  return new Date(cutoffUtc).toISOString();
}

export function isPhase32ForecastLate(metaOrConfirmedAt) {
  const meta = typeof metaOrConfirmedAt === 'string' ? { confirmedAt: metaOrConfirmedAt, status: 'confirmed', confirmed: true } : (metaOrConfirmedAt || {});
  const confirmedAt = meta.confirmedAt || meta.confirmed_at;
  const status = String(meta.status || '').toLowerCase();
  const confirmed = meta.confirmed ?? status === 'confirmed';

  if (!confirmed || !confirmedAt) return false;

  const confirmedTime = new Date(confirmedAt).getTime();
  const cutoffTime = new Date(phase32CutoffIsoForConfirmedAt(confirmedAt)).getTime();

  return Number.isFinite(confirmedTime) && Number.isFinite(cutoffTime) && confirmedTime > cutoffTime;
}

export function isPhase32ForecastNotConfirmed(meta = {}) {
  const status = String(meta.status || '').toLowerCase();
  const confirmed = meta.confirmed ?? status === 'confirmed';
  return !confirmed;
}

export function zeroPhase32Score(reason = 'Pronóstico registrado fuera del horario permitido', flags = {}) {
  return {
    winnerPoints: 0,
    scorePoints: 0,
    penaltyPoints: 0,
    totalPoints: 0,
    evaluatedMatches: 0,
    latePenalty: Boolean(flags.latePenalty),
    notConfirmed: Boolean(flags.notConfirmed),
    latePenaltyReason: reason
  };
}

export function phase32WinnerFromScore(match, record) {
  if (!record || record.homeGoals === '' || record.awayGoals === '' || record.homeGoals == null || record.awayGoals == null) return null;
  const h = Number(record.homeGoals);
  const a = Number(record.awayGoals);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  if (h > a) return match.home;
  if (a > h) return match.away;
  return record.penaltyWinner || null;
}

export function phase32WentPenalties(record) {
  if (!record || record.homeGoals === '' || record.awayGoals === '' || record.homeGoals == null || record.awayGoals == null) return false;
  const h = Number(record.homeGoals);
  const a = Number(record.awayGoals);
  return !Number.isNaN(h) && !Number.isNaN(a) && h === a;
}

export function evaluatePhase32Prediction(match, predictions, realResults) {
  const prediction = predictions?.[match.id];
  const real = realResults?.[match.id];

  if (!prediction || !real || real.homeGoals == null || real.awayGoals == null) {
    return { winnerHit: null, scoreHit: null, penaltyHit: null, winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, methodPoints: 0, points: 0 };
  }

  const predictedWinner = phase32WinnerFromScore(match, prediction);
  const realWinner = phase32WinnerFromScore(match, real);
  const predictedWentPenalties = phase32WentPenalties(prediction);
  const realWentPenalties = Boolean(real.wentPenalties || phase32WentPenalties(real));

  if (!predictedWinner || !realWinner) {
    return { winnerHit: null, scoreHit: null, penaltyHit: null, winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, methodPoints: 0, points: 0 };
  }

  const scoreHit = Number(prediction.homeGoals) === Number(real.homeGoals) && Number(prediction.awayGoals) === Number(real.awayGoals);
  const winnerHit = predictedWinner === realWinner;

  // La forma de clasificación también debe acertarse:
  // - Directo: el usuario pronosticó victoria sin empate y el partido real no fue a penales.
  // - Penales: el usuario pronosticó empate y acertó el ganador por penales.
  const directMethodHit = winnerHit && !realWentPenalties && !predictedWentPenalties;
  const penaltyHit = realWentPenalties ? (predictedWentPenalties && prediction.penaltyWinner === real.penaltyWinner) : null;
  const penaltyMethodHit = winnerHit && realWentPenalties && Boolean(penaltyHit);
  const methodHit = directMethodHit || penaltyMethodHit;

  const winnerPoints = winnerHit ? 1 : 0;
  const methodPoints = methodHit ? 1 : 0;
  const scorePoints = scoreHit ? 1 : 0;
  const penaltyPoints = methodPoints;

  return {
    winnerHit,
    scoreHit,
    penaltyHit: realWentPenalties ? Boolean(penaltyHit) : methodHit,
    methodHit,
    winnerPoints,
    scorePoints,
    penaltyPoints,
    methodPoints,
    points: winnerPoints + methodPoints + scorePoints
  };
}

export function calculatePhase32Score(matches, predictions, realResults, forecastMeta = {}) {
  if (isPhase32ForecastNotConfirmed(forecastMeta)) {
    return zeroPhase32Score('Pronóstico 16° no confirmado. No genera puntos.', { notConfirmed: true });
  }

  if (isPhase32ForecastLate(forecastMeta)) {
    return zeroPhase32Score('Pronóstico registrado fuera del horario permitido.', { latePenalty: true });
  }

  return matches.reduce((acc, match) => {
    const result = evaluatePhase32Prediction(match, predictions, realResults);
    if (result.winnerHit !== null || result.scoreHit !== null || result.penaltyHit !== null) acc.evaluatedMatches += 1;
    acc.winnerPoints += result.winnerPoints || 0;
    acc.scorePoints += result.scorePoints || 0;
    acc.penaltyPoints += result.penaltyPoints || 0;
    acc.totalPoints += result.points;
    return acc;
  }, { winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, totalPoints: 0, evaluatedMatches: 0 });
}

// =============================
// FASE 3 · OCTAVOS DE FINAL
// =============================
const PHASE16_PLACEHOLDERS = {
  TBD_R3215: 'Ganador Argentina/Cabo Verde',
  TBD_R3214: 'Ganador Australia/Egipto',
  TBD_R3216: 'Ganador Colombia/Ghana'
};

function phase16WinnerFromPhase32Result(match, phase32Results = {}) {
  const real = phase32Results?.[match];
  if (!real || real.homeGoals == null || real.awayGoals == null) return null;
  const h = Number(real.homeGoals);
  const a = Number(real.awayGoals);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  const phase32Map = {
    'R32-14': { home:'AUS', away:'EGY' },
    'R32-15': { home:'ARG', away:'CPV' },
    'R32-16': { home:'COL', away:'GHA' }
  };
  const fixture = phase32Map[match];
  if (!fixture) return null;
  if (h > a) return fixture.home;
  if (a > h) return fixture.away;
  return real.penaltyWinner || null;
}

export function buildRoundOf16() {
  // Octavos definitivos según resultados completos de 16avos.
  // No se dejan cruces TBD para evitar distorsión visual o de guardado.
  return [
    { id:'R16-01', fifaId:'53452511', matchNo:'8°-01', phase:'ROUND_OF_16', home:'CAN', away:'MAR', kickoff:'2026-07-04T12:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-01','R32-04'] },
    { id:'R16-02', fifaId:'53452509', matchNo:'8°-02', phase:'ROUND_OF_16', home:'PAR', away:'FRA', kickoff:'2026-07-04T16:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-03','R32-05'] },
    { id:'R16-03', fifaId:'53452517', matchNo:'8°-03', phase:'ROUND_OF_16', home:'BRA', away:'NOR', kickoff:'2026-07-05T15:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-02','R32-10'] },
    { id:'R16-04', fifaId:'53452519', matchNo:'8°-04', phase:'ROUND_OF_16', home:'MEX', away:'ENG', kickoff:'2026-07-05T19:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-11','R32-08'] },
    { id:'R16-05', fifaId:'53452513', matchNo:'8°-05', phase:'ROUND_OF_16', home:'POR', away:'ESP', kickoff:'2026-07-06T14:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-12','R32-06'] },
    { id:'R16-06', fifaId:'53452515', matchNo:'8°-06', phase:'ROUND_OF_16', home:'USA', away:'BEL', kickoff:'2026-07-06T19:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-07','R32-09'] },
    { id:'R16-07', fifaId:'53452521', matchNo:'8°-07', phase:'ROUND_OF_16', home:'ARG', away:'EGY', kickoff:'2026-07-07T11:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-15','R32-14'] },
    { id:'R16-08', fifaId:'53452523', matchNo:'8°-08', phase:'ROUND_OF_16', home:'SUI', away:'COL', kickoff:'2026-07-07T15:00:00-05:00', venue:'FIFA World Cup 2026', sourceR32:['R32-13','R32-16'] }
  ];
}

export function phase16TeamResolved(code) {
  return Boolean(code) && !String(code).startsWith('TBD_');
}

export function phase16MatchResolved(match) {
  return phase16TeamResolved(match?.home) && phase16TeamResolved(match?.away);
}

export function phase16Complete(matches, predictions) {
  return (matches || []).every(match => {
    if (!phase16MatchResolved(match)) return false;
    const prediction = predictions?.[match.id];
    if (!prediction || prediction.homeGoals === '' || prediction.awayGoals === '' || prediction.homeGoals == null || prediction.awayGoals == null) return false;
    const tie = Number(prediction.homeGoals) === Number(prediction.awayGoals);
    return !tie || Boolean(prediction.penaltyWinner);
  });
}

export function calculatePhase16Score(matches, predictions, realResults, forecastMeta = {}) {
  const phase8Unlocked = Boolean(forecastMeta.phase8PredictionsUnlocked);

  if (isPhase32ForecastNotConfirmed(forecastMeta)) {
    return zeroPhase32Score('Pronóstico 8° no confirmado. No genera puntos.', { notConfirmed: true });
  }

  // Si el ADMIN habilitó Pronóstico 8°, la habilitación excepcional permite contar puntos
  // aunque la confirmación haya sido posterior al cierre diario.
  if (!phase8Unlocked && isPhase32ForecastLate(forecastMeta)) {
    return zeroPhase32Score('Pronóstico 8° registrado fuera del horario permitido.', { latePenalty: true });
  }

  return matches.reduce((acc, match) => {
    const result = evaluatePhase16Prediction(match, predictions, realResults);
    if (result.winnerHit !== null || result.scoreHit !== null || result.penaltyHit !== null) acc.evaluatedMatches += 1;
    acc.winnerPoints += result.winnerPoints || 0;
    acc.scorePoints += result.scorePoints || 0;
    acc.penaltyPoints += result.penaltyPoints || 0;
    acc.totalPoints += result.points;
    return acc;
  }, { winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, totalPoints: 0, evaluatedMatches: 0 });
}

export function evaluatePhase16Prediction(match, predictions, realResults) {
  return evaluatePhase32Prediction(match, predictions, realResults);
}

export function phase16PlaceholderLabel(code) {
  return PHASE16_PLACEHOLDERS[code] || 'Por definir';
}


// =============================
// FASE 4 · CUARTOS DE FINAL
// =============================
export function buildQuarterFinals() {
  return [
    { id:'QF-01', fifaId:'53452525', matchNo:'4°-01', phase:'QUARTERFINAL', home:'FRA', away:'MAR', kickoff:'2026-07-09T15:00:00-05:00', venue:'FIFA World Cup 2026', sourceR16:['R16-02','R16-01'] },
    { id:'QF-02', fifaId:'53452527', matchNo:'4°-02', phase:'QUARTERFINAL', home:'ESP', away:'BEL', kickoff:'2026-07-10T14:00:00-05:00', venue:'FIFA World Cup 2026', sourceR16:['R16-05','R16-06'] },
    { id:'QF-03', fifaId:'53452529', matchNo:'4°-03', phase:'QUARTERFINAL', home:'NOR', away:'ENG', kickoff:'2026-07-11T16:00:00-05:00', venue:'FIFA World Cup 2026', sourceR16:['R16-03','R16-04'] },
    { id:'QF-04', fifaId:'53452531', matchNo:'4°-04', phase:'QUARTERFINAL', home:'ARG', away:'SUI', kickoff:'2026-07-11T20:00:00-05:00', venue:'FIFA World Cup 2026', sourceR16:['R16-07','R16-08'] }
  ];
}

export function phase4Complete(matches, predictions) {
  return (matches || []).every(match => {
    const prediction = predictions?.[match.id];
    if (!prediction || prediction.homeGoals === '' || prediction.awayGoals === '' || prediction.homeGoals == null || prediction.awayGoals == null) return false;
    const tie = Number(prediction.homeGoals) === Number(prediction.awayGoals);
    return !tie || Boolean(prediction.penaltyWinner);
  });
}

export function phase4TeamsResolved(match){
  return Boolean(match?.home) && Boolean(match?.away);
}

function isPhase4ForecastLate(forecastMeta = {}) {
  if (forecastMeta.role === 'admin') return false;
  const confirmedAt = forecastMeta.confirmedAt || forecastMeta.confirmed_at;
  if (!confirmedAt) return true;

  // Ecuador UTC-5. Cierre permitido: 2026-07-09 14:59 EC.
  // Desde 15:00 EC = 2026-07-09T20:00:00Z, queda fuera de horario.
  const cutoffUtc = Date.UTC(2026, 6, 9, 20, 0, 0, 0);
  const confirmedTime = new Date(confirmedAt).getTime();
  return Number.isFinite(confirmedTime) && confirmedTime >= cutoffUtc;
}

export function calculatePhase4Score(matches, predictions, realResults, forecastMeta = {}) {
  const phase4Unlocked = Boolean(forecastMeta.phase4PredictionsUnlocked);

  if (isPhase32ForecastNotConfirmed(forecastMeta)) {
    return zeroPhase32Score('Pronóstico 4° no confirmado. No genera puntos.', { notConfirmed: true });
  }

  // Si ADMIN habilita excepcionalmente phase4_predictions_unlocked=true,
  // se permite contar puntos aun si la confirmación fue posterior al cierre.
  if (!phase4Unlocked && isPhase4ForecastLate(forecastMeta)) {
    return zeroPhase32Score('Pronóstico 4° registrado fuera del horario permitido.', { latePenalty: true });
  }

  return matches.reduce((acc, match) => {
    const result = evaluatePhase4Prediction(match, predictions, realResults);
    if (result.winnerHit !== null || result.scoreHit !== null || result.penaltyHit !== null) acc.evaluatedMatches += 1;
    acc.winnerPoints += result.winnerPoints || 0;
    acc.scorePoints += result.scorePoints || 0;
    acc.penaltyPoints += result.penaltyPoints || 0;
    acc.totalPoints += result.points;
    return acc;
  }, { winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, totalPoints: 0, evaluatedMatches: 0 });
}

export function evaluatePhase4Prediction(match, predictions, realResults) {
  return evaluatePhase32Prediction(match, predictions, realResults);
}
