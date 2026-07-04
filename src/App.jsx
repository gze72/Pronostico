import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, BarChart3, LogOut, ShieldCheck, CheckCircle2, LockKeyhole, Menu, X, Save, PanelLeftClose, PanelLeftOpen, Share2 } from 'lucide-react';
import { GROUPS, TEAMS } from './lib/worldcupData';
import { allGroupsCompleted, buildQualified, buildRoundOf32, buildRealRoundOf32, buildRoundOf16, phase16Complete, calculateParticipantScore, calculatePhase32Score, calculatePhase16Score, calculateRealStandings, calculateStandings, evaluatePrediction, evaluatePhase32Prediction, evaluatePhase16Prediction, groupCompleted, phase32WentPenalties, phase32WinnerFromScore, isPhase32ForecastLate, winnerLabel } from './lib/scoring';
import { adminPhaseControl, deleteParticipantAndForecast, getAppSettings, getForecast, getMatches, getRealScores, listParticipantsWithForecasts, loginOrCreateParticipant, saveForecast, saveParticipantScore, saveRealScore, supabase, syncResultsAndScores, getDailyEditorialSummary, getPhase32Forecast, savePhase32Forecast, getPhase32Results, savePhase32Result, getPhase16Forecast, savePhase16Forecast, getPhase16Results, savePhase16Result } from './lib/storage';
import './styles.css';

