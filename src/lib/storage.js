import { createClient } from '@supabase/supabase-js';
import { buildGroupMatches } from './worldcupData';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

const LS = 'quiniela2026:v1';

const defaultState = {
  participants: [{id:'admin', name:'Administrador', uniqueKey:'ADMIN2026!', role:'admin'}],
  forecasts: [],
  matchResults: {},
  participantScores: {}
};

function loadLocal(){
  try {
    return JSON.parse(localStorage.getItem(LS)) || defaultState;
  } catch {
    return defaultState;
  }
}

function saveLocal(s){
  localStorage.setItem(LS, JSON.stringify(s));
}

function normalizeResult(row) {
  if (!row) return null;
  return {
    matchId: row.match_id || row.matchId,
    homeGoals: row.home_goals ?? row.homeGoals,
    awayGoals: row.away_goals ?? row.awayGoals,
    status: row.status || 'scheduled',
    source: row.source || 'manual',
    updatedAt: row.updated_at || row.updatedAt
  };
}

export async function getMatches(){
  return buildGroupMatches();
}

export async function loginOrCreateParticipant(name, uniqueKey){
  const clean = name.trim();
  if (!clean || !uniqueKey.trim()) throw new Error('Ingrese nombre y clave única.');

  if (supabase) {
    const { data: existing, error } = await supabase
      .from('participants')
      .select('*')
      .eq('unique_key', uniqueKey)
      .maybeSingle();

    if (error) throw error;
    if (existing) return { id: existing.id, name: existing.name, uniqueKey: existing.unique_key, role: existing.role };
    const settings = await getAppSettings();
    const isAdminKey = uniqueKey === 'ADMIN2026!';
    if (!settings.registrationEnabled && !isAdminKey) throw new Error('El registro de nuevos participantes se encuentra cerrado por el administrador.');

    const { data, error: insErr } = await supabase
      .from('participants')
      .insert({name: clean, unique_key: uniqueKey, role:'user'})
      .select('*')
      .single();

    if (insErr) throw insErr;
    return { id: data.id, name:data.name, uniqueKey:data.unique_key, role:data.role };
  }

  const s = loadLocal();
  let p = s.participants.find(x => x.uniqueKey === uniqueKey);
  if (!p) {
    p = { id: crypto.randomUUID(), name: clean, uniqueKey, role: uniqueKey === 'ADMIN2026!' ? 'admin':'user' };
    s.participants.push(p);
    saveLocal(s);
  }
  return p;
}

export async function saveForecast(participantId, predictions, confirmed=false){
  if (supabase) {
    const existing = await getForecast(participantId);
    if (existing?.confirmed && !confirmed) {
      throw new Error('El pronóstico de FASE 1 ya fue confirmado y no puede modificarse.');
    }

    const { error } = await supabase.from('forecasts').upsert({
      participant_id: participantId,
      predictions,
      confirmed,
      status: confirmed ? 'confirmed' : 'draft',
      confirmed_at: confirmed ? (existing?.confirmedAt || new Date().toISOString()) : null
    }, { onConflict:'participant_id' });

    if (error) throw error;
    return true;
  }

  const s = loadLocal();
  const i = s.forecasts.findIndex(f => f.participantId === participantId);
  const current = i >= 0 ? s.forecasts[i] : null;
  if (current?.confirmed && !confirmed) {
    throw new Error('El pronóstico de FASE 1 ya fue confirmado y no puede modificarse.');
  }

  const rec = {
    participantId,
    predictions,
    confirmed,
    status: confirmed ? 'confirmed' : 'draft',
    confirmedAt: confirmed ? (current?.confirmedAt || new Date().toISOString()) : null
  };

  if (i >= 0) s.forecasts[i] = rec; else s.forecasts.push(rec);
  saveLocal(s);
  return true;
}

export async function getForecast(participantId){
  if (supabase) {
    const { data, error } = await supabase
      .from('forecasts')
      .select('*')
      .eq('participant_id', participantId)
      .maybeSingle();

    if (error) throw error;
    return data ? {
      predictions:data.predictions || {},
      confirmed:data.confirmed,
      status:data.status || (data.confirmed ? 'confirmed' : 'draft'),
      confirmedAt:data.confirmed_at
    } : null;
  }

  return loadLocal().forecasts.find(f => f.participantId === participantId) || null;
}

