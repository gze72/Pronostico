import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, BarChart3, LogOut, ShieldCheck, CheckCircle2, LockKeyhole, Menu, X, Save } from 'lucide-react';
import { GROUPS, TEAMS } from './lib/worldcupData';
import { allGroupsCompleted, buildRoundOf32, calculateStandings, groupCompleted, winnerLabel } from './lib/scoring';
import { deleteParticipantAndForecast, getForecast, getMatches, listParticipantsWithForecasts, loginOrCreateParticipant, saveForecast, supabase } from './lib/storage';
import './styles.css';

function App(){
  const [participant,setParticipant] = useState(null);
  const [matches,setMatches] = useState([]);
  const [predictions,setPredictions] = useState({});
  const [activeGroup,setActiveGroup] = useState('A');
  const [view,setView] = useState('pronostico');
  const [sidebar,setSidebar] = useState(false);
  const [toast,setToast] = useState('');
  const [forecastStatus,setForecastStatus] = useState('empty');
  useEffect(()=>{ getMatches().then(setMatches); },[]);
  useEffect(()=>{ if(participant) getForecast(participant.id).then(f=>{ setPredictions(f?.predictions || {}); setForecastStatus(f?.status || (f?.confirmed ? 'confirmed' : 'empty')); }); },[participant]);
  const completedCount = GROUPS.filter(g=>groupCompleted(g.id,matches,predictions)).length;
  const canConfirm = allGroupsCompleted(matches,predictions);
  const setScore = (matchId, field, value) => {
    if (value !== '' && (Number(value) < 0 || Number(value) > 30)) return;
    setPredictions(prev => ({...prev, [matchId]: {...(prev[matchId]||{}), [field]: value}}));
  };
  const persist = async (confirmed=false) => {
    try {
      await saveForecast(participant.id, predictions, confirmed);
      setForecastStatus(confirmed ? 'confirmed' : 'draft');
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
      <div className="brand"><div className="brand-mark"><Trophy size={20}/></div><div><b>Quiniela 2026</b><span>{supabase ? 'Supabase activo' : 'Modo demo local'}</span></div></div>
      <nav>
        <button className={view==='pronostico'?'active':''} onClick={()=>{setView('pronostico'); setSidebar(false)}}><Trophy/> Pronóstico</button>
        <button className={view==='reporte'?'active':''} onClick={()=>{setView('reporte'); setSidebar(false)}}><BarChart3/> Reporte</button>
        {participant.role === 'admin' && <button className={view==='admin'?'active':''} onClick={()=>{setView('admin'); setSidebar(false)}}><ShieldCheck/> Administración</button>}
      </nav>
      <div className="user-card"><span>{participant.role === 'admin' ? 'Administrador' : 'Participante'}</span><b>{participant.name}</b><button onClick={()=>setParticipant(null)}><LogOut size={16}/> Salir</button></div>
    </aside>
    <main className="content">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setSidebar(!sidebar)}>{sidebar?<X/>:<Menu/>}</button><div><p>Campeonato Mundial de Fútbol 2026</p><h1>{view==='pronostico'?'Registro de pronóstico':view==='reporte'?'Reportes':'Panel administrador'}</h1></div><div className="topbar-actions"><div className={`status-pill ${forecastStatus}`}><Save size={16}/>{forecastStatus === 'confirmed' ? 'Confirmado' : forecastStatus === 'draft' ? 'Borrador guardado' : 'Sin guardar'}</div><div className="progress-pill"><CheckCircle2 size={16}/>{completedCount}/12 grupos</div></div></header>
      {view==='pronostico' && <PredictionView matches={matches} predictions={predictions} activeGroup={activeGroup} setActiveGroup={setActiveGroup} setScore={setScore} persist={persist} canConfirm={canConfirm}/>} 
      {view==='reporte' && <ReportView participant={participant} matches={matches} predictions={predictions}/>} 
      {view==='admin' && participant.role === 'admin' && <AdminView matches={matches}/>} 
      {toast && <div className="toast">{toast}</div>}
    </main>
  </div>
}
function Login({onLogin}){
  const [name,setName] = useState(''); const [key,setKey] = useState(''); const [err,setErr] = useState('');
  async function submit(e){ e.preventDefault(); try { setErr(''); const p = await loginOrCreateParticipant(name, key); onLogin(p); } catch(ex){ setErr(ex.message); } }
  return <div className="login-screen"><Watermark/><section className="login-card"><div className="brand large"><div className="brand-mark"><Trophy size={26}/></div><div><b>Quiniela Mundial 2026</b><span>Pronósticos privados por participante</span></div></div><form onSubmit={submit}><label>Nombre del participante<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Gregory Zambrano"/></label><label>Clave única<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Código personal"/></label>{err && <p className="error">{err}</p>}<button className="primary">Ingresar / Registrar</button><p className="hint"><LockKeyhole size={14}/> Demo administrador: nombre admin, clave ADMIN2026!</p></form></section></div>
}
function PredictionView({matches,predictions,activeGroup,setActiveGroup,setScore,persist,canConfirm}){
  const groupMatches = matches.filter(m=>m.groupId===activeGroup);
  const standings = calculateStandings(activeGroup,matches,predictions);
  const r32 = canConfirm ? buildRoundOf32(matches,predictions) : [];
  return <div className="prediction-grid"><section className="group-rail">{GROUPS.map(g=>{const done=groupCompleted(g.id,matches,predictions);return <button key={g.id} className={`${activeGroup===g.id?'active':''} ${done?'done':''}`} onClick={()=>setActiveGroup(g.id)}><span>Grupo {g.id}</span>{done && <CheckCircle2/>}</button>})}</section><section className="panel"><div className="panel-head"><div><span>Fase de grupos</span><h2>Grupo {activeGroup}</h2></div><button className="ghost" onClick={()=>persist(false)}>Guardar borrador</button></div><div className="matches">{groupMatches.map(m=><article className="match-card" key={m.id}><Team code={m.home}/><input type="number" min="0" max="30" value={predictions[m.id]?.homeGoals ?? ''} onChange={e=>setScore(m.id,'homeGoals',e.target.value)} /><span className="colon">:</span><input type="number" min="0" max="30" value={predictions[m.id]?.awayGoals ?? ''} onChange={e=>setScore(m.id,'awayGoals',e.target.value)} /><Team code={m.away}/><b className="winner">{winnerLabel(m,predictions[m.id])}</b></article>)}</div><Standings standings={standings}/><div className="confirm-row"><button className="primary" disabled={!canConfirm} onClick={()=>persist(true)}>Confirmar Pronóstico</button>{!canConfirm && <span>Complete los 12 grupos para habilitar la confirmación.</span>}</div></section><section className="panel slim"><h3>Llave proyectada</h3>{!canConfirm ? <p className="muted">La llave se mostrará al completar toda la fase de grupos.</p> : <div className="bracket-list">{r32.map(m=><div key={m.id}><small>{m.id}</small><span>{label(m.a)} vs {label(m.b)}</span></div>)}</div>}</section></div>
}
function Team({code}){ const t=TEAMS[code]; return <div className="team"><span>{t?.flag}</span><b>{t?.name}</b></div> }
function label(code){ return TEAMS[code] ? `${TEAMS[code].flag} ${TEAMS[code].name}` : code; }
function Standings({standings}){ return <table className="standings"><thead><tr><th>Pos</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.code}><td>{i+1}</td><td>{label(s.code)}</td><td>{s.pts}</td><td>{s.dg}</td><td>{s.gf}</td></tr>)}</tbody></table> }
function ReportView({participant,matches,predictions}){ return <section className="panel report"><h2>Consulta de pronóstico</h2><p className="muted">{participant.role==='admin'?'Use Administración para revisar todos los participantes.':'Vista privada de su pronóstico registrado o guardado.'}</p><div className="report-groups">{GROUPS.map(g=><div key={g.id} className="report-card"><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,predictions)}/></div>)}</div></section> }
function AdminView({matches}){
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

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

  const detail=selected?.forecast?.predictions || {};
  return <section className="admin-layout"><div className="panel"><h2><Users/> Participantes registrados</h2><div className="participant-list">{rows.map(r=><button key={r.id} onClick={()=>setSelected(r)} className={selected?.id===r.id?'selected':''}><b>{r.name}</b><span>{r.role} · {r.forecast?.confirmed ? 'Confirmado' : r.forecast?.status === 'draft' ? 'Borrador' : 'Sin pronóstico'}</span></button>)}</div></div><div className="panel"><h2>Detalle</h2>{!selected ? <p className="muted">Seleccione un participante para consultar sus pronósticos.</p> : <><div className="admin-detail-head"><p><b>{selected.name}</b> · clave: {selected.uniqueKey}</p>{selected.role !== 'admin' && <button className="danger" disabled={busy} onClick={removeSelected}>Eliminar usuario y pronóstico</button>}</div>{message && <p className="admin-message">{message}</p>}<div className="report-groups compact">{GROUPS.map(g=><div className="report-card" key={g.id}><h3>Grupo {g.id}</h3><Standings standings={calculateStandings(g.id,matches,detail)}/></div>)}</div></>}</div></section> }
function Watermark(){ return <div className="watermark" aria-hidden="true"><svg viewBox="0 0 280 280"><path d="M112 36h56c-2 46-8 76-28 95-20-19-26-49-28-95Z"/><path d="M83 48c-30 2-46 14-47 34-1 27 25 48 62 55l5-23c-27-4-43-17-42-31 1-8 9-12 25-13l-3-22Zm114 0 3 22c16 1 24 5 25 13 1 14-15 27-42 31l5 23c37-7 63-28 62-55-1-20-17-32-53-34Z"/><path d="M126 129h28v54h-28z"/><path d="M91 205h98v25H91z"/><circle cx="204" cy="198" r="38"/><path d="m184 190 20-14 22 14-8 25h-28z"/></svg></div> }
export default App;
