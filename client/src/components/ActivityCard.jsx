import React, { useState } from 'react';
import { Star, Trash2, Pencil, Check, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CATEGORY_EMOJIS = {
  'Arts & Crafts': '🎨',
  'Day Trips': '🚗',
  'Lakes & Swimming': '🏊',
  'Hikes & Nature': '🌿',
  'Rainy Day': '☔',
  'Food & Restaurants': '🍕',
  Seasonal: '🍂',
  'Local Gems': '💎',
};

const DRIVE_BADGE = {
  'under 30 min': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  '30-60 min': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  '1-2 hours': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  '2+ hours': 'bg-red-500/15 text-red-400 border-red-500/20',
};

const SEASON_ICON = { Spring: '🌸', Summer: '☀️', Fall: '🍂', Winter: '❄️' };

export default function ActivityCard({ activity, onUpdate, onDelete, onEdit, isDragging }) {
  const [busy, setBusy] = useState(false);
  const isDone = activity.status === 'done';

  const handleMarkDone = async (e) => {
    if (busy) return;
    setBusy(true);
    const { left, top, width } = e.currentTarget.getBoundingClientRect();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: {
        x: (left + width / 2) / window.innerWidth,
        y: top / window.innerHeight,
      },
      colors: ['#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
      ticks: 200,
    });
    try {
      await onUpdate(activity.id, { status: 'done' });
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onUpdate(activity.id, { status: 'want to do' });
    } finally {
      setBusy(false);
    }
  };

  const handleRating = (rating) => onUpdate(activity.id, { rating });

  return (
    <div
      className={`group relative flex flex-col bg-[#1a2744] rounded-2xl border transition-all duration-200 overflow-hidden
        ${isDone ? 'border-emerald-500/25' : 'border-white/6 card-glow'}
        ${isDragging ? 'shadow-2xl scale-[1.03] rotate-1 border-amber-500/40' : ''}
      `}
    >
      {/* Colored top stripe */}
      <div
        className={`h-0.5 w-full ${isDone ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
      />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{CATEGORY_EMOJIS[activity.category]}</span>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-bold text-[0.92rem] leading-snug ${
                isDone ? 'text-slate-400 line-through decoration-slate-600' : 'text-white'
              }`}
            >
              {activity.title}
            </h3>
            <span className="text-[0.7rem] text-slate-500 font-medium">{activity.category}</span>
          </div>
          {isDone && (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Check size={10} className="text-emerald-400" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[0.68rem] px-2 py-0.5 rounded-full border font-semibold ${DRIVE_BADGE[activity.drive_time]}`}
          >
            🚗 {activity.drive_time}
          </span>
          {activity.season && activity.season !== 'Any' && (
            <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-white/8">
              {SEASON_ICON[activity.season]} {activity.season}
            </span>
          )}
        </div>

        {/* Notes */}
        {activity.notes && (
          <p className="text-[0.72rem] text-slate-400 leading-relaxed line-clamp-2 italic">
            "{activity.notes}"
          </p>
        )}

        {/* Done extras */}
        {isDone && (
          <div className="flex items-center justify-between">
            {activity.date_completed && (
              <span className="text-[0.68rem] text-emerald-400 font-medium">
                ✓{' '}
                {new Date(activity.date_completed + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            <StarRating rating={activity.rating} onChange={handleRating} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 mt-auto">
          {!isDone ? (
            <button
              onClick={handleMarkDone}
              disabled={busy}
              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/25 active:scale-95 transition-all"
            >
              {busy ? '🎉 Woohoo!' : '✓ Mark Done'}
            </button>
          ) : (
            <button
              onClick={handleUndo}
              disabled={busy}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-700/40 text-slate-400 text-xs font-medium border border-white/5 hover:bg-slate-700/70 active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <RotateCcw size={11} /> Move Back
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(activity)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/6 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(activity.id)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating, onChange }) {
  const [hovered, setHovered] = useState(null);
  const active = hovered !== null ? hovered : rating || 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(null)}
          className="transition-transform hover:scale-125 active:scale-110"
        >
          <Star
            size={13}
            className={`transition-colors ${s <= active ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
          />
        </button>
      ))}
    </div>
  );
}
