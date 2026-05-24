import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Navigation from './components/Navigation.jsx';
import Dashboard from './components/Dashboard.jsx';
import ListView from './components/ListView.jsx';
import KanbanView from './components/KanbanView.jsx';
import QuickAddModal from './components/QuickAddModal.jsx';
import PickForMeModal from './components/PickForMeModal.jsx';
import { fetchActivities, createActivity, updateActivity, deleteActivity } from './lib/api.js';
import StatusPage from './components/StatusPage.jsx';

export default function App() {
  // Serve the status page at /status without needing a router library
  if (window.location.pathname === '/status') return <StatusPage />;

  const [activities, setActivities] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPickForMe, setShowPickForMe] = useState(false);
  const [editActivity, setEditActivity] = useState(null);

  const loadActivities = useCallback(async () => {
    try {
      const data = await fetchActivities();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleCreate = async (data) => {
    const newActivity = await createActivity(data);
    setActivities((prev) => [newActivity, ...prev]);
    setShowQuickAdd(false);
  };

  const handleUpdate = async (id, data) => {
    const updated = await updateActivity(id, data);
    setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  const handleDelete = async (id) => {
    await deleteActivity(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleEdit = (activity) => {
    setEditActivity(activity);
    setShowQuickAdd(true);
  };

  const handleQuickAddClose = () => {
    setShowQuickAdd(false);
    setEditActivity(null);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navigation view={view} setView={setView} />

      <main className="max-w-7xl mx-auto px-4 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl animate-float">🗺️</div>
            <p className="text-slate-500 text-sm">Loading your adventures…</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard
                activities={activities}
                onUpdate={handleUpdate}
                onPickForMe={() => setShowPickForMe(true)}
              />
            )}
            {view === 'list' && (
              <ListView
                activities={activities}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
            {view === 'kanban' && (
              <KanbanView
                activities={activities}
                setActivities={setActivities}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
          </>
        )}
      </main>

      {/* Floating action button */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-200 animate-pulse-glow"
        aria-label="Add activity"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showQuickAdd && (
        <QuickAddModal
          editActivity={editActivity}
          onClose={handleQuickAddClose}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {showPickForMe && (
        <PickForMeModal
          activities={activities.filter((a) => a.status === 'want to do')}
          onClose={() => setShowPickForMe(false)}
        />
      )}
    </div>
  );
}