export async function getRealScores(){
  if (supabase) {
    const { data, error } = await supabase
      .from('match_results')
      .select('*');

    if (error) throw error;

    return Object.fromEntries(
      (data || []).map(row => {
        const r = normalizeResult(row);
        return [r.matchId, r];
      })
    );
  }

  return loadLocal().matchResults || {};
}

export async function saveRealScore(adminParticipantId, matchId, homeGoals, awayGoals, status='finished'){
  if (!adminParticipantId) throw new Error('Solo el administrador puede registrar Score real.');
  if (!matchId) throw new Error('Partido requerido.');

  if (supabase) {
    const { data, error } = await supabase.functions.invoke('admin-save-real-score', {
      body: {
        adminParticipantId,
        matchId,
        homeGoals,
        awayGoals,
        status
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || 'No se pudo guardar el Score real.');
    return true;
  }

  const s = loadLocal();
  const admin = s.participants.find(p => p.id === adminParticipantId);
  if (!admin || admin.role !== 'admin') throw new Error('Solo el administrador puede registrar Score real.');

  const parsedHome = homeGoals === '' || homeGoals == null ? null : Number(homeGoals);
  const parsedAway = awayGoals === '' || awayGoals == null ? null : Number(awayGoals);

  s.matchResults = s.matchResults || {};
  s.matchResults[matchId] = {
    matchId,
    homeGoals: parsedHome,
    awayGoals: parsedAway,
    status,
    source: 'manual-admin',
    updatedAt: new Date().toISOString()
  };
  saveLocal(s);
  return true;
}

export async function saveParticipantScore(participantId, score){
  if (!participantId || !score) return false;

  if (supabase) {
    const { error } = await supabase.from('participant_scores').upsert({
      participant_id: participantId,
      phase: 'phase1',
      winner_points: score.winnerPoints,
      score_points: score.scorePoints,
      total_points: score.totalPoints,
      evaluated_matches: score.evaluatedMatches,
      updated_at: new Date().toISOString()
    }, { onConflict:'participant_id,phase' });

    if (error) throw error;
    return true;
  }

  const s = loadLocal();
  s.participantScores = s.participantScores || {};
  s.participantScores[participantId] = score;
  saveLocal(s);
  return true;
}

export async function listParticipantsWithForecasts(){
  if (supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('id,name,unique_key,role,created_at,forecasts(predictions,confirmed,status,confirmed_at,updated_at),participant_scores(total_points,winner_points,score_points,evaluated_matches,updated_at)')
      .order('created_at');

    if (error) throw error;

    return data.map(p => ({
      id:p.id,
      name:p.name,
      uniqueKey:p.unique_key,
      role:p.role,
      forecast:p.forecasts?.[0],
      score:p.participant_scores?.[0] || { total_points:0, winner_points:0, score_points:0, evaluated_matches:0 }
    }));
  }

  const s = loadLocal();
  return s.participants.map(p => ({
    ...p,
    forecast:s.forecasts.find(f=>f.participantId===p.id),
    score:s.participantScores?.[p.id] || { totalPoints:0, winnerPoints:0, scorePoints:0, evaluatedMatches:0 }
  }));
}



export async function getDailyEditorialSummary(date, options = {}){
  const genericSummary = `Claves de la jornada:
• No se encontraron noticias deportivas externas disponibles para complementar esta jornada.
• El ranking se genera con los marcadores reales cargados por administración.`;

  if (!supabase) {
    return {
      ok: false,
      source: 'local-fallback',
      summaryText: genericSummary
    };
  }

  const body = {
    date,
    debug: Boolean(options.debug),
    daysBack: options.daysBack ?? 30,
    query: options.query || 'FIFA World Cup 2026 OR Copa Mundial 2026 OR Mundial 2026'
  };

  const { data, error } = await supabase.functions.invoke('daily-editorial-summary', { body });

  if (error) {
    console.warn('No se pudo obtener resumen editorial:', error.message);
    return {
      ok: false,
      source: 'function-error',
      summaryText: genericSummary
    };
  }

  return data;
}


export async function getAppSettings(){
  const defaults = {
    registrationEnabled: true,
    phase1PredictionsLocked: false
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value');

    if (error) {
      console.warn('No se pudieron leer app_settings:', error.message);
      return defaults;
    }

    const map = Object.fromEntries((data || []).map(row => [row.key, row.value]));
    return {
      registrationEnabled: map.registration_enabled ?? true,
      phase1PredictionsLocked: map.phase1_predictions_locked ?? false
    };
  }

  const s = loadLocal();
  s.settings = s.settings || defaults;
  saveLocal(s);
  return s.settings;
}

export async function adminPhaseControl(adminParticipantId, action, value){
  if (!adminParticipantId) throw new Error('Administrador requerido.');

  if (supabase) {
    const { data, error } = await supabase.functions.invoke('admin-phase-control', {
      body: { adminParticipantId, action, value }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || 'No se pudo ejecutar la acción administrativa.');
    return data;
  }

  const s = loadLocal();
  const admin = s.participants.find(p => p.id === adminParticipantId);
  if (!admin || admin.role !== 'admin') throw new Error('Solo el rol administrador puede ejecutar esta acción.');

  s.settings = s.settings || {
    registrationEnabled: true,
    phase1PredictionsLocked: false
  };

  if (action === 'set_registration_enabled') {
    s.settings.registrationEnabled = Boolean(value);
    saveLocal(s);
    return { ok:true, message: Boolean(value) ? 'Registro de nuevos usuarios habilitado' : 'Registro de nuevos usuarios inhabilitado' };
  }

  if (action === 'lock_all_predictions') {
    s.settings.phase1PredictionsLocked = true;
    s.forecasts = s.forecasts.map(f => ({
      ...f,
      confirmed:true,
      status:'confirmed',
      confirmedAt:f.confirmedAt || new Date().toISOString()
    }));
    saveLocal(s);
    return { ok:true, message:'Todos los pronósticos fueron bloqueados como CONFIRMADOS' };
  }

  if (action === 'unlock_all_predictions') {
    s.settings.phase1PredictionsLocked = false;
    s.forecasts = s.forecasts.map(f => ({
      ...f,
      confirmed:false,
      status:'draft',
      confirmedAt:null
    }));
    saveLocal(s);
    return { ok:true, message:'Todos los usuarios fueron habilitados para pronosticar nuevamente' };
  }

  throw new Error('Acción administrativa no reconocida.');
}


export async function deleteParticipantAndForecast(participantId){
  if (!participantId) throw new Error('Seleccione un participante.');

  if (supabase) {
    const { data: participant, error: readErr } = await supabase
      .from('participants')
      .select('id,role')
      .eq('id', participantId)
      .maybeSingle();

    if (readErr) throw readErr;
    if (!participant) throw new Error('El participante no existe.');
    if (participant.role === 'admin') throw new Error('No se permite eliminar usuarios administradores.');

    const { error } = await supabase.from('participants').delete().eq('id', participantId);
    if (error) throw error;
    return true;
  }

  const s = loadLocal();
  const participant = s.participants.find(p => p.id === participantId);
  if (!participant) throw new Error('El participante no existe.');
  if (participant.role === 'admin') throw new Error('No se permite eliminar usuarios administradores.');

  s.participants = s.participants.filter(p => p.id !== participantId);
  s.forecasts = s.forecasts.filter(f => f.participantId !== participantId);
  if (s.participantScores) delete s.participantScores[participantId];
  saveLocal(s);
  return true;
}


export async function syncResultsAndScores(){
  if (!supabase) return { ok:false, message:'Modo demo local: sincronización automática no disponible.' };

  const { data, error } = await supabase.functions.invoke('sync-worldcup-results', {
    body: { trigger: 'app-login' }
  });

  if (error) {
    console.warn('No se pudo sincronizar resultados automáticamente:', error.message);
    return { ok:false, message:error.message };
  }

  return data;
}

