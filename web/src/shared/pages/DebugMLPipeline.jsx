import { useState, useEffect } from 'react';
import { ENV } from '../config/env';

const API_BASE = ENV.API_URL.replace(/\/api\/v1$/, '');

export default function DebugMLPipeline() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/debug/ml-pipeline`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchStatus(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading ML pipeline status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 text-sm">Error: {error}</p>
        <button onClick={fetchStatus} className="text-sm text-primary-400 underline">Retry</button>
      </div>
    );
  }

  const p = data?.pipeline || {};
  const events = data?.last_events || {};
  const env = data?.env || {};
  const health = data?.health || 'unknown';

  const healthColor = {
    ready: 'text-green-400',
    enriching: 'text-yellow-400',
    collecting: 'text-blue-400',
    waiting_for_training: 'text-orange-400',
  }[health] || 'text-gray-400';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">ML Pipeline Debug</h1>
        <button onClick={fetchStatus} className="text-xs text-primary-400 border border-primary-400/30 rounded-lg px-3 py-1.5">
          Refresh
        </button>
      </div>

      {/* Health */}
      <div className="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-800">
        <p className="text-xs text-gray-500 mb-1">Health</p>
        <p className={`text-xl font-bold ${healthColor}`}>{health.toUpperCase()}</p>
      </div>

      {/* Pipeline Stats */}
      <div className="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-800">
        <p className="text-xs text-gray-500 mb-3">Pipeline</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Total Matches" value={p.total_matches} />
          <Stat label="Verified" value={p.verified} />
          <Stat label="Enriched (Ready)" value={p.enriched_training_ready} />
          <Stat label="Pending Enrichment" value={p.pending_enrichment} />
          <Stat label="Active Models" value={p.active_models} />
          <Stat label="Teams Tracked" value={p.teams_tracked} />
          <Stat label="Can Train" value={p.can_train ? 'Yes' : 'No'} highlight={p.can_train} />
        </div>
      </div>

      {/* Last Events */}
      <div className="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-800">
        <p className="text-xs text-gray-500 mb-3">Last Events</p>
        <EventRow label="Last Training" event={events.last_training} />
        <EventRow label="Last Data Collect" event={events.last_data_collect} />
      </div>

      {/* Env */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <p className="text-xs text-gray-500 mb-3">Environment</p>
        {Object.entries(env).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{k}</span>
            <span className={v === 'MISSING' ? 'text-red-400' : 'text-green-400'}>{v}</span>
          </div>
        ))}
      </div>

      {/* Raw JSON */}
      {data?.error && (
        <div className="mt-3 bg-red-900/30 rounded-xl p-4 border border-red-800">
          <p className="text-xs text-red-400">{data.error}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`font-semibold ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value ?? '-'}
      </p>
    </div>
  );
}

function EventRow({ label, event }) {
  if (!event?.at) {
    return (
      <div className="mb-2">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-gray-600 text-xs">Never</p>
      </div>
    );
  }
  const date = new Date(event.at);
  const ago = timeSince(date);
  return (
    <div className="mb-2">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-xs">{date.toLocaleString()} <span className="text-gray-500">({ago})</span></p>
    </div>
  );
}

function timeSince(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
