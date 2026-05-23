import React, { useState, useRef, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { CATEGORY_EMOJIS } from './ActivityCard.jsx';

const DRIVE_TIMES = ['under 30 min', '30-60 min', '1-2 hours', '2+ hours'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

export default function PickForMeModal({ activities, onClose }) {
  const [driveFilter, setDriveFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [picked, setPicked] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const [shuffleItem, setShuffleItem] = useState(null);
  const intervalRef = useRef(null);

  const filtered = activities.filter((a) => {
    if (driveFilter && a.drive_time !== driveFilter) return false;
    if (seasonFilter && a.season !== seasonFilter && a.season !== 'Any') return false;
    return true;
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const pickRandom = () => {
    if (filtered.length === 0 || shuffling) return;
    setShuffling(true);
    setPicked(null);

    let ticks = 0;
    const totalTicks = 14;

    intervalRef.current = setInterval(() => {
      setShuffleItem(filtered[Math.floor(Math.random() * filtered.length)]);
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(intervalRef.current);
        const final = filtered[Math.floor(Math.random() * filtered.length)];
        setShuffleItem(null);
        setPicked(final);
        setShuffling(false);
      }
    }, 80);
  };

  const display = shuffling ? shuffleItem : picked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#111c35] rounded-2xl border border-white/8 shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <h2 className="text-lg font-black text-white">Pick for Me!</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-white/6 flex gap-2">
          <select
            value={driveFilter}
            onChange={(e) => { setDriveFilter(e.target.value); setPicked(null); }}
            className="flex-1 bg-[#1a2744] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/40 appearance-none cursor-pointer"
          >
            <option value="">Any drive time</option>
            {DRIVE_TIMES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={seasonFilter}
            onChange={(e) => { setSeasonFilter(e.target.value); setPicked(null); }}
            className="flex-1 bg-[#1a2744] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/40 appearance-none cursor-pointer"
          >
            <option value="">Any season</option>
            {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Display area */}
        <div className="px-5 py-6 min-h-[220px] flex items-center justify-center">
          {filtered.length === 0 ? (
            <div className="text-center space-y-2">
              <div className="text-5xl">😅</div>
              <p className="text-white font-bold">No matches!</p>
              <p className="text-slate-400 text-sm">Try relaxing the filters.</p>
            </div>
          ) : !display && !shuffling ? (
            <div className="text-center space-y-3">
              <div className="text-5xl animate-float">✨</div>
              <p className="text-slate-300 text-sm">
                {filtered.length} option{filtered.length !== 1 ? 's' : ''} available
              </p>
              <p className="text-slate-500 text-xs">Hit the button below!</p>
            </div>
          ) : display ? (
            <div
              className={`w-full transition-all duration-100 ${
                shuffling ? 'opacity-60 scale-95' : 'animate-bounce-in'
              }`}
            >
              <div className="bg-gradient-to-br from-[#1e3060] to-[#1a2744] rounded-2xl p-6 border border-amber-500/25 shadow-xl text-center space-y-3">
                <div className="text-5xl">{CATEGORY_EMOJIS[display.category]}</div>
                <h3 className="text-2xl font-black text-white leading-tight">{display.title}</h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20 font-semibold">
                    🚗 {display.drive_time}
                  </span>
                  {display.season && display.season !== 'Any' && (
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-700/60 text-slate-300 border border-white/8">
                      {display.season}
                    </span>
                  )}
                </div>
                {display.notes && !shuffling && (
                  <p className="text-slate-400 text-xs italic leading-relaxed">
                    "{display.notes}"
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={pickRandom}
            disabled={shuffling || filtered.length === 0}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            <RefreshCw size={15} className={shuffling ? 'animate-spin' : ''} />
            {shuffling ? 'Picking…' : picked ? 'Pick Again!' : 'Pick for Me!'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-[#1a2744] border border-white/8 text-slate-300 font-semibold hover:bg-white/5 transition-colors text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
