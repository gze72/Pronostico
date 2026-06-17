import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, BarChart3, LogOut, ShieldCheck, CheckCircle2, LockKeyhole, Menu, X, Save, PanelLeftClose, PanelLeftOpen, Share2 } from 'lucide-react';
import { GROUPS, TEAMS } from './lib/worldcupData';
import { allGroupsCompleted, buildQualified, buildRoundOf32, calculateParticipantScore, calculateRealStandings, calculateStandings, evaluatePrediction, groupCompleted, winnerLabel } from './lib/scoring';
import { adminPhaseControl, deleteParticipantAndForecast, getAppSettings, getForecast, getMatches, getRealScores, listParticipantsWithForecasts, loginOrCreateParticipant, saveForecast, saveParticipantScore, saveRealScore, supabase, syncResultsAndScores, getDailyEditorialSummary } from './lib/storage';
import './styles.css';

function App(){
  // mobile-ranking-fix-body-sync
  useEffect(() => {
    const syncBody = () => {
      const drawer =
        document.querySelector('.sidebar.open, .sidebar.is-open, .sidebar.sidebar-open, .app-sidebar.open, .layout-sidebar.open') ||
        document.querySelector('[data-sidebar-open="true"]');

      if (drawer) document.body.classList.add('sidebar-open');
      else document.body.classList.remove('sidebar-open');
    };

    syncBody();
    const obs = new MutationObserver(syncBody);
    obs.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'data-sidebar-open', 'aria-expanded'] });

    return () => {
      obs.disconnect();
      document.body.classList.remove('sidebar-open');
    };
  }, []);


  const [participant,setParticipant] = useState(null);
  const [matches,setMatches] = useState([]);
  const [realScores,setRealScores] = useState({});
  const [predictions,setPredictions] = useState({});
  const [activeGroup,setActiveGroup] = useState('A');
  const [view,setView] = useState('pronostico');
  const [sidebar,setSidebar] = useState(() => window.innerWidth >= 900);
  const [toast,setToast] = useState('');
  const [forecastStatus,setForecastStatus] = useState('empty');
  const [showPrizePopup,setShowPrizePopup] = useState(false);
  const [appSettings,setAppSettings] = useState({ registrationEnabled:true, phase1PredictionsLocked:false });
  const [syncStatus,setSyncStatus] = useState('Sincronizando resultados...');
  const [rankingRows,setRankingRows] = useState([]);
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
      try {
        setRankingRows(await listParticipantsWithForecasts());
      } catch {
        setRankingRows([]);
      }
    }
    boot();
  },[]);
  useEffect(()=>{ if(participant) getForecast(participant.id).then(f=>{ setPredictions(f?.predictions || {}); setForecastStatus(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); }); },[participant]);
  useEffect(()=>{
    function handleResponsiveSidebar(){
      setSidebar(window.innerWidth >= 900);
    }
    window.addEventListener('resize', handleResponsiveSidebar);
    return () => window.removeEventListener('resize', handleResponsiveSidebar);
  },[]);

  const currentScore = calculateParticipantScore(matches,predictions,realScores);
  const publicRankingRows = useMemo(() => buildPremiumRankingRows(rankingRows,matches,realScores), [rankingRows,matches,realScores]);
  const sidebarRankingRows = publicRankingRows.slice(0,5);
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
  if(!participant) return <Login onLogin={setParticipant}/>;
  return <div className="app-shell">
    <Watermark />
    <aside className={`sidebar ${sidebar?'open':''}`}><button className="sidebar-close" onClick={()=>setSidebar(false)} aria-label="Cerrar menú"><X size={18}/><span>Cerrar</span></button>
      <div className="brand"><div className="brand-mark"><Trophy size={20}/></div><div><b>Zambranada 2026</b><span>{supabase ? 'Supabase activo' : 'Modo demo local'}</span></div></div>
      <nav>
        <button className={view==='pronostico'?'active':''} onClick={()=>{setView('pronostico'); setSidebar(false)}}><Trophy/> Pronóstico</button>
        <button className={view==='reporte'?'active':''} onClick={()=>{setView('reporte'); setSidebar(false)}}><BarChart3/> Reporte</button>
        {participant.role === 'admin' && <button className={view==='admin'?'active':''} onClick={()=>{setView('admin'); setSidebar(false)}}><ShieldCheck/> Administración</button>}
      </nav>
      <PremiumSidebarRanking rows={sidebarRankingRows} onOpenReport={()=>{setView('reporte'); setSidebar(false)}}/>
      <div className="user-card"><span>{participant.role === 'admin' ? 'Administrador' : 'Participante'}</span><b>{participant.name}</b><div className="score-mini"><ScoreRatio score={currentScore} compact/><small>FASE 1 · {scorePercent(currentScore)}% aciertos</small></div><button onClick={()=>setParticipant(null)}><LogOut size={16}/> Salir</button></div>
    </aside>
    {sidebar && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={()=>setSidebar(false)} />}
    <main className="content">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(!sidebar)}>{sidebar?<X/>:<Menu/>}<span>{sidebar ? "Cerrar" : "Menú"}</span></button><div><p>Campeonato Mundial de Fútbol 2026 · Zambranada</p><h1>{view==='pronostico'?'Registro de pronóstico (FASE 1)':view==='reporte'?'Reportes':'Panel administrador'}</h1></div><div className="topbar-actions"><div className="sync-pill">{syncStatus}</div><div className={`status-pill ${forecastStatus}`}><Save size={16}/>{forecastStatus === 'confirmed' ? 'Confirmado' : forecastStatus === 'draft' ? 'Borrador guardado' : 'Sin guardar'}</div><div className="progress-pill"><CheckCircle2 size={16}/>{completedCount}/12 grupos</div></div></header>
      {view==='pronostico' && <PredictionView matches={matches} predictions={predictions} realScores={realScores} activeGroup={activeGroup} setActiveGroup={setActiveGroup} setScore={setScore} persist={persist} canConfirm={canConfirm} forecastStatus={forecastStatus} appSettings={appSettings}/>} 
      {view==='reporte' && <ReportView participant={participant} matches={matches} predictions={predictions} realScores={realScores} rankingRows={rankingRows}/>} 
      {view==='admin' && participant.role === 'admin' && <AdminView matches={matches} realScores={realScores} setRealScores={setRealScores} participant={participant} appSettings={appSettings} setAppSettings={setAppSettings}/>} 
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

