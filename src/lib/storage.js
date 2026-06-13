import { createClient } from '@supabase/supabase-js';
import { buildGroupMatches } from './worldcupData';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

const LS = 'quiniela2026:v1';
const defaultState = {
  participants: [{ id: 'admin', name: 'Administrador', uniqueKey: 'ADMIN2026!', role: 'admin' }],
  forecasts: []
};

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS)) || defaultState;
  } catch {
    return defaultState;
  }
}

function saveLocal(s) {
  localStorage.setItem(LS, JSON.stringify(s));
}

function saveLocalForecast(participantId, predictions, confirmed = false, synced = false) {
  const s = loadLocal();
  const i = s.forecasts.findIndex(f => f.participantId === participantId);
  const rec = {
    participantId,
    predictions,
    confirmed,
    status: confirmed ? 'confirmed' : 'draft',
    confirmedAt: confirmed ? new Date().toISOString() : null,
    synced,
    savedAt: new Date().toISOString()
  };
  if (i >= 0) s.forecasts[i] = rec;
  else s.forecasts.push(rec);
  saveLocal(s);
  return rec;
}

function friendlySupabaseError(error) {
  const msg = String(error?.message || error || '').trim();
  if (!msg) return 'No se pudo guardar el pronóstico.';
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'No se pudo conectar con Supabase en este momento. El borrador quedó protegido localmente; intente guardar nuevamente en unos segundos.';
  }
  return msg;
}

async function retry(operation, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 450 * (i + 1)));
    }
  }
  throw lastError;
}

export async function getMatches() {
  return buildGroupMatches();
}

export async function loginOrCreateParticipant(name, uniqueKey) {
  const clean = name.trim();
  const cleanKey = uniqueKey.trim();
  if (!clean || !cleanKey) throw new Error('Ingrese nombre y clave única.');

  if (supabase) {
    const { data: existing, error } = await supabase
      .from('participants')
      .select('*')
      .eq('unique_key', cleanKey)
      .maybeSingle();
    if (error) throw error;
    if (existing) return { id: existing.id, name: existing.name, uniqueKey: existing.unique_key, role: existing.role };

    const { data, error: insErr } = await supabase
      .from('participants')
      .insert({ name: clean, unique_key: cleanKey, role: 'user' })
      .select('*')
      .single();
    if (insErr) throw insErr;
    return { id: data.id, name: data.name, uniqueKey: data.unique_key, role: data.role };
  }

  const s = loadLocal();
  let p = s.participants.find(x => x.uniqueKey === cleanKey);
  if (!p) {
    p = { id: crypto.randomUUID(), name: clean, uniqueKey: cleanKey, role: cleanKey === 'ADMIN2026!' ? 'admin' : 'user' };
    s.participants.push(p);
    saveLocal(s);
  }
  return p;
}

export async function saveForecast(participantId, predictions, confirmed = false) {
  const payload = {
    participant_id: participantId,
    predictions,
    confirmed,
    status: confirmed ? 'confirmed' : 'draft',
    confirmed_at: confirmed ? new Date().toISOString() : null
  };

  // Guardado preventivo local: evita pérdida del borrador ante errores de red.
  saveLocalForecast(participantId, predictions, confirmed, false);

  if (supabase) {
    try {
      await retry(async () => {
        // Flujo estable: primero actualiza el registro existente.
        const { data: updated, error: updateError } = await supabase
          .from('forecasts')
          .update(payload)
          .eq('participant_id', participantId)
          .select('id')
          .maybeSingle();

        if (updateError) throw updateError;
        if (updated?.id) return updated;

        // Si todavía no existe registro, lo crea. Si otro clic lo creó antes, cae a update.
        const { data: inserted, error: insertError } = await supabase
          .from('forecasts')
          .insert(payload)
          .select('id')
          .single();

        if (insertError) {
          if (insertError.code === '23505' || /duplicate key|unique/i.test(insertError.message || '')) {
            const { data: updatedAfterConflict, error: conflictUpdateError } = await supabase
              .from('forecasts')
              .update(payload)
              .eq('participant_id', participantId)
              .select('id')
              .maybeSingle();
            if (conflictUpdateError) throw conflictUpdateError;
            return updatedAfterConflict;
          }
          throw insertError;
        }
        return inserted;
      });

      saveLocalForecast(participantId, predictions, confirmed, true);
      return { synced: true };
    } catch (error) {
      const safe = new Error(friendlySupabaseError(error));
      safe.original = error;
      safe.localBackup = true;
      throw safe;
    }
  }

  saveLocalForecast(participantId, predictions, confirmed, true);
  return { synced: false };
}

export async function getForecast(participantId) {
  const local = loadLocal().forecasts.find(f => f.participantId === participantId) || null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .eq('participant_id', participantId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          predictions: data.predictions || {},
          confirmed: data.confirmed,
          status: data.status || (data.confirmed ? 'confirmed' : 'draft'),
          confirmedAt: data.confirmed_at,
          synced: true
        };
      }
    } catch {
      // Si Supabase no responde, recupera el respaldo local.
      return local;
    }
  }

  return local;
}

export async function listParticipantsWithForecasts() {
  if (supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('id,name,unique_key,role,created_at,forecasts(predictions,confirmed,status,confirmed_at,updated_at)')
      .order('created_at');
    if (error) throw error;
    return data.map(p => ({ id: p.id, name: p.name, uniqueKey: p.unique_key, role: p.role, forecast: p.forecasts?.[0] }));
  }
  const s = loadLocal();
  return s.participants.map(p => ({ ...p, forecast: s.forecasts.find(f => f.participantId === p.id) }));
}

export async function deleteParticipantAndForecast(participantId) {
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
  saveLocal(s);
  return true;
}
