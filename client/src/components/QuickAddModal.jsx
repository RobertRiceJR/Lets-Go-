import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CATEGORY_EMOJIS } from './ActivityCard.jsx';

const CATEGORIES = Object.keys(CATEGORY_EMOJIS);
const DRIVE_TIMES = ['under 30 min', '30-60 min', '1-2 hours', '2+ hours'];
const SEASONS = ['Any', 'Spring', 'Summer', 'Fall', 'Winter'];
const SEASON_ICONS = { Any: '🌈', Spring: '🌸', Summer: '☀️', Fall: '🍂', Winter: '❄️' };

const DEFAULT_FORM = { title: '', category: '', drive_time: '', season: 'Any', notes: '' };

export default function QuickAddModal({ editActivity, onClose, onCreate, onUpdate }) {
  const isEditing = !!editActivity;
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (editActivity) {
      setForm({
        title: editActivity.title,
        category: editActivity.category,
        drive_time: editActivity.drive_time,
        season: editActivity.season || 'Any',
        notes: editActivity.notes || '',
      });
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [editActivity]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const canSubmit = form.title.trim() && form.category && form.drive_time;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      if (isEditing) {
        await onUpdate(editActivity.id, form);
      } else {
        await onCreate(form);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#111c35] rounded-2xl border border-white/8 shadow-2xl animate-slide-up max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 flex-shrink-0">
          <h2 className="text-lg font-black text-white">
            {isEditing ? '✏️ Edit Activity' : '✨ New Adventure'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="What's the adventure? 🌟"
              required
              className="w-full bg-[#1a2744] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-base font-semibold transition-colors"
            />

            {/* Category grid */}
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set('category')(cat)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all duration-150 ${
                      form.category === cat
                        ? 'border-amber-500/60 bg-amber-500/15 shadow-inner'
                        : 'border-white/8 bg-[#1a2744] hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl">{CATEGORY_EMOJIS[cat]}</span>
                    <span className={`text-[0.62rem] leading-tight font-medium ${form.category === cat ? 'text-amber-300' : 'text-slate-400'}`}>
                      {cat}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Drive time */}
              <div>
                <Label>Drive Time</Label>
                <div className="space-y-1.5">
                  {DRIVE_TIMES.map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => set('drive_time')(dt)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs border font-medium transition-all duration-150 ${
                        form.drive_time === dt
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                          : 'border-white/8 bg-[#1a2744] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      🚗 {dt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <Label>Season</Label>
                <div className="space-y-1.5">
                  {SEASONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('season')(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs border font-medium transition-all duration-150 ${
                        form.season === s
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                          : 'border-white/8 bg-[#1a2744] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {SEASON_ICONS[s]} {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes <span className="text-slate-600 font-normal normal-case">(optional)</span></Label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes')(e.target.value)}
                placeholder="Tips, reminders, must-tries…"
                rows={2}
                className="w-full bg-[#1a2744] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm resize-none transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex-shrink-0">
            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {busy ? '✨ Saving…' : isEditing ? '✓ Save Changes' : '+ Add to the List!'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{children}</p>
  );
}