function Team({code}){ const t=TEAMS[code]; return <div className="team"><span>{t?.flag}</span><b>{t?.name}</b></div> }
function label(code){ return TEAMS[code] ? `${TEAMS[code].flag} ${TEAMS[code].name}` : code; }
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
function PremiumSidebarRanking({rows,onOpenReport}){
  return <section className="premium-sidebar-ranking"><div className="premium-sidebar-ranking-head"><div><span>Ranking actual</span><small>Actualizado · ahora</small></div><b>🏆</b></div><div className="premium-sidebar-ranking-list">{rows.length?rows.map((row,index)=><div className={`premium-sidebar-rank rank-${index+1}`} key={row.id || row.name}><i>{rankMedal(index)}</i><div><strong>{row.name}</strong><small>{row.score.totalPoints} pts · {row.percent}%</small></div></div>):<p className="premium-sidebar-empty">Aún no hay ranking disponible.</p>}</div><button type="button" className="premium-sidebar-link" onClick={onOpenReport}>Ver ranking completo <span>›</span></button></section>
}
function PremiumRankingReport({rows}){
  const leader=rows[0];
  const maxPoints=rows.reduce((max,r)=>Math.max(max,r.possible||0),0);
  const evaluated=maxPoints>0?maxPoints/2:0;
  const confirmed=rows.filter(r=>r.forecast?.confirmed).length;
  const winnerTotal=leader?.score?.winnerPoints || 0;
  const scoreTotal=leader?.score?.scorePoints || 0;
  return <section className="premium-ranking-report"><div className="premium-ranking-hero"><div className="premium-ranking-icon">🏆</div><div><span>Reporte oficial</span><h2>Ranking de participantes</h2><p>Resumen general de puntos, rendimiento y estado de participación en la FASE 1.</p></div></div><div className="premium-ranking-metrics"><article><span>Puntos FASE 1</span><strong>{leader?`${leader.score.totalPoints} / ${maxPoints}`:`0 / ${maxPoints}`} <small>pts</small></strong><p>{leader?`${leader.percent}% de aciertos del líder`:'Sin puntaje registrado'}</p></article><article><span>Ganador</span><strong>{winnerTotal}</strong><p>Predicciones correctas del líder</p></article><article><span>Score exacto</span><strong>{scoreTotal}</strong><p>Marcadores exactos del líder</p></article><article><span>Partidos evaluados</span><strong>{evaluated}</strong><p>{rows.length} participantes · {confirmed} confirmados</p></article></div><div className="premium-ranking-table"><div className="premium-ranking-table-head"><span>Pos</span><span>Participante</span><span>Puntos</span><span>Porcentaje</span><span>Estado</span></div>{rows.length?rows.map((row,index)=><div key={row.id || row.name} className={`premium-ranking-line ${index===0?'leader':''}`}><span className="premium-pos">{rankMedal(index)}</span><div className="premium-participant"><i>{participantInitials(row.name)}</i><div><strong>{row.name}</strong><small>Ganador: {row.score.winnerPoints} · Score: {row.score.scorePoints}</small></div></div><b>{row.score.totalPoints} pts</b><em>{row.percent}%</em><span className={`premium-status ${row.statusInfo.cls}`}>{row.statusInfo.label}</span></div>):<p className="premium-ranking-empty">No hay participantes disponibles para mostrar.</p>}</div></section>
}

