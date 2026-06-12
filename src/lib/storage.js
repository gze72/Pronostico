import { createClient } from '@supabase/supabase-js';
import { buildGroupMatches } from './worldcupData';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
const LS = 'quiniela2026:v1';
const defaultState = { participants: [{id:'admin', name:'Administrador', uniqueKey:'ADMIN2026!', role:'admin'}], forecasts: [] };
function loadLocal(){ try { return JSON.parse(localStorage.getItem(LS)) || defaultState; } catch { return defaultState; } }
function saveLocal(s){ localStorage.setItem(LS, JSON.stringify(s)); }
export async function getMatches(){ return buildGroupMatches(); }
export async function loginOrCreateParticipant(name, uniqueKey){
  const clean = name.trim();
  if (!clean || !uniqueKey.trim()) throw new Error('Ingrese nombre y clave única.');
  if (supabase) {
    const { data: existing, error } = await supabase.from('participants').select('*').eq('unique_key', uniqueKey).maybeSingle();
    if (error) throw error;
    if (existing) return { id: existing.id, name: existing.name, uniqueKey: existing.unique_key, role: existing.role };
    const { data, error: insErr } = await supabase.from('participants').insert({name: clean, unique_key: uniqueKey, role:'user'}).select('*').single();
    if (insErr) throw insErr;
    return { id: data.id, name:data.name, uniqueKey:data.unique_key, role:data.role };
  }
  const s = loadLocal();
  let p = s.participants.find(x => x.uniqueKey === uniqueKey);
  if (!p) { p = { id: crypto.randomUUID(), name: clean, uniqueKey, role: uniqueKey === 'ADMIN2026!' ? 'admin':'user' }; s.participants.push(p); saveLocal(s); }
  return p;
}
export async function saveForecast(participantId, predictions, confirmed=false){
  if (supabase) {
    const { error } = await supabase.from('forecasts').upsert({
      participant_id: participantId,
      predictions,
      confirmed,
      status: confirmed ? 'confirmed' : 'draft',
      confirmed_at: confirmed ? new Date().toISOString() : null
    }, { onConflict:'participant_id' });
    if (error) throw error;
    return true;
  }
  const s = loadLocal();
  const i = s.forecasts.findIndex(f => f.participantId === participantId);
  const rec = {participantId, predictions, confirmed, status: confirmed ? 'confirmed' : 'draft', confirmedAt: confirmed ? new Date().toISOString():null};
  if (i >= 0) s.forecasts[i] = rec; else s.forecasts.push(rec);
  saveLocal(s); return true;
}
export async function getForecast(participantId){
  if (supabase) {
    const { data, error } = await supabase.from('forecasts').select('*').eq('participant_id', participantId).maybeSingle();
    if (error) throw error;
    return data ? { predictions:data.predictions || {}, confirmed:data.confirmed, status:data.status || (data.confirmed ? 'confirmed' : 'draft'), confirmedAt:data.confirmed_at } : null;
  }
  return loadLocal().forecasts.find(f => f.participantId === participantId) || null;
}
export async function listParticipantsWithForecasts(){
  if (supabase) {
    const { data, error } = await supabase.from('participants').select('id,name,unique_key,role,created_at,forecasts(predictions,confirmed,status,confirmed_at,updated_at)').order('created_at');
    if (error) throw error;
    return data.map(p => ({id:p.id, name:p.name, uniqueKey:p.unique_key, role:p.role, forecast:p.forecasts?.[0]}));
  }
  const s = loadLocal();
  return s.participants.map(p => ({...p, forecast:s.forecasts.find(f=>f.participantId===p.id)}));
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

    // forecasts and prediction_confirmations are linked with ON DELETE CASCADE.
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
  saveLocal(s);
  return true;
}
