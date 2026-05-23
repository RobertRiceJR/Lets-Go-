import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import ActivityCard, { CATEGORY_EMOJIS } from './ActivityCard.jsx';

const CATEGORIES = Object.keys(CATEGORY_EMOJIS);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ activities, onUpdate, onPickForMe }) {
  const stats = useMemo(() => {
    const done = activities.filter((a) => a.status === 'done');
    const wantToDo = activities.filter((a) => a.status === 'want to do');
    const now = new Date();
    const thisMonth = done.filter((a) => {
      if (!a.date_completed) return false;
      const d = new Date(a.date_completed + 'T12:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return { total: activities.length, done: done.length, wantToDo: wantToDo.length, thisMonth: thisMonth.length };
  }, [activities]);

  const categoryBreakdown = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: cat,
        emoji: CATEGORY_EMOJIS[cat],
        total: activities.filter((a) => a.category === cat).length,
        done: activities.filter((a) => a.category === cat && a.status === 'done').length,
      })).filter((c) => c.total > 0),
    [activities]
  );

  const recentlyDone = useMemo(
    () =>
      activities
        .filter((a) => a.status === 'done' && a.date_completed)
        .sort((a, b) => new Date(b.date_completed) - new Date(a.date_completed))
        .slice(0, 3),
    [activities]
  );

  const upNext = useMemo(
    () => activities.filter((a) => a.status === 'want to do').slice(0, 4),
    [activities]
  );

  return (
    <div className="py-8 space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
          {getGreeting()} 👋
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
          Where are we <span className="text-gradient">going?</span>
        </h1>
        <p className="text-slate-400 text-lg">
          {stats.wantToDo} adventure{stats.wantToDo !== 1 ? 's' : ''} on the list
          {stats.thisMonth > 0 && (
            <span className="ml-2 text-amber-400 font-semibold">
              · {stats.thisMonth} done this month 🔥
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard emoji="🗺️" label="Total" value={stats.total} color="text-slate-300" />
        <StatCard emoji="✅" label="Completed" value={stats.done} color="text-emerald-400" />
        <StatCard emoji="⭐" label="On the List" value={stats.wantToDo} color="text-amber-400" />
        <StatCard emoji="🔥" label="This Month" value={stats.thisMonth} color="text-orange-400" />
      </div>

      {/* Pick for Me */}
      {stats.wantToDo > 0 && (
        <button
          onClick={onPickForMe}
          className="w-full group relative overflow-hidden py-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white font-black text-xl sm:text-2xl shadow-2xl hover:shadow-amber-500/30 hover:scale-[1.015] active:scale-[0.99] transition-all duration-200"
        >
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-3">
            <span className="text-3xl">🎲</span>
            Pick Something For Me!
            <Sparkles size={24} className="group-hover:animate-spin" />
          </div>
        </button>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <SectionHeader title="By Category" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoryBreakdown.map((cat) => (
              <div
                key={cat.name}
                className="bg-[#1a2744] rounded-xl p-4 border border-white/6 hover:border-amber-500/25 transition-all duration-200"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <p className="text-sm font-semibold text-slate-200 mt-2 leading-tight">{cat.name}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                      style={{ width: cat.total > 0 ? `${(cat.done / cat.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[0.65rem] text-slate-500 tabular-nums">{cat.done}/{cat.total}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Done */}
      {recentlyDone.length > 0 && (
        <section>
          <SectionHeader title="🏆 Recently Completed" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentlyDone.map((a) => (
              <ActivityCard key={a.id} activity={a} onUpdate={onUpdate} />
            ))}
          </div>
        </section>
      )}

      {/* Up Next */}
      {upNext.length > 0 && (
        <section>
          <SectionHeader title="⭐ Up Next" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upNext.map((a) => (
              <ActivityCard key={a.id} activity={a} onUpdate={onUpdate} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl animate-float">✨</div>
          <h3 className="text-2xl font-bold text-white">Your adventure list is empty!</h3>
          <p className="text-slate-400">
            Tap the <span className="text-amber-400 font-semibold">+</span> button to add your first activity.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, label, value, color }) {
  return (
    <div className="bg-[#1a2744] rounded-2xl p-4 sm:p-5 border border-white/6 flex flex-col gap-1">
      <span className="text-2xl">{emoji}</span>
      <span className={`text-3xl font-black ${color} tabular-nums`}>{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
}

function SectionHeader({ title }) {
  return <h2 className="text-xl font-black text-white mb-4">{title}</h2>;
}
