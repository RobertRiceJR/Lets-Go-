import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Activity } from 'lucide-react';

const CATEGORY_EMOJIS = {
  'Arts & Crafts': '🎨', 'Day Trips': '🚗', 'Lakes & Swimming': '🏊',
  'Hikes & Nature': '🌿', 'Rainy Day': '☔', 'Food & Restaurants': '🍕',
  Seasonal: '🍂', 'Local Gems': '💎',
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 30s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const isOk = data?.status === 'ok';

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 font-['Inter',system-ui,sans-serif]">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            <div>
              <h1 className="text-xl font-black text-white">Let's Go! — Status</h1>
              <p className="text-xs text-slate-500">
                {lastRefresh
                  ? `Last updated ${lastRefresh.toLocaleTimeString()}`
                  : 'Loading…'}
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a2744] border border-white/10 text-slate-300 text-sm hover:border-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status banner */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            error
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : isOk
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-700/40 border-white/10 text-slate-400'
          }`}
        >
          {error ? (
            <XCircle size={18} />
          ) : isOk ? (
            <CheckCircle size={18} />
          ) : (
            <Activity size={18} className="animate-pulse" />
          )}
          <span className="font-semibold text-sm">
            {error ? `Server unreachable — ${error}` : isOk ? 'Server is online' : 'Connecting…'}
          </span>
        </div>

        {data && (
          <>
            {/* Core metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Uptime" value={formatUptime(data.uptime)} emoji="⏱️" />
              <Metric label="Activities" value={data.db.total} emoji="🗺️" />
              <Metric label="Completed" value={data.db.done} emoji="✅" />
            </div>

            {/* DB breakdown */}
            <div className="bg-[#1a2744] rounded-2xl border border-white/6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/6">
                <h2 className="text-sm font-bold text-white">Database</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.db.done} done · {data.db.wantToDo} on the list
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {Object.entries(data.db.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span>{CATEGORY_EMOJIS[cat] || '📌'}</span>
                      {cat}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System info */}
            <div className="bg-[#1a2744] rounded-2xl border border-white/6 px-4 py-4 space-y-2">
              <h2 className="text-sm font-bold text-white mb-3">System</h2>
              <InfoRow label="Node.js" value={data.node_version} />
              <InfoRow
                label="Server time"
                value={new Date(data.timestamp).toLocaleString()}
              />
              <InfoRow
                label="Environment"
                value={
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
                    {import.meta.env.MODE}
                  </span>
                }
              />
            </div>
          </>
        )}

        {/* Back link */}
        <div className="text-center">
          <a
            href="/"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to the app
          </a>
        </div>
      </div>
    </div>
  );
}

function Metric({ emoji, label, value }) {
  return (
    <div className="bg-[#1a2744] rounded-xl border border-white/6 p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-black text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300 font-mono">{value}</span>
    </div>
  );
}