function App(){
  const [participant,setParticipant] = useState(null);
  const [matches,setMatches] = useState([]);
  const [realScores,setRealScores] = useState({});
  const [predictions,setPredictions] = useState({});
  const [activeGroup,setActiveGroup] = useState('A');
  const [view,setView] = useState('pronostico8');
  const [sidebar,setSidebar] = useState(() => window.innerWidth >= 900);
  const [toast,setToast] = useState('');
  const [forecastStatus,setForecastStatus] = useState('empty');
  const [showPrizePopup,setShowPrizePopup] = useState(false);
  const [appSettings,setAppSettings] = useState({ registrationEnabled:true, phase1PredictionsLocked:false, phase32PredictionsUnlocked:false, phase16PredictionsUnlocked:false });
  const [syncStatus,setSyncStatus] = useState('Sincronizando resultados...');
  const [rankingRows,setRankingRows] = useState([]);
  const [phase32Predictions,setPhase32Predictions] = useState({});
  const [phase32Status,setPhase32Status] = useState('empty');
  const [phase32ConfirmedAt,setPhase32ConfirmedAt] = useState(null);
  const [phase32RealScores,setPhase32RealScores] = useState({});
  const [phase16Predictions,setPhase16Predictions] = useState({});
  const [phase16Status,setPhase16Status] = useState('empty');
  const [phase16ConfirmedAt,setPhase16ConfirmedAt] = useState(null);
  const [phase16RealScores,setPhase16RealScores] = useState({});
  useEffect(()=>{ 
    async function boot(){
      const loadedMatches = await getMatches();
      setMatches(loadedMatches);
      setAppSettings(await getAppSettings());
      try {
        const sync = await syncResultsAndScores();
        setSyncStatus(sync?.ok ? 'Resultados sincronizados' : (sync?.message || 'Resultados recalculados con datos existentes'));
      } catch {
        setSyncStatus('No se pudo sincronizar resultados en línea');
      }
      const freshScores = await getRealScores();
      setRealScores(freshScores);
      setPhase32RealScores(await getPhase32Results());
      setPhase16RealScores(await getPhase16Results());
      try {
        setRankingRows(await listParticipantsWithForecasts());
      } catch {
        setRankingRows([]);
      }
    }
    boot();
  },[]);
  useEffect(()=>{ if(participant) getForecast(participant.id).then(f=>{ setPredictions(f?.predictions || {}); setForecastStatus(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); }); },[participant]);
  useEffect(()=>{ if(participant) getPhase32Forecast(participant.id).then(f=>{ setPhase32Predictions(f?.predictions || {}); setPhase32Status(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); setPhase32ConfirmedAt(f?.confirmedAt || f?.confirmed_at || null); }); },[participant]);
  useEffect(()=>{ if(participant) getPhase16Forecast(participant.id).then(f=>{ setPhase16Predictions(f?.predictions || {}); setPhase16Status(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); setPhase16ConfirmedAt(f?.confirmedAt || f?.confirmed_at || null); }); },[participant]);
  useEffect(()=>{
    function handleResponsiveSidebar(){
      setSidebar(window.innerWidth >= 900);
    }
    window.addEventListener('resize', handleResponsiveSidebar);
    return () => window.removeEventListener('resize', handleResponsiveSidebar);
  },[]);

  const currentScore = calculateParticipantScore(matches,predictions,realScores);
  const phase32Matches = useMemo(() => buildRealRoundOf32(matches,realScores), [matches,realScores]);
  const phase32Score = useMemo(() => calculatePhase32Score(phase32Matches, phase32Predictions, phase32RealScores, { confirmedAt: phase32ConfirmedAt, status: phase32Status, confirmed: phase32Status === 'confirmed', role: participant?.role }), [phase32Matches, phase32Predictions, phase32RealScores, phase32ConfirmedAt, phase32Status, participant?.role]);
  const phase16Matches = useMemo(() => buildRoundOf16(phase32RealScores), [phase32RealScores]);
  const phase16Score = useMemo(() => calculatePhase16Score(phase16Matches, phase16Predictions, phase16RealScores, { confirmedAt: phase16ConfirmedAt, status: phase16Status, confirmed: phase16Status === 'confirmed', role: participant?.role }), [phase16Matches, phase16Predictions, phase16RealScores, phase16ConfirmedAt, phase16Status, participant?.role]);

  // Ranking visible desde 16avos: la FASE 1 queda histórica, no se suma al ranking actual.
  const phase32RankingRows = useMemo(() => buildPhase32RankingRows(rankingRows, phase32Matches, phase32RealScores), [rankingRows, phase32Matches, phase32RealScores]);
  const phase16RankingRows = useMemo(() => buildPhase16RankingRows(rankingRows, phase16Matches, phase16RealScores), [rankingRows, phase16Matches, phase16RealScores]);
  const publicRankingRows = useMemo(() => buildPremiumRankingRows(rankingRows,matches,realScores), [rankingRows,matches,realScores]);
  const sidebarRankingRows = phase16RankingRows.slice(0,5);
  useEffect(()=>{ if(participant && matches.length) saveParticipantScore(participant.id,currentScore).catch(()=>{}); },[participant, matches, predictions, realScores]);
  const completedCount = GROUPS.filter(g=>groupCompleted(g.id,matches,predictions)).length;
  const canConfirm = allGroupsCompleted(matches,predictions);
  const setScore = (matchId, field, value) => {
    if (forecastStatus === 'confirmed' || appSettings.phase1PredictionsLocked) return;
    if (value !== '' && (Number(value) < 0 || Number(value) > 30)) return;
    setPredictions(prev => ({...prev, [matchId]: {...(prev[matchId]||{}), [field]: value}}));
  };
  const persist = async (confirmed=false) => {
    try {
      if (appSettings.phase1PredictionsLocked) throw new Error('La FASE 1 está bloqueada por el administrador.');
      await saveForecast(participant.id, predictions, confirmed);
      setForecastStatus(confirmed ? 'confirmed' : 'draft');
      if (confirmed) setShowPrizePopup(true);
      setToast(confirmed ? 'Pronóstico confirmado y registrado.' : 'Borrador guardado en Supabase. Puede salir y volver sin perderlo.');
    } catch (ex) {
      setToast(ex.message || 'No se pudo guardar el pronóstico.');
    }
    setTimeout(()=>setToast(''), 3600);
  };
  const persistPhase32 = async (confirmed=false) => {
    try {
      if (phase32Locked(appSettings, phase32Status)) throw new Error('El Pronóstico 16° está bloqueado. Solo ADMIN puede habilitarlo nuevamente.');
      if (confirmed && !phase32Complete(phase32Matches, phase32Predictions)) throw new Error('Complete los 16 enfrentamientos. Si pronostica empate, seleccione ganador por penales.');
      await savePhase32Forecast(participant.id, phase32Predictions, confirmed);
      setPhase32Status(confirmed ? 'confirmed' : 'draft');
      if (confirmed && !phase32ConfirmedAt) setPhase32ConfirmedAt(new Date().toISOString());
      setToast(confirmed ? 'Pronóstico 16° confirmado.' : 'Borrador Pronóstico 16° guardado.');
    } catch (ex) {
      setToast(ex.message || 'No se pudo guardar el Pronóstico 16°.');
    }
    setTimeout(()=>setToast(''), 3600);
  };
  const persistPhase16 = async (confirmed=false) => {
    try {
      if (phase16Locked(appSettings, phase16Status)) throw new Error('El Pronóstico 8° está bloqueado. Solo ADMIN puede habilitarlo nuevamente.');
      if (confirmed && !phase16Complete(phase16Matches, phase16Predictions)) throw new Error('Complete los 8 enfrentamientos disponibles. Si pronostica empate, seleccione ganador por penales.');
      await savePhase16Forecast(participant.id, phase16Predictions, confirmed);
      setPhase16Status(confirmed ? 'confirmed' : 'draft');
      if (confirmed && !phase16ConfirmedAt) setPhase16ConfirmedAt(new Date().toISOString());
      setToast(confirmed ? 'Pronóstico 8° confirmado.' : 'Borrador Pronóstico 8° guardado.');
    } catch (ex) {
      setToast(ex.message || 'No se pudo guardar el Pronóstico 8°.');
    }
    setTimeout(()=>setToast(''), 3600);
  };

  if(!participant) return <Login onLogin={setParticipant}/>;
  return <div className={`app-shell ${sidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
    <Watermark />
    <aside className={`sidebar ${sidebar?'open':''}`}><button className="sidebar-close" onClick={()=>setSidebar(false)} aria-label="Cerrar menú"><X size={18}/><span>Cerrar</span></button>
      <div className="brand"><div className="brand-mark"><Trophy size={20}/></div><div><b>Zambranada 2026</b><span>{supabase ? 'Supabase activo' : 'Modo demo local'}</span></div></div>
      <nav>
        <button className="disabled" disabled title="La FASE 1 concluyó y está cerrada."><Trophy/> Pronóstico</button>
        <button className={view==='pronostico8'?'active':''} onClick={()=>{setView('pronostico8'); setSidebar(false)}}><Trophy/> Pronóstico 8°</button><button className="disabled phase-closed" disabled title="Pronóstico 16° cerrado. Fase histórica bloqueada."><Trophy/> Pronóstico 16°</button>
        <button className={view==='reporte'?'active':''} onClick={()=>{setView('reporte'); setSidebar(false)}}><BarChart3/> Reporte</button>
        {participant.role === 'admin' && <button className={view==='admin'?'active':''} onClick={()=>{setView('admin'); setSidebar(false)}}><ShieldCheck/> Administración</button>}
      </nav>
      <PremiumSidebarRanking rows={sidebarRankingRows} onOpenReport={()=>{setView('reporte'); setSidebar(false)}}/>
      <div className="user-card"><span>{participant.role === 'admin' ? 'Administrador' : 'Participante'}</span><b>{participant.name}</b><div className="score-mini"><b>{phase16Score.totalPoints} / 24 pts</b><small>Pronóstico 8° · fase actual</small></div><button onClick={()=>setParticipant(null)}><LogOut size={16}/> Salir</button></div>
    </aside>
    {sidebar && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={()=>setSidebar(false)} />}
    <main className="content">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(!sidebar)}>{sidebar?<X/>:<Menu/>}<span>{sidebar ? "Cerrar" : "Menú"}</span></button><div><p>Campeonato Mundial de Fútbol 2026 · Zambranada</p><h1>{view==='pronostico8'?'Pronóstico 8°':view==='pronostico16'?'Pronóstico 16°':view==='pronostico'?'Registro de pronóstico (FASE 1)':view==='reporte'?'Reportes':'Panel administrador'}</h1></div><div className="topbar-actions"><div className="sync-pill">{syncStatus}</div><div className={`status-pill ${view==='pronostico8'?phase16Status:forecastStatus}`}><Save size={16}/>{view==='pronostico8' ? (phase16Status === 'confirmed' ? 'Confirmado' : phase16Status === 'draft' ? 'Borrador guardado' : 'Sin guardar') : (forecastStatus === 'confirmed' ? 'Confirmado' : forecastStatus === 'draft' ? 'Borrador guardado' : 'Sin guardar')}</div><div className="progress-pill"><CheckCircle2 size={16}/>{view==='pronostico8' ? `${phase16Matches.filter(m=>!String(m.home).startsWith('TBD_') && !String(m.away).startsWith('TBD_')).length}/8 enfrentamientos` : view==='pronostico16' ? `${phase32Matches.length}/16 enfrentamientos` : `${completedCount}/12 grupos`}</div></div></header>
      {view==='pronostico8' && <Phase16PredictionView participant={participant} matches={phase16Matches} predictions={phase16Predictions} setPredictions={setPhase16Predictions} realScores={phase16RealScores} setRealScores={setPhase16RealScores} score={phase16Score} status={phase16Status} appSettings={appSettings} persist={persistPhase16}/>}
      {view==='pronostico16' && <Phase32PredictionView participant={participant} matches={phase32Matches} predictions={phase32Predictions} setPredictions={setPhase32Predictions} realScores={phase32RealScores} setRealScores={setPhase32RealScores} score={phase32Score} status={phase32Status} appSettings={appSettings} persist={persistPhase32}/>}
      {view==='pronostico' && <PredictionView matches={matches} predictions={predictions} realScores={realScores} activeGroup={activeGroup} setActiveGroup={setActiveGroup} setScore={setScore} persist={persist} canConfirm={canConfirm} forecastStatus={forecastStatus} appSettings={appSettings}/>} 
      {view==='reporte' && <ReportView participant={participant} matches={matches} predictions={predictions} realScores={realScores} rankingRows={rankingRows} phase32Matches={phase32Matches} phase32RealScores={phase32RealScores} phase16Matches={phase16Matches} phase16RealScores={phase16RealScores}/>} 
      {view==='admin' && participant.role === 'admin' && <AdminView matches={matches} realScores={realScores} setRealScores={setRealScores} participant={participant} appSettings={appSettings} setAppSettings={setAppSettings} phase32Matches={phase32Matches} phase32RealScores={phase32RealScores} setPhase32RealScores={setPhase32RealScores} phase16Matches={phase16Matches} phase16RealScores={phase16RealScores} setPhase16RealScores={setPhase16RealScores}/>} 
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
function PredictionView({matches,predictions,realScores,activeGroup,setActiveGroup,setScore,persist,canConfirm,forecastStatus,appSettings}){
  const groupMatches = matches.filter(m=>m.groupId===activeGroup);
  const standings = calculateStandings(activeGroup,matches,predictions);
  const r32 = canConfirm ? buildRoundOf32(matches,predictions) : [];
  const qualified = canConfirm ? buildQualified(matches,predictions) : null;
  const locked = forecastStatus === 'confirmed' || appSettings.phase1PredictionsLocked;

  return <div className="prediction-grid"><section className="group-rail">{GROUPS.map(g=>{const done=groupCompleted(g.id,matches,predictions);return <button key={g.id} className={`${activeGroup===g.id?'active':''} ${done?'done':''}`} onClick={()=>setActiveGroup(g.id)}><span>Grupo {g.id}</span>{done && <CheckCircle2/>}</button>})}</section><section className="panel"><div className="panel-head"><div><span>Fase de grupos</span><h2>Grupo {activeGroup}</h2>{locked && <p className="lock-note">{appSettings.phase1PredictionsLocked ? 'FASE 1 bloqueada por el administrador.' : 'Pronóstico confirmado. La FASE 1 quedó bloqueada para edición.'}</p>}</div><button className="ghost" disabled={locked} onClick={()=>persist(false)}>{locked ? 'Borrador bloqueado' : 'Guardar borrador'}</button></div><div className="matches">{groupMatches.map(m=>{const ev=evaluatePrediction(m.id,predictions,realScores); return <article className="match-card score-card" key={m.id}><Team code={m.home}/><input type="number" min="0" max="30" disabled={locked} value={predictions[m.id]?.homeGoals ?? ''} onChange={e=>setScore(m.id,'homeGoals',e.target.value)} /><span className="colon">:</span><input type="number" min="0" max="30" disabled={locked} value={predictions[m.id]?.awayGoals ?? ''} onChange={e=>setScore(m.id,'awayGoals',e.target.value)} /><Team code={m.away}/><b className="winner">{winnerLabel(m,predictions[m.id])}</b><div className="real-score"><small>Score real</small><span>{formatRealScore(realScores[m.id])}</span></div><div className="hit-box"><small>Ganador</small><b className={ev.winnerHit === null ? 'pending-hit' : ev.winnerHit ? 'hit-ok' : 'hit-bad'}>{hitIcon(ev.winnerHit)}</b></div><div className="hit-box"><small>Score</small><b className={ev.scoreHit === null ? 'pending-hit' : ev.scoreHit ? 'hit-ok' : 'hit-bad'}>{hitIcon(ev.scoreHit)}</b></div></article>})}</div><RealClassification groupId={activeGroup} matches={matches} realScores={realScores}/><Standings standings={standings}/><div className="confirm-row"><button className="primary" disabled={!canConfirm || locked} onClick={()=>persist(true)}>{locked ? 'Pronóstico confirmado' : 'Confirmar Pronóstico'}</button>{!canConfirm && <span>Complete los 12 grupos para habilitar la confirmación.</span>}{locked && <span>No se permiten cambios después de confirmar FASE 1.</span>}</div></section><section className="panel slim"><h3>Llave proyectada</h3>{!canConfirm ? <p className="muted">La llave se mostrará al completar toda la fase de grupos.</p> : <><p className="qualified-summary">32 clasificados únicos: 1.º y 2.º de cada grupo + 8 mejores terceros.</p><div className="bracket-list">{r32.map(m=><div key={m.id} className={m.duplicateWarning ? 'bracket-warning' : ''}><small>{m.id}</small><span>{label(m.a)} vs {label(m.b)}</span></div>)}</div>{qualified?.hasDuplicateQualified && <p className="error">Advertencia: se detectaron clasificados duplicados.</p>}</>}</section></div>
}

function formatRealScore(real){
  if (!real || real.homeGoals == null || real.awayGoals == null) return '— : —';
  return `${real.homeGoals} : ${real.awayGoals}`;
}

function hitIcon(value){
  if (value === null) return '—';
  return value ? '✓' : '×';
}


function maxPossiblePoints(score) {
  return (score?.evaluatedMatches || 0) * 2;
}

function scoreRatioLabel(score) {
  const earned = score?.totalPoints || 0;
  const possible = maxPossiblePoints(score);
  return `${earned} / ${possible} pts`;
}

function scoreRatioTitle(score) {
  const earned = score?.totalPoints || 0;
  const possible = maxPossiblePoints(score);
  const played = score?.evaluatedMatches || 0;
  return `${earned} puntos de ${possible} posibles · ${played} partidos jugados/evaluados`;
}


function scorePercent(score) {
  const possible = maxPossiblePoints(score);
  const earned = score?.totalPoints || 0;
  return possible > 0 ? Math.round((earned / possible) * 100) : 0;
}

function scoreShortLabel(score) {
  const earned = score?.totalPoints || 0;
  return `${earned} pts · ${scorePercent(score)}%`;
}

function ScoreRatio({ score, compact=false }) {
  const possible = maxPossiblePoints(score);
  const earned = score?.totalPoints || 0;
  const pct = scorePercent(score);

  return (
    <div className={compact ? "score-ratio compact" : "score-ratio"} title={scoreRatioTitle(score)}>
      <strong>{earned}</strong>
      <span>/</span>
      <strong>{possible}</strong>
      <small>pts</small>
      {!compact && <em>{pct}% de</em>}
    </div>
  );
}


function RealClassification({ groupId, matches, realScores }) {
  const standings = calculateRealStandings(groupId, matches, realScores);
  const evaluated = matches
    .filter(m => m.groupId === groupId)
    .filter(m => realScores?.[m.id]?.homeGoals != null && realScores?.[m.id]?.awayGoals != null)
    .length;

  return (
    <aside className="real-classification">
      <div className="real-classification-head">
        <strong>Real</strong>
        <span>Orden de Clasificación</span>
        <small>{evaluated}/6 partidos reales</small>
      </div>
      <ol>
        {standings.map((team, index) => (
          <li key={team.code} className={index < 2 ? 'qualified-real' : ''}>
            <b>{index + 1}ro</b>
            <span>{TEAMS[team.code].name}</span>
            <em>{team.pts} pts</em>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Team({code}){ const t=TEAMS[code]; if(!t) return <div className="team"><span>⏳</span><b>Por definir</b></div>; return <div className="team"><span>{t?.flag}</span><b>{t?.name}</b></div> }
function label(code){ if(!code || String(code).startsWith('TBD_')) return '⏳ Por definir'; return TEAMS[code] ? `${TEAMS[code].flag} ${TEAMS[code].name}` : code; }
function Standings({standings}){ return <table className="standings"><thead><tr><th>Pos</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.code}><td>{i+1}</td><td>{label(s.code)}</td><td>{s.pts}</td><td>{s.dg}</td><td>{s.gf}</td></tr>)}</tbody></table> }

function rankMedal(index){
  if(index===0) return '🥇';
  if(index===1) return '🥈';
  if(index===2) return '🥉';
  return String(index+1).padStart(2,'0');
}
function participantInitials(name){
  const clean=String(name||'').trim();
  if(!clean) return '—';
  const parts=clean.split(/\s+/).filter(Boolean);
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
function premiumStatus(row){
  if(row?.forecast?.confirmed) return {label:'Confirmado', cls:'confirmed'};
  if(row?.forecast?.status==='draft') return {label:'Borrador', cls:'draft'};
  return {label:'Sin pronóstico', cls:'empty'};
}
function buildPremiumRankingRows(rows,matches,realScores){
  return [...(rows||[])]
    .map(r=>{
      const score=calculateParticipantScore(matches,r.forecast?.predictions || {},realScores);
      const possible=maxPossiblePoints(score);
      const pct=possible>0?Math.round((score.totalPoints/possible)*100):0;
      return {...r, score, possible, percent:pct, statusInfo:premiumStatus(r)};
    })
    .sort((a,b)=> b.score.totalPoints-a.score.totalPoints || a.name.localeCompare(b.name));
}

function premiumPhase32Status(row){
  const forecast = row?.phase32Forecast;
  if(forecast?.confirmed) return {label:'Confirmado', cls:'confirmed'};
  if(forecast?.status==='draft') return {label:'Borrador', cls:'draft'};
  return {label:'Sin pronóstico', cls:'empty'};
}

function buildPhase32RankingRows(rows,phase32Matches,phase32RealScores){
  const possible = (phase32Matches?.length || 16) * 3;
  return [...(rows||[])]
    .map(r=>{
      const forecast = r.phase32Forecast || {};
      const score = calculatePhase32Score(phase32Matches, forecast.predictions || {}, phase32RealScores, {
        confirmedAt: forecast.confirmed_at || forecast.confirmedAt,
        status: forecast.status,
        confirmed: forecast.confirmed,
        role: r.role
      });
      const pct = possible > 0 ? Math.round((score.totalPoints / possible) * 100) : 0;
      const statusInfo = score.latePenalty
        ? {label:'Fuera de horario', cls:'draft'}
        : score.notConfirmed
          ? premiumPhase32Status(r)
          : premiumPhase32Status(r);
      return {...r, forecast, phase32Forecast: forecast, score, possible, percent:pct, statusInfo};
    })
    .sort((a,b)=> b.score.totalPoints-a.score.totalPoints || a.name.localeCompare(b.name));
}

function premiumPhase16Status(row){
  const forecast = row?.phase16Forecast;
  if(forecast?.confirmed) return {label:'Confirmado', cls:'confirmed'};
  if(forecast?.status==='draft') return {label:'Borrador', cls:'draft'};
  return {label:'Sin pronóstico', cls:'empty'};
}

function buildPhase16RankingRows(rows,phase16Matches,phase16RealScores){
  const possible = (phase16Matches?.length || 8) * 3;
  return [...(rows||[])]
    .map(r=>{
      const forecast = r.phase16Forecast || {};
      const score = calculatePhase16Score(phase16Matches, forecast.predictions || {}, phase16RealScores, {
        confirmedAt: forecast.confirmed_at || forecast.confirmedAt,
        status: forecast.status,
        confirmed: forecast.confirmed,
        role: r.role
      });
      const pct = possible > 0 ? Math.round((score.totalPoints / possible) * 100) : 0;
      const statusInfo = score.latePenalty
        ? {label:'Fuera de horario', cls:'draft'}
        : score.notConfirmed
          ? premiumPhase16Status(r)
          : premiumPhase16Status(r);
      return {...r, forecast, phase16Forecast: forecast, score, possible, percent:pct, statusInfo};
    })
    .sort((a,b)=> b.score.totalPoints-a.score.totalPoints || a.name.localeCompare(b.name));
}
function PremiumSidebarRanking({rows,onOpenReport}){
  return <section className="premium-sidebar-ranking"><div className="premium-sidebar-ranking-head"><div><span>Ranking actual</span><small>Pronóstico 8° · fase actual</small></div><b>🏆</b></div><div className="premium-sidebar-ranking-list">{rows.length?rows.map((row,index)=><div className={`premium-sidebar-rank rank-${index+1}`} key={row.id || row.name}><i>{rankMedal(index)}</i><div><strong>{row.name}</strong><small>{row.score.totalPoints} pts · {row.percent}%</small></div></div>):<p className="premium-sidebar-empty">Aún no hay ranking disponible.</p>}</div><button type="button" className="premium-sidebar-link" onClick={onOpenReport}>Ver ranking completo <span>›</span></button></section>
}
function PremiumRankingReport({rows}){
  const leader=rows[0];
  const maxPoints=rows.reduce((max,r)=>Math.max(max,r.possible||0),0);
  const evaluated=maxPoints>0?maxPoints/3:0;
  const confirmed=rows.filter(r=>r.statusInfo?.cls==='confirmed').length;
  const winnerTotal=leader?.score?.winnerPoints || 0;
  const scoreTotal=leader?.score?.scorePoints || 0;
  return <section className="premium-ranking-report"><div className="premium-ranking-hero"><div className="premium-ranking-icon">🏆</div><div><span>Reporte oficial</span><h2>Ranking de participantes</h2><p>Ranking de la fase actual: Pronóstico 8°. La FASE 1 y Pronóstico 16° quedan históricos para el acumulado final.</p></div></div><div className="premium-ranking-metrics"><article><span>Puntos 8°</span><strong>{leader?`${leader.score.totalPoints} / ${maxPoints}`:`0 / ${maxPoints}`} <small>pts</small></strong><p>{leader?`${leader.percent}% de aciertos del líder`:'Sin puntaje registrado'}</p></article><article><span>Clasificado</span><strong>{winnerTotal}</strong><p>Predicciones correctas del líder</p></article><article><span>Score exacto</span><strong>{scoreTotal}</strong><p>Marcadores exactos del líder</p></article><article><span>Partidos evaluados</span><strong>{evaluated}</strong><p>{rows.length} participantes · {confirmed} confirmados</p></article></div><div className="premium-ranking-table"><div className="premium-ranking-table-head"><span>Pos</span><span>Participante</span><span>Puntos</span><span>Porcentaje</span><span>Estado</span></div>{rows.length?rows.map((row,index)=><div key={row.id || row.name} className={`premium-ranking-line ${index===0?'leader':''}`}><span className="premium-pos">{rankMedal(index)}</span><div className="premium-participant"><i>{participantInitials(row.name)}</i><div><strong>{row.name}</strong><small>Clasificado: {row.score.winnerPoints} pts · Marcador: {row.score.scorePoints}</small></div></div><b>{row.score.totalPoints} pts</b><em>{row.percent}%</em><span className={`premium-status ${row.statusInfo.cls}`}>{row.statusInfo.label}</span></div>):<p className="premium-ranking-empty">No hay participantes disponibles para mostrar.</p>}</div></section>
}


const PHASE32_INITIAL_CUTOFF_ISO = '2026-06-28T19:30:00.000Z'; // 28/jun/2026 14:30 Ecuador
const PHASE32_DAILY_CUTOFF_HOUR_EC = 12; // Desde 29/jun/2026

function phase32CutoffForNow(){
  const now = new Date();
  const ecNow = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  const y = ecNow.getUTCFullYear();
  const m = ecNow.getUTCMonth() + 1;
  const d = ecNow.getUTCDate();

  if (y === 2026 && m === 6 && d === 28) return new Date(PHASE32_INITIAL_CUTOFF_ISO);

  return new Date(Date.UTC(y, m - 1, d, PHASE32_DAILY_CUTOFF_HOUR_EC + 5, 0, 0, 0));
}
function phase32DeadlinePassed(){
  return Date.now() >= phase32CutoffForNow().getTime();
}
function phase32Locked(appSettings, status){
  if (status === 'confirmed') return true;
  return phase32DeadlinePassed() && !appSettings.phase32PredictionsUnlocked;
}
function phase32Complete(matches, predictions){
  return matches.length === 16 && matches.every(m=>{
    const p = predictions?.[m.id];
    if (!p || p.homeGoals === '' || p.awayGoals === '' || p.homeGoals == null || p.awayGoals == null) return false;
    const h=Number(p.homeGoals), a=Number(p.awayGoals);
    if (Number.isNaN(h) || Number.isNaN(a)) return false;
    if (h === a && !p.penaltyWinner) return false;
    return true;
  });
}
function setPhase32Field(setPredictions, matchId, field, value){
  if (value !== '' && (field === 'homeGoals' || field === 'awayGoals') && (Number(value) < 0 || Number(value) > 30)) return;
  setPredictions(prev => {
    const next = {...prev, [matchId]: {...(prev[matchId]||{}), [field]: value}};
    const rec = next[matchId];
    if ((field === 'homeGoals' || field === 'awayGoals') && rec.homeGoals !== '' && rec.awayGoals !== '' && rec.homeGoals != null && rec.awayGoals != null && Number(rec.homeGoals) !== Number(rec.awayGoals)) {
      rec.penaltyWinner = null;
    }
    return next;
  });
}

function formatPhase32Kickoff(match){
  if (!match?.kickoff) return match?.venue || 'Horario FIFA por confirmar en app';
  try {
    const d = new Date(match.kickoff);
    const date = d.toLocaleDateString('es-EC', { weekday:'long', day:'2-digit', month:'short' });
    const time = d.toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' });
    return `${date} · ${time} · ${match.venue || ''}`.replace(/ · $/, '');
  } catch {
    return match?.venue || 'Horario FIFA por confirmar en app';
  }
}

function phase32WinnerLabel(match, record){
  const winner = phase32WinnerFromScore(match, record);
  if (!winner) return 'Pendiente';
  const penalties = phase32WentPenalties(record);
  return `${TEAMS[winner]?.name || winner}${penalties ? ' · por penales' : ''}`;
}
function formatPhase32Real(real, match){
  if (!real || real.homeGoals == null || real.awayGoals == null) return '— : —';
  const base = `${real.homeGoals} : ${real.awayGoals}`;
  const penalties = Boolean(real.wentPenalties || phase32WentPenalties(real));
  const winner = real.penaltyWinner || phase32WinnerFromScore(match, real);
  const winnerName = winner ? (TEAMS[winner]?.name || winner) : 'Empate';
  return `${winnerName} · ${base}${penalties && real.penaltyWinner ? ' · Penales' : ''}`;
}
function sortPhase32MatchesByKickoff(matches){
  return [...(matches || [])].sort((a,b)=>{
    const ta = a?.kickoff ? new Date(a.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b?.kickoff ? new Date(b.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    if (a?.matchNo && b?.matchNo) return String(a.matchNo).localeCompare(String(b.matchNo), 'es', {numeric:true});
    return String(a?.id || '').localeCompare(String(b?.id || ''), 'es', {numeric:true});
  });
}


const PHASE16_DAILY_CUTOFF_HOUR_EC = 11; // Cierre diario de 8vos: 11:00 Ecuador

function phase16CutoffForNow(){
  const now = new Date();
  const ecNow = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  const y = ecNow.getUTCFullYear();
  const m = ecNow.getUTCMonth() + 1;
  const d = ecNow.getUTCDate();
  return new Date(Date.UTC(y, m - 1, d, PHASE16_DAILY_CUTOFF_HOUR_EC + 5, 0, 0, 0));
}
function phase16DeadlinePassed(){
  return Date.now() >= phase16CutoffForNow().getTime();
}
function phase16Locked(appSettings, status){
  if (status === 'confirmed') return true;
  return phase16DeadlinePassed() && !appSettings.phase16PredictionsUnlocked;
}
function phase16TeamsResolved(match){
  return match && !String(match.home).startsWith('TBD_') && !String(match.away).startsWith('TBD_');
}

function Phase32PredictionView({participant,matches,predictions,setPredictions,realScores,setRealScores,score,status,appSettings,persist}){
  const locked = phase32Locked(appSettings,status);
  const orderedMatches = useMemo(()=>sortPhase32MatchesByKickoff(matches), [matches]);
  const complete = phase32Complete(matches,predictions);
  const [realDraft,setRealDraft] = useState({});
  const [message,setMessage] = useState('');

  async function saveReal(match){
    const draft = realDraft[match.id] || {};
    const current = realScores[match.id] || {};
    const homeGoals = draft.homeGoals ?? current.homeGoals ?? '';
    const awayGoals = draft.awayGoals ?? current.awayGoals ?? '';
    const penaltyWinner = draft.penaltyWinner ?? current.penaltyWinner ?? null;
    try {
      await savePhase32Result(participant.id, match.id, homeGoals, awayGoals, penaltyWinner, homeGoals === '' || awayGoals === '' ? 'scheduled' : 'finished');
      const fresh = await getPhase32Results();
      setRealScores(fresh);
      setRealDraft(prev=>({...prev,[match.id]:{}}));
      setMessage('Resultado real 16° actualizado.');
    } catch(ex) {
      setMessage(ex.message || 'No se pudo guardar resultado real 16°.');
    }
    setTimeout(()=>setMessage(''),3600);
  }

  return <section className="phase32-page">
    <div className="phase32-hero panel">
      <div>
        <span className="phase32-eyebrow">Segunda fase · Dieciseisavos</span>
        <h2>Pronóstico 16°</h2>
        <p className="phase32-deadline">Cierre de 28/jun: <b>14:30</b>. Desde hoy en adelante el cierre diario es <b>12:00</b>. Después del cierre se bloquea automáticamente; solo ADMIN puede habilitar nuevamente.</p>
        <p className="phase32-rules"><b>Regla de puntaje:</b> cada partido vale máximo <b>3 puntos</b>. El puntaje se calcula por tres criterios independientes: equipo clasificado, forma de clasificación y marcador exacto.</p>
        <div className="phase32-points-rules">
          <article><strong>+1</strong><span>Equipo clasificado</span><small>Se otorga si acierta el equipo que pasa de ronda, ya sea directo o por penales.</small></article>
          <article><strong>+1</strong><span>Forma de clasificación</span><small>Se otorga solo si también acierta si el equipo clasificó directo o por penales.</small></article>
          <article><strong>+1</strong><span>Marcador exacto</span><small>Se otorga solo si acierta exactamente los goles de ambos equipos.</small></article>
          <article><strong>Importante</strong><span>Sin doble premio</span><small>Si pronostica penales y el equipo gana directo, solo suma el punto de clasificado.</small></article>
        </div>{score.latePenalty && <p className="phase32-late-warning">Pronóstico registrado fuera del horario permitido. Por regla de penalización, sus puntos de Pronóstico 16° se muestran en 0.</p>}{score.notConfirmed && <p className="phase32-late-warning">Pronóstico 16° en borrador o no confirmado. No genera puntos hasta estar confirmado dentro del horario permitido.</p>}
      </div>
      <div className={`phase32-lock-card ${locked?'locked':'open'}`}>
        <b>{locked ? 'Bloqueado' : 'Abierto'}</b>
        <span>{score.latePenalty ? 'Confirmado fuera de horario · puntaje 0' : score.notConfirmed ? 'Borrador/no confirmado · puntaje 0' : status === 'confirmed' ? 'Pronóstico confirmado' : phase32DeadlinePassed() ? (appSettings.phase32PredictionsUnlocked ? 'Habilitado por ADMIN' : 'Cierre automático aplicado') : 'Disponible hasta el cierre vigente'}</span>
      </div>
    </div>

    <div className="phase32-summary">
      <article><span>Puntos 8°</span><strong>{score.totalPoints} / {score.evaluatedMatches*3 || 48}</strong><small>pts</small></article>
      <article><span>Clasificado</span><strong>{score.winnerPoints}</strong><small>pts</small></article>
      <article><span>Resultado</span><strong>{score.scorePoints}</strong><small>exactos</small></article>
      <article><span>Forma</span><strong>{score.penaltyPoints}</strong><small>pts</small></article>
    </div>

    <div className="phase32-matches">
      {orderedMatches.map((match,index)=>{
        const prediction = predictions[match.id] || {};
        const real = realScores[match.id];
        const ev = evaluatePhase32Prediction(match,predictions,realScores);
        const tie = prediction.homeGoals !== '' && prediction.awayGoals !== '' && prediction.homeGoals != null && prediction.awayGoals != null && Number(prediction.homeGoals) === Number(prediction.awayGoals);
        return <article className="phase32-match-card" key={match.id}>
          <div className="phase32-match-head"><span>{match.matchNo}</span><b>{match.id}</b></div>
          <div className="phase32-teams"><Team code={match.home}/><span>vs</span><Team code={match.away}/></div><div className="phase32-kickoff">{formatPhase32Kickoff(match)}</div>
          <div className="phase32-score-inputs">
            <input type="number" min="0" max="30" disabled={locked} value={prediction.homeGoals ?? ''} onChange={e=>setPhase32Field(setPredictions,match.id,'homeGoals',e.target.value)} />
            <span>:</span>
            <input type="number" min="0" max="30" disabled={locked} value={prediction.awayGoals ?? ''} onChange={e=>setPhase32Field(setPredictions,match.id,'awayGoals',e.target.value)} />
          </div>
          {tie && <div className="phase32-penalties"><small>Ganador por penales</small><div><button type="button" disabled={locked} className={prediction.penaltyWinner===match.home?'active':''} onClick={()=>setPhase32Field(setPredictions,match.id,'penaltyWinner',match.home)}>{TEAMS[match.home]?.name || match.home}</button><button type="button" disabled={locked} className={prediction.penaltyWinner===match.away?'active':''} onClick={()=>setPhase32Field(setPredictions,match.id,'penaltyWinner',match.away)}>{TEAMS[match.away]?.name || match.away}</button></div></div>}
          <div className="phase32-result-line"><small>Clasificado pronosticado</small><b className="phase32-predicted-winner-chip">{phase32WinnerLabel(match,prediction)}</b></div>
          <div className="phase32-real-line"><small>Resultado REAL</small><b className="phase32-real-score-chip">{formatPhase32Real(real,match)}</b></div>
          <div className="phase32-hits"><span>Clasificado <b className={ev.winnerHit===null?'pending-hit':ev.winnerHit?'hit-ok':'hit-bad'}>{hitIcon(ev.winnerHit)}</b></span><span>Resultado <b className={ev.scoreHit===null?'pending-hit':ev.scoreHit?'hit-ok':'hit-bad'}>{hitIcon(ev.scoreHit)}</b></span><span>Forma <b className={ev.penaltyHit===null?'pending-hit':ev.penaltyHit?'hit-ok':'hit-bad'}>{hitIcon(ev.penaltyHit)}</b></span></div>
        </article>
      })}
    </div>

    <div className="confirm-row phase32-actions"><button className="ghost" disabled={locked} onClick={()=>persist(false)}>{locked?'Borrador bloqueado':'Guardar borrador'}</button><button className="primary" disabled={locked || !complete} onClick={()=>persist(true)}>{status==='confirmed'?'Pronóstico confirmado':'Confirmar Pronóstico 16°'}</button>{!complete && <span>Complete los 16 partidos. Si hay empate, seleccione ganador por penales.</span>}</div>

    {participant.role==='admin' && <details className="panel phase32-admin-real"><summary>Actualizar resultados reales 16° <span className="admin-only-badge">Solo ADMIN</span></summary>{message && <p className="admin-message">{message}</p>}<div className="phase32-real-admin-list">{orderedMatches.map(match=>{const current=realScores[match.id] || {}; const draft=realDraft[match.id] || {}; const h=draft.homeGoals ?? current.homeGoals ?? ''; const a=draft.awayGoals ?? current.awayGoals ?? ''; const isTie=h!=='' && a!=='' && h!=null && a!=null && Number(h)===Number(a); const pw=draft.penaltyWinner ?? current.penaltyWinner ?? ''; return <div className="phase32-real-admin-row" key={match.id}><span>{match.matchNo}</span><b>{label(match.home)} vs {label(match.away)}</b><input type="number" min="0" max="99" value={h} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),homeGoals:e.target.value}}))}/><span>:</span><input type="number" min="0" max="99" value={a} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),awayGoals:e.target.value}}))}/>{isTie && <select value={pw} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),penaltyWinner:e.target.value}}))}><option value="">Penales...</option><option value={match.home}>{TEAMS[match.home]?.name || match.home}</option><option value={match.away}>{TEAMS[match.away]?.name || match.away}</option></select>}<button className="ghost" onClick={()=>saveReal(match)}>Guardar</button></div>})}</div></details>}
  </section>
}

function Phase16PredictionView({participant,matches,predictions,setPredictions,realScores,setRealScores,score,status,appSettings,persist}){
  const locked = phase16Locked(appSettings,status);
  const orderedMatches = useMemo(()=>sortPhase32MatchesByKickoff(matches), [matches]);
  const complete = phase16Complete(matches,predictions);
  const [realDraft,setRealDraft] = useState({});
  const [message,setMessage] = useState('');

  async function saveReal(match){
    const draft = realDraft[match.id] || {};
    const current = realScores[match.id] || {};
    const homeGoals = draft.homeGoals ?? current.homeGoals ?? '';
    const awayGoals = draft.awayGoals ?? current.awayGoals ?? '';
    const penaltyWinner = draft.penaltyWinner ?? current.penaltyWinner ?? null;
    try {
      await savePhase16Result(participant.id, match.id, homeGoals, awayGoals, penaltyWinner, homeGoals === '' || awayGoals === '' ? 'scheduled' : 'finished');
      const fresh = await getPhase16Results();
      setRealScores(fresh);
      setRealDraft(prev=>({...prev,[match.id]:{}}));
      setMessage('Resultado real 8° actualizado.');
    } catch(ex) {
      setMessage(ex.message || 'No se pudo guardar resultado real 8°.');
    }
    setTimeout(()=>setMessage(''),3600);
  }

  return <section className="phase32-page">
    <div className="phase32-hero panel">
      <div>
        <span className="phase32-eyebrow">Tercera fase · Octavos de final</span>
        <h2>Pronóstico 8°</h2>
        <p className="phase32-deadline">Cierre diario de 8vos: <b>11:00 Ecuador</b>. Después del cierre se bloquea automáticamente; solo ADMIN puede habilitar nuevamente.</p>
        <p className="phase32-rules"><b>Regla de puntaje:</b> cada partido vale máximo <b>3 puntos</b>. El puntaje se calcula por tres criterios independientes: equipo clasificado, forma de clasificación y marcador exacto.</p>
        <div className="phase32-points-rules">
          <article><strong>+1</strong><span>Equipo clasificado</span><small>Se otorga si acierta el equipo que pasa de ronda, ya sea directo o por penales.</small></article>
          <article><strong>+1</strong><span>Forma de clasificación</span><small>Se otorga solo si también acierta si el equipo clasificó directo o por penales.</small></article>
          <article><strong>+1</strong><span>Marcador exacto</span><small>Se otorga solo si acierta exactamente los goles de ambos equipos.</small></article>
          <article><strong>Importante</strong><span>Sin doble premio</span><small>Si pronostica penales y el equipo gana directo, solo suma el punto de clasificado.</small></article>
        </div>{score.latePenalty && <p className="phase32-late-warning">Pronóstico registrado fuera del horario permitido. Por regla de penalización, sus puntos de Pronóstico 8° se muestran en 0.</p>}{score.notConfirmed && <p className="phase32-late-warning">Pronóstico 8° en borrador o no confirmado. No genera puntos hasta estar confirmado dentro del horario permitido.</p>}
      </div>
      <div className={`phase32-lock-card ${locked?'locked':'open'}`}>
        <b>{locked ? 'Bloqueado' : 'Abierto'}</b>
        <span>{score.latePenalty ? 'Confirmado fuera de horario · puntaje 0' : score.notConfirmed ? 'Borrador/no confirmado · puntaje 0' : status === 'confirmed' ? 'Pronóstico confirmado' : phase16DeadlinePassed() ? (appSettings.phase16PredictionsUnlocked ? 'Habilitado por ADMIN' : 'Cierre automático aplicado') : 'Disponible hasta el cierre vigente'}</span>
      </div>
    </div>

    <div className="phase32-summary">
      <article><span>Puntos 8°</span><strong>{score.totalPoints} / {score.evaluatedMatches*3 || 24}</strong><small>pts</small></article>
      <article><span>Clasificado</span><strong>{score.winnerPoints}</strong><small>pts</small></article>
      <article><span>Resultado</span><strong>{score.scorePoints}</strong><small>exactos</small></article>
      <article><span>Forma</span><strong>{score.penaltyPoints}</strong><small>pts</small></article>
    </div>

    <div className="phase32-matches">
      {orderedMatches.map((match,index)=>{
        const prediction = predictions[match.id] || {};
        const real = realScores[match.id];
        const ev = evaluatePhase16Prediction(match,predictions,realScores);
        const unresolved = !phase16TeamsResolved(match); const tie = prediction.homeGoals !== '' && prediction.awayGoals !== '' && prediction.homeGoals != null && prediction.awayGoals != null && Number(prediction.homeGoals) === Number(prediction.awayGoals);
        return <article className="phase32-match-card" key={match.id}>
          <div className="phase32-match-head"><span>{match.matchNo}</span><b>{match.id}</b></div>
          <div className="phase32-teams"><Team code={match.home}/><span>vs</span><Team code={match.away}/></div><div className="phase32-kickoff">{formatPhase32Kickoff(match)}</div>
          {unresolved && <p className="phase32-pending-note">Este cruce se habilitará cuando FIFA confirme los clasificados.</p>}<div className="phase32-score-inputs">
            <input type="number" min="0" max="30" disabled={locked || unresolved} value={prediction.homeGoals ?? ''} onChange={e=>setPhase32Field(setPredictions,match.id,'homeGoals',e.target.value)} />
            <span>:</span>
            <input type="number" min="0" max="30" disabled={locked || unresolved} value={prediction.awayGoals ?? ''} onChange={e=>setPhase32Field(setPredictions,match.id,'awayGoals',e.target.value)} />
          </div>
          {tie && <div className="phase32-penalties"><small>Ganador por penales</small><div><button type="button" disabled={locked || unresolved} className={prediction.penaltyWinner===match.home?'active':''} onClick={()=>setPhase32Field(setPredictions,match.id,'penaltyWinner',match.home)}>{TEAMS[match.home]?.name || match.home}</button><button type="button" disabled={locked || unresolved} className={prediction.penaltyWinner===match.away?'active':''} onClick={()=>setPhase32Field(setPredictions,match.id,'penaltyWinner',match.away)}>{TEAMS[match.away]?.name || match.away}</button></div></div>}
          <div className="phase32-result-line"><small>Clasificado pronosticado</small><b className="phase32-predicted-winner-chip">{phase32WinnerLabel(match,prediction)}</b></div>
          <div className="phase32-real-line"><small>Resultado REAL</small><b className="phase32-real-score-chip">{formatPhase32Real(real,match)}</b></div>
          <div className="phase32-hits"><span>Clasificado <b className={ev.winnerHit===null?'pending-hit':ev.winnerHit?'hit-ok':'hit-bad'}>{hitIcon(ev.winnerHit)}</b></span><span>Resultado <b className={ev.scoreHit===null?'pending-hit':ev.scoreHit?'hit-ok':'hit-bad'}>{hitIcon(ev.scoreHit)}</b></span><span>Forma <b className={ev.penaltyHit===null?'pending-hit':ev.penaltyHit?'hit-ok':'hit-bad'}>{hitIcon(ev.penaltyHit)}</b></span></div>
        </article>
      })}
    </div>

    <div className="confirm-row phase32-actions"><button className="ghost" disabled={locked} onClick={()=>persist(false)}>{locked?'Borrador bloqueado':'Guardar borrador'}</button><button className="primary" disabled={locked || !complete} onClick={()=>persist(true)}>{status==='confirmed'?'Pronóstico confirmado':'Confirmar Pronóstico 8°'}</button>{!complete && <span>Complete los 8 partidos disponibles. Si hay empate, seleccione ganador por penales.</span>}</div>

    {participant.role==='admin' && <details className="panel phase32-admin-real"><summary>Actualizar resultados reales 8° <span className="admin-only-badge">Solo ADMIN</span></summary>{message && <p className="admin-message">{message}</p>}<div className="phase32-real-admin-list">{orderedMatches.map(match=>{const current=realScores[match.id] || {}; const draft=realDraft[match.id] || {}; const h=draft.homeGoals ?? current.homeGoals ?? ''; const a=draft.awayGoals ?? current.awayGoals ?? ''; const isTie=h!=='' && a!=='' && h!=null && a!=null && Number(h)===Number(a); const pw=draft.penaltyWinner ?? current.penaltyWinner ?? ''; return <div className="phase32-real-admin-row" key={match.id}><span>{match.matchNo}</span><b>{label(match.home)} vs {label(match.away)}</b><input type="number" min="0" max="99" value={h} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),homeGoals:e.target.value}}))}/><span>:</span><input type="number" min="0" max="99" value={a} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),awayGoals:e.target.value}}))}/>{isTie && <select value={pw} onChange={e=>setRealDraft(prev=>({...prev,[match.id]:{...(prev[match.id]||{}),penaltyWinner:e.target.value}}))}><option value="">Penales...</option><option value={match.home}>{TEAMS[match.home]?.name || match.home}</option><option value={match.away}>{TEAMS[match.away]?.name || match.away}</option></select>}<button className="ghost" disabled={!phase16TeamsResolved(match)} onClick={()=>saveReal(match)}>Guardar</button></div>})}</div></details>}
  </section>
}


function ReportView({participant,matches,predictions,realScores,rankingRows=[],phase32Matches=[],phase32RealScores={},phase16Matches=[],phase16RealScores={}}){
  const [reportTab,setReportTab] = useState('ranking');
  const score = calculateParticipantScore(matches,predictions,realScores);
  const rankedRows = buildPhase16RankingRows(rankingRows,phase16Matches,phase16RealScores);
  const predictionTitle = participant.role==='admin' ? 'Consulta de pronóstico' : 'Mi pronóstico';
  const predictionText = participant.role==='admin'
    ? 'Use Administración para revisar todos los participantes.'
    : 'Vista privada de su pronóstico registrado o guardado.';

  return <div className="report-stack report-tabs-layout">
    <section className="report-tabs-shell" aria-label="Opciones de reporte">
      <button type="button" className={reportTab==='ranking'?'active':''} onClick={()=>setReportTab('ranking')}>
        <Trophy size={16}/>
        <span>Ranking de participantes</span>
      </button>
      <button type="button" className={reportTab==='pronosticos'?'active':''} onClick={()=>setReportTab('pronosticos')}>
        <BarChart3 size={16}/>
        <span>{predictionTitle}</span>
      </button>
    </section>

    {reportTab==='ranking' && <PremiumRankingReport rows={rankedRows}/>}

    {reportTab==='pronosticos' && <section className="panel report private-report report-tab-panel">
      <h2>{predictionTitle}</h2>
      <p className="muted">{predictionText}</p>
      <div className="score-summary">
        <div><span>Puntos FASE 1</span><ScoreRatio score={score}/></div>
        <div><span>Ganador</span><strong>{score.winnerPoints}</strong></div>
        <div><span>Score exacto</span><strong>{score.scorePoints}</strong></div>
        <div><span>Partidos evaluados</span><strong>{score.evaluatedMatches}</strong></div>
      </div>
      <div className="report-groups">{GROUPS.map(g=><div key={g.id} className="report-card"><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,predictions)}/></div>)}</div>
    </section>}
  </div>
}

function buildRankingShareText(rows, matches, realScores, editorialSummaryText='') {
  const ranked = [...rows]
    .map(r => ({
      ...r,
      score: calculateParticipantScore(matches, r.forecast?.predictions || {}, realScores)
    }))
    .sort((a,b) =>
      b.score.totalPoints - a.score.totalPoints ||
      a.name.localeCompare(b.name)
    );

  const possible = ranked.reduce((max, r) => Math.max(max, maxPossiblePoints(r.score)), 0);
  const evaluatedMatches = possible > 0 ? possible / 2 : 0;
  const confirmedCount = ranked.filter(r => r.forecast?.confirmed).length;
  const now = new Date();

  const date = now.toLocaleDateString('es-EC', {
    day:'2-digit',
    month:'short',
    year:'numeric'
  }).replace('.', '');

  const time = now.toLocaleTimeString('es-EC', {
    hour:'2-digit',
    minute:'2-digit'
  });

  const leader = ranked[0];
  const topScore = leader?.score?.totalPoints || 0;
  const topPercent = leader ? scorePercent(leader.score) : 0;

  const separator = '━━━━━━━━━━━━━━━━━━━━';
  const thin = '────────────────────';

  const podiumIcon = index => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${String(index + 1).padStart(2, '0')}.`;
  };

  const statusIcon = r => {
    if (r.forecast?.confirmed) return '●';
    if (r.forecast?.status === 'draft') return '◐';
    return '○';
  };

  const rankingLines = ranked.map((r, index) => {
    const icon = podiumIcon(index);
    const pct = `${scorePercent(r.score)}%`;
    const pts = `${r.score.totalPoints} pts`;
    const status = statusIcon(r);
    return `${icon} ${r.name}\n   ${pts} · ${pct} ${status}`;
  });

  return [
    '🏆 *ZAMBRANADA MUNDIAL 2026*',
    '_Ranking oficial de participantes_',
    separator,
    `Actualizado: ${date} · ${time}`,
    `Partidos evaluados: ${evaluatedMatches}`,
    `Puntaje máximo: ${possible} pts`,
    `Participantes: ${ranked.length} · Confirmados: ${confirmedCount}`,
    thin,
    ...(editorialSummaryText ? editorialSummaryText.split('\n') : ['Claves de la jornada:', '• Resumen editorial pendiente de actualización.']),
    thin,
    `Líder actual: ${leader?.name || 'Pendiente'}`,
    `Marca líder: ${topScore} pts · ${topPercent}%`,
    separator,
    '*TABLA DE POSICIONES*',
    '',
    ...rankingLines,
    separator,
    '● Confirmado   ◐ Borrador   ○ Sin pronóstico',
    '_Reporte generado desde el panel administrador._'
  ].join('\n');
}