function ReportView({participant,matches,predictions,realScores,rankingRows=[]}){
  const score = calculateParticipantScore(matches,predictions,realScores);
  const rankedRows = buildPremiumRankingRows(rankingRows,matches,realScores);
  return <div className="report-stack"><PremiumRankingReport rows={rankedRows}/><section className="panel report private-report"><h2>{participant.role==='admin'?'Consulta de pronóstico':'Mi pronóstico'}</h2><p className="muted">{participant.role==='admin'?'Use Administración para revisar todos los participantes.':'Vista privada de su pronóstico registrado o guardado.'}</p><div className="score-summary"><div><span>Puntos FASE 1</span><ScoreRatio score={score}/></div><div><span>Ganador</span><strong>{score.winnerPoints}</strong></div><div><span>Score exacto</span><strong>{score.scorePoints}</strong></div><div><span>Partidos evaluados</span><strong>{score.evaluatedMatches}</strong></div></div><div className="report-groups">{GROUPS.map(g=><div key={g.id} className="report-card"><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,predictions)}/></div>)}</div></section></div>
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

function AdminView({matches,realScores,setRealScores,participant,appSettings,setAppSettings}){
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [participantSort,setParticipantSort]=useState('points_desc');
  const [showSharePreview,setShowSharePreview]=useState(false);
  const [shareText,setShareText]=useState('');
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

  const detail=selected?.forecast?.predictions || {};
  const selectedScore = selected ? calculateParticipantScore(matches,detail,realScores) : null;
  const sortedRows = [...rows].sort((a,b)=>{
    const scoreA = calculateParticipantScore(matches,a.forecast?.predictions || {},realScores).totalPoints;
    const scoreB = calculateParticipantScore(matches,b.forecast?.predictions || {},realScores).totalPoints;
    if (participantSort === 'points_desc') return scoreB - scoreA || a.name.localeCompare(b.name);
    if (participantSort === 'points_asc') return scoreA - scoreB || a.name.localeCompare(b.name);
    if (participantSort === 'name_desc') return b.name.localeCompare(a.name);
    return a.name.localeCompare(b.name);
  });

  return <section className="admin-layout"><div className="panel admin-controls"><h2><ShieldCheck/> Controles de fase</h2><div className="control-grid"><div><b>Registro de nuevos usuarios</b><span>{appSettings.registrationEnabled ? 'Abierto' : 'Cerrado'}</span></div><button className="ghost" disabled={busy} onClick={()=>runPhaseAction('set_registration_enabled', !appSettings.registrationEnabled)}>{appSettings.registrationEnabled ? 'Inhabilitar registros' : 'Habilitar registros'}</button><div><b>Pronósticos FASE 1</b><span>{appSettings.phase1PredictionsLocked ? 'Bloqueados/confirmados' : 'Habilitados para edición'}</span></div><button className={appSettings.phase1PredictionsLocked ? 'ghost' : 'danger'} disabled={busy} onClick={()=>runPhaseAction(appSettings.phase1PredictionsLocked ? 'unlock_all_predictions' : 'lock_all_predictions')}>{appSettings.phase1PredictionsLocked ? 'Habilitar pronósticos' : 'Bloquear todos'}</button></div><p className="muted">Estas acciones afectan a todos los participantes. El bloqueo masivo coloca los pronósticos existentes en estado CONFIRMADO.</p></div><div className="panel"><h2><Users/> Participantes registrados</h2><div className="participant-sort"><label>Ordenar por</label><select value={participantSort} onChange={e=>setParticipantSort(e.target.value)}><option value="points_desc">Puntos: mayor a menor</option><option value="points_asc">Puntos: menor a mayor</option><option value="name_asc">Nombre: A-Z</option><option value="name_desc">Nombre: Z-A</option></select></div><div className="admin-share-actions"><button className="primary share-ranking-btn" disabled={!rows.length} onClick={shareRanking}><Share2 size={16}/> Compartir ranking</button></div><div className="participant-list">{sortedRows.map(r=>{const rowScore=calculateParticipantScore(matches,r.forecast?.predictions || {},realScores); return <button key={r.id} onClick={()=>setSelected(r)} className={selected?.id===r.id?'selected':''}><b>{r.name}</b><span>{r.role} · {r.forecast?.confirmed ? 'Confirmado' : r.forecast?.status === 'draft' ? 'Borrador' : 'Sin pronóstico'} · {scoreShortLabel(rowScore)}</span></button>})}</div></div><div className="panel"><div className="admin-title-row"><h2>Detalle</h2><button className="ghost" disabled={busy} onClick={syncNow}>Recalcular puntajes</button></div>{!selected ? <p className="muted">Seleccione un participante para consultar sus pronósticos.</p> : <><div className="admin-detail-head"><div><p><b>{selected.name}</b> · clave: {selected.uniqueKey}</p>{selectedScore && <p className="muted">Puntos FASE 1: <b>{scoreShortLabel(selectedScore)}</b> · Ganador: {selectedScore.winnerPoints} · Score: {selectedScore.scorePoints}</p>}</div>{selected.role !== 'admin' && <button className="danger" disabled={busy} onClick={removeSelected}>Eliminar usuario y pronóstico</button>}</div>{message && <p className="admin-message">{message}</p>}<details className="result-admin"><summary>Actualizar Score real FASE 1 <span className="admin-only-badge">Solo ADMIN</span></summary><div className="real-admin-list">{matches.map(m=>{const current=realScores[m.id] || {}; const draft=scoreDraft[m.id] || {}; return <div className="real-admin-row" key={m.id}><span>{m.matchNo}</span><b>{label(m.home)} vs {label(m.away)}</b><input type="number" min="0" max="99" value={draft.homeGoals ?? current.homeGoals ?? ''} onChange={e=>setScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),homeGoals:e.target.value}}))}/><span>:</span><input type="number" min="0" max="99" value={draft.awayGoals ?? current.awayGoals ?? ''} onChange={e=>setScoreDraft(prev=>({...prev,[m.id]:{...(prev[m.id]||{}),awayGoals:e.target.value}}))}/><button className="ghost" onClick={()=>persistRealScore(m.id)}>Guardar</button></div>})}</div></details><div className="report-groups compact admin-standings-grid">{GROUPS.map(g=><div className="report-card" key={g.id}><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,detail)}/></div>)}</div></>}</div>{showSharePreview && <div className="share-preview-overlay" role="dialog" aria-modal="true"><div className="share-preview-card"><div className="share-preview-head"><div><span>Vista previa</span><h3>Ranking para compartir</h3></div><button className="ghost" onClick={()=>setShowSharePreview(false)}>Cerrar</button></div><pre>{shareText}</pre><div className="share-preview-actions"><button className="ghost" onClick={async()=>{await navigator.clipboard?.writeText(shareText); setMessage('Ranking copiado al portapapeles.');}}>Copiar texto</button><button className="primary" onClick={confirmShareRanking}><Share2 size={16}/> Compartir</button></div></div></div>}</section>
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
