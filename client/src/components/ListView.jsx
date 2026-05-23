import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import ActivityCard from './ActivityCard.jsx';
import FilterBar from './FilterBar.jsx';

export default function ListView({ activities, onUpdate, onDelete, onEdit }) {
  const [filters, setFilters] = useState({ category: '', status: '', drive_time: '', season: '' });
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filters.category && a.category !== filters.category) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.drive_time && a.drive_time !== filters.drive_time) return false;
      if (filters.season && filters.season !== 'Any' && a.season !== filters.season && a.season !== 'Any') return false;
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activities, filters, search]);

  return (
    <div className="py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">All Activities</h2>
        <span className="text-sm text-slate-500 tabular-nums">
          {filtered.length} of {activities.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search activities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a2744] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 text-sm transition-colors"
        />
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean) || !!search} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="text-center py-20 space-y-3">
      <div className="text-6xl animate-float">{hasFilters ? '🔍' : '🗺️'}</div>
      <h3 className="text-xl font-bold text-white">
        {hasFilters ? 'No matches found' : 'Nothing here yet!'}
      </h3>
      <p className="text-slate-400 text-sm max-w-xs mx-auto">
        {hasFilters
          ? 'Try clearing some filters or searching for something else.'
          : 'Tap the + button to add your first adventure.'}
      </p>
    </div>
  );
}