function AdminView({matches,realScores,setRealScores,participant,appSettings,setAppSettings,phase32Matches=[],phase32RealScores={},setPhase32RealScores,phase16Matches=[],phase16RealScores={},setPhase16RealScores}){
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [participantSort,setParticipantSort]=useState('points_desc');
  const [showSharePreview,setShowSharePreview]=useState(false);
  const [shareText,setShareText]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [scoreDraft,setScoreDraft]=useState({});
  const [phase32ScoreDraft,setPhase32ScoreDraft]=useState({});
  const [phase16ScoreDraft,setPhase16ScoreDraft]=useState({});

  function phase32StatusMeta(row){
    const forecast = row?.phase32Forecast || {};
    if (forecast.confirmed) return 'Confirmado';
    if (forecast.status === 'draft') return 'Borrador';
    return 'Sin pronóstico';
  }

  function phase32ScoreFor(row){
    const forecast = row?.phase32Forecast || {};
    return calculatePhase32Score(phase32Matches, forecast.predictions || {}, phase32RealScores, {
      confirmedAt: forecast.confirmed_at || forecast.confirmedAt,
      status: forecast.status,
      confirmed: forecast.confirmed,
      role: row?.role
    });
  }

  function phase16StatusMeta(row){
    const forecast = row?.phase16Forecast || {};
    if (forecast.confirmed) return 'Confirmado';
    if (forecast.status === 'draft') return 'Borrador';
    return 'Sin pronóstico';
  }

  function phase16ScoreFor(row){
    const forecast = row?.phase16Forecast || {};
    return calculatePhase16Score(phase16Matches, forecast.predictions || {}, phase16RealScores, {
      confirmedAt: forecast.confirmed_at || forecast.confirmedAt,
      status: forecast.status,
      confirmed: forecast.confirmed,
      role: row?.role
    });
  }

  function phase32PredictionLabel(match, prediction = {}){
    if (!prediction || prediction.homeGoals === undefined || prediction.homeGoals === '') return 'Pendiente';
    const base = `${prediction.homeGoals} : ${prediction.awayGoals}`;
    const winner = phase32WinnerFromScore(match, prediction);
    const winnerText = winner ? (TEAMS[winner]?.name || winner) : 'Empate';
    const penaltyText = prediction.penaltyWinner ? ` · Penales: ${TEAMS[prediction.penaltyWinner]?.name || prediction.penaltyWinner}` : '';
    return `${base} · ${winnerText}${penaltyText}`;
  }

  function phase32RealLabel(match){
    const real = phase32RealScores?.[match.id];
    if (!real || real.homeGoals == null || real.awayGoals == null) return '— : —';
    const status = String(real.status || '').toLowerCase();
    const live = status.includes('live') || status.includes('progress') ? ' · En vivo' : '';
    return `${real.homeGoals} : ${real.awayGoals}${live}`;
  }

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

  async function runPhaseAction(action, value){
    const labels = {
      set_registration_enabled: value ? 'habilitar el registro de nuevos usuarios' : 'inhabilitar el registro de nuevos usuarios',
      lock_all_predictions: 'bloquear todos los pronósticos como CONFIRMADOS',
      unlock_all_predictions: 'habilitar a todos los usuarios para pronosticar nuevamente'
    };

    const ok = window.confirm(`¿Confirmar acción administrativa: ${labels[action] || action}?`);
    if (!ok) return;

    try {
      setBusy(true);
      setMessage('');
      const result = await adminPhaseControl(participant.id, action, value);
      setAppSettings(await getAppSettings());
      await refresh();
      setMessage(result?.message || 'Acción administrativa ejecutada.');
    } catch (ex) {
      setMessage(ex.message || 'No se pudo ejecutar la acción administrativa.');
    } finally {
      setBusy(false);
    }
  }


  
  async function shareRanking(){
    try {
      setMessage('Actualizando resumen editorial de la jornada...');

      const targetDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Guayaquil',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const editorial = await getDailyEditorialSummary(targetDate, {
        debug: false,
        daysBack: 30,
        query: 'FIFA World Cup 2026 OR Copa Mundial 2026 OR Mundial 2026'
      });

      const editorialText = editorial?.summaryText || 'Claves de la jornada:\n• No se encontraron noticias deportivas externas disponibles para complementar esta jornada.\n• El ranking se genera con los marcadores reales cargados por administración.';
      const text = buildRankingShareText(rows, matches, realScores, editorialText);

      setShareText(text);
      setShowSharePreview(true);

      if (editorial?.source?.startsWith('newsapi')) {
        setMessage('Resumen editorial actualizado con noticias externas.');
      } else {
        setMessage('Ranking generado con resumen editorial genérico o resultados disponibles.');
      }
    } catch (ex) {
      const fallback = 'Claves de la jornada:\n• No se encontraron noticias deportivas externas disponibles para complementar esta jornada.\n• El ranking se genera con los marcadores reales cargados por administración.';
      const text = buildRankingShareText(rows, matches, realScores, fallback);
      setShareText(text);
      setShowSharePreview(true);
      setMessage('No se pudo actualizar el resumen editorial en línea.');
    }
  }

  async function confirmShareRanking(){
    const title = 'Ranking Zambranada Mundial 2026';

    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText });
        setShowSharePreview(false);
        setMessage('Ranking compartido desde el dispositivo.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShowSharePreview(false);
        setMessage('Ranking copiado al portapapeles. Puede pegarlo en WhatsApp u otra app.');
        return;
      }

      window.prompt('Copie el ranking para compartirlo:', shareText);
      setShowSharePreview(false);
      setMessage('Ranking generado para compartir.');
    } catch (ex) {
      if (ex?.name === 'AbortError') return;
      setMessage('No se pudo compartir automáticamente. Intente copiar el ranking manualmente.');
    }
  }

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

  async function persistPhase32RealScore(matchId){
    const draft = phase32ScoreDraft[matchId] || {};
    const current = phase32RealScores?.[matchId] || {};
    const homeGoals = draft.homeGoals ?? current.homeGoals ?? '';
    const awayGoals = draft.awayGoals ?? current.awayGoals ?? '';
    const wentPenalties = Boolean(draft.wentPenalties ?? current.wentPenalties ?? false);
    const penaltyWinner = draft.penaltyWinner ?? current.penaltyWinner ?? '';

    try {
      await savePhase32Result(participant.id, matchId, {
        homeGoals,
        awayGoals,
        wentPenalties,
        penaltyWinner: wentPenalties ? penaltyWinner : null,
        status: homeGoals === '' || awayGoals === '' ? 'scheduled' : 'finished'
      });
      const fresh = await getPhase32Results();
      setPhase32RealScores?.(fresh);
      setPhase32ScoreDraft(prev => ({...prev, [matchId]: {}}));
      setMessage('Resultado histórico Pronóstico 16° actualizado.');
    } catch (ex) {
      setMessage(ex.message || 'No se pudo guardar el resultado histórico de Pronóstico 16°.');
    }
  }


  async function persistPhase16RealScore(matchId){
    const draft = phase16ScoreDraft[matchId] || {};
    const current = phase16RealScores?.[matchId] || {};
    try {
      setBusy(true);
      await savePhase16Result(participant.id, matchId, draft.homeGoals ?? current.homeGoals ?? '', draft.awayGoals ?? current.awayGoals ?? '', draft.penaltyWinner ?? current.penaltyWinner ?? null, (draft.homeGoals ?? current.homeGoals) === '' || (draft.awayGoals ?? current.awayGoals) === '' ? 'scheduled' : 'finished');
      const fresh = await getPhase16Results();
      setPhase16RealScores(fresh);
      setPhase16ScoreDraft(prev=>({...prev,[matchId]:{}}));
      await refresh();
      setMessage('Resultado real Pronóstico 8° actualizado.');
    } catch(ex) {
      setMessage(ex.message || 'No se pudo guardar el resultado real de Pronóstico 8°.');
    } finally {
      setBusy(false);
    }
  }

  const detail=selected?.phase32Forecast?.predictions || {};
  const selectedScore = selected ? phase16ScoreFor(selected) : null;
  const sortedRows = [...rows].sort((a,b)=>{
    const scoreA = phase16ScoreFor(a).totalPoints;
    const scoreB = phase16ScoreFor(b).totalPoints;
    if (participantSort === 'points_desc') return scoreB - scoreA || a.name.localeCompare(b.name);
    if (participantSort === 'points_asc') return scoreA - scoreB || a.name.localeCompare(b.name);
    if (participantSort === 'name_desc') return b.name.localeCompare(a.name);
    return a.name.localeCompare(b.name);
  });

  return <section className="admin-layout"><div className="panel admin-controls"><h2><ShieldCheck/> Controles de fase</h2><div className="control-grid"><div><b>Registro de nuevos usuarios</b><span>{appSettings.registrationEnabled ? 'Abierto' : 'Cerrado'}</span></div><button className="ghost" disabled={busy} onClick={()=>runPhaseAction('set_registration_enabled', !appSettings.registrationEnabled)}>{appSettings.registrationEnabled ? 'Inhabilitar registros' : 'Habilitar registros'}</button><div><b>Pronósticos FASE 1</b><span>{appSettings.phase1PredictionsLocked ? 'Bloqueados/confirmados' : 'Habilitados para edición'}</span></div><button className={appSettings.phase1PredictionsLocked ? 'ghost' : 'danger'} disabled={busy} onClick={()=>runPhaseAction(appSettings.phase1PredictionsLocked ? 'unlock_all_predictions' : 'lock_all_predictions')}>{appSettings.phase1PredictionsLocked ? 'Habilitar pronósticos' : 'Bloquear todos'}</button><div><b>Pronóstico 16°</b><span>{phase32DeadlinePassed() ? (appSettings.phase32PredictionsUnlocked ? 'Habilitado por ADMIN' : 'Bloqueado automáticamente') : 'Abierto hasta cierre vigente'}</span></div><button className={appSettings.phase32PredictionsUnlocked ? 'danger' : 'ghost'} disabled={busy} onClick={()=>runPhaseAction('set_phase32_unlocked', !appSettings.phase32PredictionsUnlocked)}>{appSettings.phase32PredictionsUnlocked ? 'Bloquear Pronóstico 16°' : 'Habilitar Pronóstico 16°'}</button></div><p className="muted">Estas acciones afectan a todos los participantes. El bloqueo masivo coloca los pronósticos existentes en estado CONFIRMADO.</p></div><div className="panel"><h2><Users/> Participantes registrados</h2><div className="participant-sort"><label>Ordenar por</label><select value={participantSort} onChange={e=>setParticipantSort(e.target.value)}><option value="points_desc">Puntos: mayor a menor</option><option value="points_asc">Puntos: menor a mayor</option><option value="name_asc">Nombre: A-Z</option><option value="name_desc">Nombre: Z-A</option></select></div><div className="admin-share-actions"><button className="primary share-ranking-btn" disabled={!rows.length} onClick={shareRanking}><Share2 size={16}/> Compartir ranking</button></div><div className="participant-list">{sortedRows.map(r=>{const rowScore=phase16ScoreFor(r); return <button key={r.id} onClick={()=>setSelected(r)} className={selected?.id===r.id?'selected':''}><b>{r.name}</b><span>{r.role} · {phase16StatusMeta(r)} · 8°: {rowScore.totalPoints} pts</span></button>})}</div></div><div className="panel"><div className="admin-title-row"><h2>Detalle</h2><button className="ghost" disabled={busy} onClick={syncNow}>Recalcular puntajes</button></div>{!selected ? <p className="muted">Seleccione un participante para consultar sus pronósticos.</p> : <><div className="admin-detail-head"><div><p><b>{selected.name}</b> · clave: {selected.uniqueKey}</p>{selectedScore && <p className="muted">Puntos Pronóstico 8°: <b>{selectedScore.totalPoints} pts</b> · Clasificado: {selectedScore.winnerPoints} pts · Marcador: {selectedScore.scorePoints} · Forma: {selectedScore.penaltyPoints || 0}</p>}</div>{selected.role !== 'admin' && <button className="danger" disabled={busy} onClick={removeSelected}>Eliminar usuario y pronóstico</button>}</div>{message && <p className="admin-message">{message}</p>}<details className="result-admin"><summary>Resultado real Pronóstico 8° <span className="admin-only-badge">Solo ADMIN</span></summary><div className="real-admin-list phase32-real-admin-list">{sortPhase32MatchesByKickoff(phase16Matches).map(m=>{const current=phase16RealScores?.[m.id] || {}; const draft=phase16ScoreDraft[m.id] || {}; const wentPenalties = Boolean(draft.wentPenalties ?? current.wentPenalties ?? false); const unresolved=!phase16TeamsResolved(m); return <div className="real-admin-row phase32-real-admin-row" key={m.id}><span>{m.matchNo}</span><b>{label(m.home)} vs {label(m.away)}</b><input type="number" min="0" max="99" disabled={unresolved} value={draft.homeGoals ?? current.homeGoals ?? ''} onChange={e=>setPhase16ScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),homeGoals:e.target.value}}))}/><span>:</span><input type="number" min="0" max="99" disabled={unresolved} value={draft.awayGoals ?? current.awayGoals ?? ''} onChange={e=>setPhase16ScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),awayGoals:e.target.value}}))}/><label className="phase32-admin-penalty"><input type="checkbox" disabled={unresolved} checked={wentPenalties} onChange={e=>setPhase16ScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),wentPenalties:e.target.checked}}))}/> Penales</label>{wentPenalties && <select value={draft.penaltyWinner ?? current.penaltyWinner ?? ''} onChange={e=>setPhase16ScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),penaltyWinner:e.target.value}}))}><option value="">Ganador penales</option><option value={m.home}>{TEAMS[m.home]?.name || m.home}</option><option value={m.away}>{TEAMS[m.away]?.name || m.away}</option></select>}<button className="ghost" disabled={unresolved} onClick={()=>persistPhase16RealScore(m.id)}>Guardar</button></div>})}</div></details><div className="admin-phase32-grid">{sortPhase32MatchesByKickoff(phase16Matches).map(match=>{const detail16=selected?.phase16Forecast?.predictions || {}; const prediction=detail16?.[match.id] || {}; const real=phase16RealScores?.[match.id] || {}; const ev=evaluatePhase16Prediction(match, detail16 || {}, phase16RealScores || {}); const points=ev?.points || 0; const hasReal=real && real.homeGoals!=null && real.awayGoals!=null; const predictionHit=Boolean(ev?.winnerHit || ev?.scoreHit || ev?.methodHit || ev?.penaltyHit); return <div className={`admin-phase32-card ${predictionHit?'admin-phase32-card-hit':''}`} key={match.id}><div className="admin-phase32-head"><span>{match.matchNo}</span><div><b>{match.id}</b><em>{points} pts</em></div></div><strong className="admin-phase32-title">{label(match.home)} vs {label(match.away)}</strong><p className={`admin-phase32-prediction ${predictionHit?'hit':''}`}><span>Pronóstico:</span> <b>{phase32PredictionLabel(match,prediction)}</b></p><p className={`admin-phase32-real ${hasReal?'has-real':''}`}><span>Resultado REAL:</span> <b>{formatPhase32Real(real,match)}</b></p></div>})}</div></div></>}</div>{showSharePreview && <div className="share-preview-overlay" role="dialog" aria-modal="true"><div className="share-preview-card"><div className="share-preview-head"><div><span>Vista previa</span><h3>Ranking para compartir</h3></div><button className="ghost" onClick={()=>setShowSharePreview(false)}>Cerrar</button></div><pre>{shareText}</pre><div className="share-preview-actions"><button className="ghost" onClick={async()=>{await navigator.clipboard?.writeText(shareText); setMessage('Ranking copiado al portapapeles.');}}>Copiar texto</button><button className="primary" onClick={confirmShareRanking}><Share2 size={16}/> Compartir</button></div></div></div>}</section>
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
