import React from 'react';
import { X } from 'lucide-react';

const CATEGORIES = [
  'Arts & Crafts', 'Day Trips', 'Lakes & Swimming', 'Hikes & Nature',
  'Rainy Day', 'Food & Restaurants', 'Seasonal', 'Local Gems',
];
const STATUSES = ['want to do', 'done'];
const DRIVE_TIMES = ['under 30 min', '30-60 min', '1-2 hours', '2+ hours'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Any'];

const EMPTY = { category: '', status: '', drive_time: '', season: '' };

export default function FilterBar({ filters, onChange }) {
  const hasFilters = Object.values(filters).some(Boolean);

  const set = (key) => (e) => onChange((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FilterSelect value={filters.status} onChange={set('status')} placeholder="All Status">
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </FilterSelect>
      <FilterSelect value={filters.category} onChange={set('category')} placeholder="All Categories">
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </FilterSelect>
      <FilterSelect value={filters.drive_time} onChange={set('drive_time')} placeholder="Any Drive Time">
        {DRIVE_TIMES.map((d) => <option key={d} value={d}>{d}</option>)}
      </FilterSelect>
      <FilterSelect value={filters.season} onChange={set('season')} placeholder="Any Season">
        {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </FilterSelect>

      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY)}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors font-medium"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`bg-[#1a2744] border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors cursor-pointer appearance-none pr-7 bg-no-repeat bg-[right_0.5rem_center] ${
        value
          ? 'border-amber-500/40 text-amber-300'
          : 'border-white/10 text-slate-300 hover:border-white/20'
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      }}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
