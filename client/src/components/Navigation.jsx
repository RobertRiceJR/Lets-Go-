import React from 'react';
import { LayoutDashboard, List, Kanban } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'list', label: 'List', Icon: List },
  { id: 'kanban', label: 'Board', Icon: Kanban },
];

export default function Navigation({ view, setView }) {
  return (
    <header className="glass sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🗺️</span>
            <span className="text-xl font-black text-gradient tracking-tight">Let's Go!</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
