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
