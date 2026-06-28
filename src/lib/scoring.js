import { GROUPS, TEAMS, ROUND_OF_32_TEMPLATE, REAL_ROUND_OF_32_MATCHES } from './worldcupData';

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
  // Segunda fase oficial cargada de forma estática según los clasificados definidos por el administrador.
  // No depende de la tabla de grupos ni de ROUND_OF_32_TEMPLATE para evitar cruces calculados incorrectos.
  return REAL_ROUND_OF_32_MATCHES.map(match => ({ ...match }));
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
  const pred = predictions?.[match.id] || {};
  const real = realResults?.[match.id] || {};

  const predHasScore = pred.homeGoals !== '' && pred.awayGoals !== '' && pred.homeGoals != null && pred.awayGoals != null;
  const realHasScore = real.homeGoals !== '' && real.awayGoals !== '' && real.homeGoals != null && real.awayGoals != null;

  if (!predHasScore || !realHasScore) {
    return { winnerHit: null, scoreHit: null, penaltyHit: null, points: 0, winnerPoints: 0, scorePoints: 0, penaltyPoints: 0 };
  }

  const predHome = Number(pred.homeGoals);
  const predAway = Number(pred.awayGoals);
  const realHome = Number(real.homeGoals);
  const realAway = Number(real.awayGoals);

  const predTie = predHome === predAway;
  const realTie = realHome === realAway;
  const realWentPenalties = Boolean(real.wentPenalties) || realTie;

  const predWinner = phase32WinnerFromScore(match, pred);
  const realWinner = phase32WinnerFromScore(match, real);

  /*
    Regla definitiva FASE 2 / Pronóstico 16°:

    Partido con ganador directo:
    - 2 puntos por acertar ganador.
    - 1 punto por acertar resultado exacto.
    - Máximo: 3 puntos.

    Partido empatado y definido por penales:
    - 1 punto por acertar que el partido terminó empatado.
    - 1 punto por acertar resultado exacto.
    - 1 punto bonus por acertar ganador por penales.
    - Máximo: 3 puntos.

    Total máximo de fase:
    16 partidos x 3 puntos = 48 puntos.
  */
  const winnerHit = realWentPenalties
    ? predTie
    : (predWinner && realWinner ? predWinner === realWinner : false);

  const scoreHit = predHome === realHome && predAway === realAway;

  const penaltyHit = realWentPenalties
    ? Boolean(predTie && pred.penaltyWinner && real.penaltyWinner && pred.penaltyWinner === real.penaltyWinner)
    : null;

  const winnerPoints = winnerHit ? (realWentPenalties ? 1 : 2) : 0;
  const scorePoints = scoreHit ? 1 : 0;
  const penaltyPoints = penaltyHit ? 1 : 0;

  return {
    winnerHit,
    scoreHit,
    penaltyHit,
    winnerPoints,
    scorePoints,
    penaltyPoints,
    points: winnerPoints + scorePoints + penaltyPoints
  };
}

export function calculatePhase32Score(matches, predictions, realResults) {
  return matches.reduce((acc, match) => {
    const result = evaluatePhase32Prediction(match, predictions, realResults);
    if (result.winnerHit !== null || result.scoreHit !== null || result.penaltyHit !== null) acc.evaluatedMatches += 1;
    acc.winnerPoints += result.winnerPoints || 0;
    acc.scorePoints += result.scorePoints || 0;
    acc.penaltyPoints += result.penaltyPoints || 0;
    acc.totalPoints += result.points || 0;
    return acc;
  }, { winnerPoints: 0, scorePoints: 0, penaltyPoints: 0, totalPoints: 0, evaluatedMatches: 0 });
}
