import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, BarChart3, LogOut, ShieldCheck, CheckCircle2, LockKeyhole, Menu, X, Save } from 'lucide-react';
import { GROUPS, TEAMS } from './lib/worldcupData';
import { allGroupsCompleted, buildQualified, buildRoundOf32, calculateParticipantScore, calculateStandings, evaluatePrediction, groupCompleted, winnerLabel } from './lib/scoring';
import { deleteParticipantAndForecast, getForecast, getMatches, getRealScores, listParticipantsWithForecasts, loginOrCreateParticipant, saveForecast, saveParticipantScore, saveRealScore, syncResultsAndScores, supabase } from './lib/storage';
import './styles.css';

function App(){
  const [participant,setParticipant] = useState(null);
  const [matches,setMatches] = useState([]);
  const [realScores,setRealScores] = useState({});
  const [predictions,setPredictions] = useState({});
  const [activeGroup,setActiveGroup] = useState('A');
  const [view,setView] = useState('pronostico');
  const [sidebar,setSidebar] = useState(false);
  const [toast,setToast] = useState('');
  const [forecastStatus,setForecastStatus] = useState('empty');
  const [showPrizePopup,setShowPrizePopup] = useState(false);
  const [syncStatus,setSyncStatus] = useState('Sincronizando resultados...');
  useEffect(()=>{ 
    async function boot(){
      const loadedMatches = await getMatches();
      setMatches(loadedMatches);
      try {
        const sync = await syncResultsAndScores();
        setSyncStatus(sync?.ok ? 'Resultados sincronizados' : (sync?.message || 'Resultados recalculados con datos existentes'));
      } catch {
        setSyncStatus('No se pudo sincronizar resultados en línea');
      }
      setRealScores(await getRealScores());
    }
    boot();
  },[]);
  useEffect(()=>{ if(participant) getForecast(participant.id).then(f=>{ setPredictions(f?.predictions || {}); setForecastStatus(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); }); },[participant]);
  const currentScore = calculateParticipantScore(matches,predictions,realScores);
  useEffect(()=>{ if(participant && matches.length) saveParticipantScore(participant.id,currentScore).catch(()=>{}); },[participant, matches, predictions, realScores]);
  const completedCount = GROUPS.filter(g=>groupCompleted(g.id,matches,predictions)).length;
  const canConfirm = allGroupsCompleted(matches,predictions);
  const setScore = (matchId, field, value) => {
    if (forecastStatus === 'confirmed') return;
    if (value !== '' && (Number(value) < 0 || Number(value) > 30)) return;
    setPredictions(prev => ({...prev, [matchId]: {...(prev[matchId]||{}), [field]: value}}));
  };
  const persist = async (confirmed=false) => {
    try {
      await saveForecast(participant.id, predictions, confirmed);
      setForecastStatus(confirmed ? 'confirmed' : 'draft');
      if (confirmed) setShowPrizePopup(true);
      setToast(confirmed ? 'Pronóstico confirmado y registrado.' : 'Borrador guardado en Supabase. Puede salir y volver sin perderlo.');
    } catch (ex) {
      setToast(ex.message || 'No se pudo guardar el pronóstico.');
    }
    setTimeout(()=>setToast(''), 3600);
  };
  if(!participant) return <Login onLogin={setParticipant}/>;
  return <div className="app-shell">
    <Watermark />
    <aside className={`sidebar ${sidebar?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Trophy size={20}/></div><div><b>Zambranada 2026</b><span>{supabase ? 'Supabase activo' : 'Modo demo local'}</span></div></div>
      <nav>
        <button className={view==='pronostico'?'active':''} onClick={()=>{setView('pronostico'); setSidebar(false)}}><Trophy/> Pronóstico</button>
        <button className={view==='reporte'?'active':''} onClick={()=>{setView('reporte'); setSidebar(false)}}><BarChart3/> Reporte</button>
        {participant.role === 'admin' && <button className={view==='admin'?'active':''} onClick={()=>{setView('admin'); setSidebar(false)}}><ShieldCheck/> Administración</button>}
      </nav>
      <div className="user-card"><span>{participant.role === 'admin' ? 'Administrador' : 'Participante'}</span><b>{participant.name}</b><div className="score-mini"><strong>{currentScore.totalPoints}</strong><small>puntos FASE 1</small></div><button onClick={()=>setParticipant(null)}><LogOut size={16}/> Salir</button></div>
    </aside>
    <main className="content">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(!sidebar)}>{sidebar?<X/>:<Menu/>}</button><div><p>Campeonato Mundial de Fútbol 2026 · Zambranada</p><h1>{view==='pronostico'?'Registro de pronóstico (FASE 1)':view==='reporte'?'Reportes':'Panel administrador'}</h1></div><div className="topbar-actions"><div className="sync-pill">{syncStatus}</div><div className={`status-pill ${forecastStatus}`}><Save size={16}/>{forecastStatus === 'confirmed' ? 'Confirmado' : forecastStatus === 'draft' ? 'Borrador guardado' : 'Sin guardar'}</div><div className="progress-pill"><CheckCircle2 size={16}/>{completedCount}/12 grupos</div></div></header>
      {view==='pronostico' && <PredictionView matches={matches} predictions={predictions} realScores={realScores} activeGroup={activeGroup} setActiveGroup={setActiveGroup} setScore={setScore} persist={persist} canConfirm={canConfirm} forecastStatus={forecastStatus}/>} 
      {view==='reporte' && <ReportView participant={participant} matches={matches} predictions={predictions} realScores={realScores}/>} 
      {view==='admin' && participant.role === 'admin' && <AdminView matches={matches} realScores={realScores} setRealScores={setRealScores} participant={participant}/>} 
      {toast && <div className="toast">{toast}</div>}
      {showPrizePopup && <PrizePopup onClose={() => setShowPrizePopup(false)} />}
    </main>
  </div>
}

function PrizePopup({ onClose }) {
  return (
    <div className="prize-overlay" role="dialog" aria-modal="true" aria-labelledby="prize-title">
      <div className="prize-card">
        <div className="prize-sparkles">🎉 ⚽ 🏆 😎</div>
        <h2 id="prize-title">¡Congratulaciones!</h2>
        <p>
          Estás participando por los <strong>$30,00</strong> si aciertas el <strong>80%</strong> de los clasificados a la 2da fase.
        </p>
        <p className="prize-note">
          Sorteo entre quienes acierten. Ya saben… 😉😄⚽
        </p>
        <button className="primary prize-button" onClick={onClose}>¡Entendido!</button>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const [name,setName] = useState(''); const [key,setKey] = useState(''); const [err,setErr] = useState('');
  async function submit(e){ e.preventDefault(); try { setErr(''); const p = await loginOrCreateParticipant(name, key); onLogin(p); } catch(ex){ setErr(ex.message); } }
  return <div className="login-screen"><Watermark/><section className="login-card"><div className="brand large"><div className="brand-mark"><Trophy size={26}/></div><div><b>Zambranada Mundial 2026</b><span>Quiniela privada · Mundial 2026</span></div></div><form onSubmit={submit}><label>Nombre del participante<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Gregory Zambrano"/></label><label>Clave única<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Código personal"/></label>{err && <p className="error">{err}</p>}<button className="primary">Ingresar / Registrar</button><p className="hint"><LockKeyhole size={14}/> Acceso privado por participante mediante clave única.</p></form></section></div>
}
function PredictionView({matches,predictions,realScores,activeGroup,setActiveGroup,setScore,persist,canConfirm,forecastStatus}){
  const groupMatches = matches.filter(m=>m.groupId===activeGroup);
  const standings = calculateStandings(activeGroup,matches,predictions);
  const r32 = canConfirm ? buildRoundOf32(matches,predictions) : [];
  const qualified = canConfirm ? buildQualified(matches,predictions) : null;
  const locked = forecastStatus === 'confirmed';

  return <div className="prediction-grid"><section className="group-rail">{GROUPS.map(g=>{const done=groupCompleted(g.id,matches,predictions);return <button key={g.id} className={`${activeGroup===g.id?'active':''} ${done?'done':''}`} onClick={()=>setActiveGroup(g.id)}><span>Grupo {g.id}</span>{done && <CheckCircle2/>}</button>})}</section><section className="panel"><div className="panel-head"><div><span>Fase de grupos</span><h2>Grupo {activeGroup}</h2>{locked && <p className="lock-note">Pronóstico confirmado. La FASE 1 quedó bloqueada para edición.</p>}</div><button className="ghost" disabled={locked} onClick={()=>persist(false)}>{locked ? 'Borrador bloqueado' : 'Guardar borrador'}</button></div><div className="matches">{groupMatches.map(m=>{const ev=evaluatePrediction(m.id,predictions,realScores); return <article className="match-card score-card" key={m.id}><Team code={m.home}/><input type="number" min="0" max="30" disabled={locked} value={predictions[m.id]?.homeGoals ?? ''} onChange={e=>setScore(m.id,'homeGoals',e.target.value)} /><span className="colon">:</span><input type="number" min="0" max="30" disabled={locked} value={predictions[m.id]?.awayGoals ?? ''} onChange={e=>setScore(m.id,'awayGoals',e.target.value)} /><Team code={m.away}/><b className="winner">{winnerLabel(m,predictions[m.id])}</b><div className="real-score"><small>Score real</small><span>{formatRealScore(realScores[m.id])}</span></div><div className="hit-box"><small>Ganador</small><b className={ev.winnerHit === null ? 'pending-hit' : ev.winnerHit ? 'hit-ok' : 'hit-bad'}>{hitIcon(ev.winnerHit)}</b></div><div className="hit-box"><small>Score</small><b className={ev.scoreHit === null ? 'pending-hit' : ev.scoreHit ? 'hit-ok' : 'hit-bad'}>{hitIcon(ev.scoreHit)}</b></div></article>})}</div><Standings standings={standings}/><div className="confirm-row"><button className="primary" disabled={!canConfirm || locked} onClick={()=>persist(true)}>{locked ? 'Pronóstico confirmado' : 'Confirmar Pronóstico'}</button>{!canConfirm && <span>Complete los 12 grupos para habilitar la confirmación.</span>}{locked && <span>No se permiten cambios después de confirmar FASE 1.</span>}</div></section><section className="panel slim"><h3>Llave proyectada</h3>{!canConfirm ? <p className="muted">La llave se mostrará al completar toda la fase de grupos.</p> : <><p className="qualified-summary">32 clasificados únicos: 1.º y 2.º de cada grupo + 8 mejores terceros.</p><div className="bracket-list">{r32.map(m=><div key={m.id} className={m.duplicateWarning ? 'bracket-warning' : ''}><small>{m.id}</small><span>{label(m.a)} vs {label(m.b)}</span></div>)}</div>{qualified?.hasDuplicateQualified && <p className="error">Advertencia: se detectaron clasificados duplicados.</p>}</>}</section></div>
}

function formatRealScore(real){
  if (!real || real.homeGoals == null || real.awayGoals == null) return '— : —';
  return `${real.homeGoals} : ${real.awayGoals}`;
}

function hitIcon(value){
  if (value === null) return '—';
  return value ? '✓' : '×';
}

function Team({code}){ const t=TEAMS[code]; return <div className="team"><span>{t?.flag}</span><b>{t?.name}</b></div> }
function label(code){ return TEAMS[code] ? `${TEAMS[code].flag} ${TEAMS[code].name}` : code; }
function Standings({standings}){ return <table className="standings"><thead><tr><th>Pos</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.code}><td>{i+1}</td><td>{label(s.code)}</td><td>{s.pts}</td><td>{s.dg}</td><td>{s.gf}</td></tr>)}</tbody></table> }
function ReportView({participant,matches,predictions,realScores}){
  const score = calculateParticipantScore(matches,predictions,realScores);
  return <section className="panel report"><h2>Consulta de pronóstico</h2><p className="muted">{participant.role==='admin'?'Use Administración para revisar todos los participantes.':'Vista privada de su pronóstico registrado o guardado.'}</p><div className="score-summary"><div><span>Puntos FASE 1</span><strong>{score.totalPoints}</strong></div><div><span>Ganador</span><strong>{score.winnerPoints}</strong></div><div><span>Score exacto</span><strong>{score.scorePoints}</strong></div><div><span>Partidos evaluados</span><strong>{score.evaluatedMatches}</strong></div></div><div className="report-groups">{GROUPS.map(g=><div key={g.id} className="report-card"><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,predictions)}/></div>)}</div></section>
}
function AdminView({matches,realScores,setRealScores,participant}){
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [scoreDraft,setScoreDraft]=useState({});

  async function syncNow(){
    try {
      setBusy(true);
      setMessage('Sincronizando resultados y recalculando puntajes...');
      const sync = await syncResultsAndScores();
      const fresh = await getRealScores();
      setRealScores(fresh);
      await refresh();
      setMessage(sync?.message || 'Sincronización completada.');
    } catch (ex) {
      setMessage(ex.message || 'No se pudo sincronizar resultados.');
    } finally {
      setBusy(false);
    }
  }

  async function refresh(){
    const data = await listParticipantsWithForecasts();
    setRows(data);
    setSelected(current => current ? data.find(r => r.id === current.id) || null : null);
  }

  useEffect(()=>{ refresh(); },[]);

  async function removeSelected(){
    if (!selected) return;
    if (selected.role === 'admin') {
      setMessage('No se permite eliminar usuarios administradores.');
      return;
    }
    const ok = window.confirm(`¿Eliminar al participante ${selected.name} y todos sus pronósticos? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      setBusy(true);
      setMessage('');
      await deleteParticipantAndForecast(selected.id);
      setSelected(null);
      await refresh();
      setMessage('Participante y pronóstico eliminados correctamente.');
    } catch (ex) {
      setMessage(ex.message || 'No se pudo eliminar el participante.');
    } finally {
      setBusy(false);
    }
  }

  async function persistRealScore(matchId){
    const draft = scoreDraft[matchId] || {};
    const current = realScores[matchId] || {};
    const homeGoals = draft.homeGoals ?? current.homeGoals ?? '';
    const awayGoals = draft.awayGoals ?? current.awayGoals ?? '';

    try {
      await saveRealScore(participant.id, matchId, homeGoals, awayGoals, homeGoals === '' || awayGoals === '' ? 'scheduled' : 'finished');
      const fresh = await getRealScores();
      setRealScores(fresh);
      setScoreDraft(prev => ({...prev, [matchId]: {}}));
      setMessage('Score real actualizado.');
    } catch (ex) {
      setMessage(ex.message || 'No se pudo guardar el score real.');
    }
  }

  const detail=selected?.forecast?.predictions || {};
  const selectedScore = selected ? calculateParticipantScore(matches,detail,realScores) : null;

  return <section className="admin-layout"><div className="panel"><h2><Users/> Participantes registrados</h2><div className="participant-list">{rows.map(r=>{const rowScore=calculateParticipantScore(matches,r.forecast?.predictions || {},realScores).totalPoints; return <button key={r.id} onClick={()=>setSelected(r)} className={selected?.id===r.id?'selected':''}><b>{r.name}</b><span>{r.role} · {r.forecast?.confirmed ? 'Confirmado' : r.forecast?.status === 'draft' ? 'Borrador' : 'Sin pronóstico'} · {rowScore} pts</span></button>})}</div></div><div className="panel"><div className="admin-title-row"><h2>Detalle</h2><button className="ghost" disabled={busy} onClick={syncNow}>Recalcular puntajes</button></div>{!selected ? <p className="muted">Seleccione un participante para consultar sus pronósticos.</p> : <><div className="admin-detail-head"><div><p><b>{selected.name}</b> · clave: {selected.uniqueKey}</p>{selectedScore && <p className="muted">Puntos FASE 1: <b>{selectedScore.totalPoints}</b> · Ganador: {selectedScore.winnerPoints} · Score: {selectedScore.scorePoints}</p>}</div>{selected.role !== 'admin' && <button className="danger" disabled={busy} onClick={removeSelected}>Eliminar usuario y pronóstico</button>}</div>{message && <p className="admin-message">{message}</p>}<details className="result-admin"><summary>Actualizar Score real FASE 1 <span className="admin-only-badge">Solo ADMIN</span></summary><div className="real-admin-list">{matches.map(m=>{const current=realScores[m.id] || {}; const draft=scoreDraft[m.id] || {}; return <div className="real-admin-row" key={m.id}><span>{m.matchNo}</span><b>{label(m.home)} vs {label(m.away)}</b><input type="number" min="0" max="99" value={draft.homeGoals ?? current.homeGoals ?? ''} onChange={e=>setScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),homeGoals:e.target.value}}))}/><span>:</span><input type="number" min="0" max="99" value={draft.awayGoals ?? current.awayGoals ?? ''} onChange={e=>setScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),awayGoals:e.target.value}}))}/><button className="ghost" onClick={()=>persistRealScore(m.id)}>Guardar</button></div>})}</div></details><div className="report-groups compact">{GROUPS.map(g=><div className="report-card" key={g.id}><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,detail)}/></div>)}</div></>}</div></section>
}
function Watermark() {
  return (
    <div className="watermark-layer" aria-hidden="true">
      <div className="watermark-orb watermark-orb-one" />
      <div className="watermark-orb watermark-orb-two" />

      <div className="watermark-word watermark-word-main">Zambranada</div>
      <div className="watermark-word watermark-word-side">Zambranada</div>

      <div className="watermark-icon">
        <svg viewBox="0 0 280 280">
          <path d="M112 36h56c-2 46-8 76-28 95-20-19-26-49-28-95Z" />
          <path d="M83 48c-30 2-46 14-47 34-1 27 25 48 62 55l5-23c-27-4-43-17-42-31 1-8 9-12 25-13l-3-22Zm114 0 3 22c16 1 24 5 25 13 1 14-15 27-42 31l5 23c37-7 63-28 62-55-1-20-17-32-53-34Z" />
          <path d="M126 129h28v54h-28z" />
          <path d="M91 205h98v25H91z" />
          <circle cx="204" cy="198" r="38" />
          <path d="m184 190 20-14 22 14-8 25h-28z" />
        </svg>
      </div>
    </div>
  );
}
export default App;
