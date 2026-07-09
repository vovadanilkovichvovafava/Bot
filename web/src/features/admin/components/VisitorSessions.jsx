import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api';

/* Visitor sessions list + rrweb session replay (restored module). */
export default function VisitorSessions() {
  const [visits, setVisits] = useState([]);
  const [replaySession, setReplaySession] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => adminApi.getRecentVisits(50, 0)
      .then(r => { if (alive) setVisits(r.visits || []); })
      .catch(() => {});
    load();
    const iv = setInterval(load, 20000); // refresh sessions list
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return (
    <section className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Visitor sessions</h2>
        <span className="text-xs text-slate-500">{visits.length} recent · ▶ = replay available</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-slate-300">
          <thead className="text-xs text-slate-500 border-b border-slate-800">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Pages</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Last page</th>
              <th className="px-3 py-2 text-center">Replay</th>
            </tr>
          </thead>
          <tbody>
            {visits.map(v => (
              <tr key={v.session_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-2 text-xs whitespace-nowrap">
                  {v.is_live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle animate-pulse" />}
                  {fmtTime(v.last_activity || v.visit_time)}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-slate-400">{v.user_id ? v.user_id.slice(0, 12) : '—'}</td>
                <td className="px-3 py-2 text-xs">{v.country || '—'}</td>
                <td className="px-3 py-2 text-xs">{v.page_views}</td>
                <td className="px-3 py-2 text-xs">{fmtDur(v.duration_sec)}</td>
                <td className="px-3 py-2 text-xs text-slate-400 max-w-[180px] truncate">{v.last_page || '—'}</td>
                <td className="px-3 py-2 text-center">
                  {v.has_replay
                    ? <button onClick={() => setReplaySession(v.session_id)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">▶ Play</button>
                    : <span className="text-xs text-slate-600">—</span>}
                </td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">No sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {replaySession && <ReplayModal sessionId={replaySession} onClose={() => setReplaySession(null)} />}
    </section>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function fmtDur(sec) {
  if (!sec || sec < 1) return '—';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ── Session Replay modal (rrweb-player, lazy-loaded) ──
function ReplayModal({ sessionId, onClose }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    adminApi.getSessionReplay(sessionId)
      .then(d => { if (d.events?.length) setEvents(d.events); else setError('No replay events recorded'); })
      .catch(e => setError(e.message || 'No replay data for this session'));
  }, [sessionId]);

  useEffect(() => {
    if (!events?.length || !containerRef.current) return;
    let destroyed = false;
    Promise.all([import('rrweb-player'), import('rrweb-player/dist/style.css')])
      .then(([mod]) => {
        if (destroyed) return;
        const RRWebPlayer = mod.default || mod;
        playerRef.current = new RRWebPlayer({
          target: containerRef.current,
          props: { events, width: 410, height: 680, autoPlay: true, showController: true, speedOption: [1, 1.5, 2, 4] },
        });
      })
      .catch(() => setError('Failed to load replay player'));
    return () => {
      destroyed = true;
      if (playerRef.current) { try { playerRef.current.$destroy?.(); } catch { /* ignore */ } playerRef.current = null; }
    };
  }, [events]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[440px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Session Replay</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{sessionId?.slice(0, 16)}…</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg px-2">✕</button>
        </div>
        <div className="p-3 min-h-[300px] flex items-center justify-center">
          {error
            ? <p className="text-sm text-slate-400">{error}</p>
            : !events
              ? <p className="text-sm text-slate-500 animate-pulse">Loading replay…</p>
              : <div ref={containerRef} />}
        </div>
      </div>
    </div>
  );
}
