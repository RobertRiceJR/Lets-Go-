import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import ActivityCard from './ActivityCard.jsx';

export default function KanbanView({ activities, setActivities, onUpdate, onDelete, onEdit }) {
  const wantToDo = useMemo(() => activities.filter((a) => a.status === 'want to do'), [activities]);
  const done = useMemo(() => activities.filter((a) => a.status === 'done'), [activities]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const id = parseInt(draggableId, 10);
    const toStatus = destination.droppableId;
    const fromStatus = source.droppableId;

    if (toStatus === fromStatus) return;

    const today = new Date().toISOString().split('T')[0];
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: toStatus,
              date_completed: toStatus === 'done' ? today : null,
              rating: toStatus === 'done' ? a.rating : null,
            }
          : a
      )
    );

    if (toStatus === 'done') {
      confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
        ticks: 250,
      });
    }

    await onUpdate(id, { status: toStatus });
  };

  return (
    <div className="py-8 animate-fade-in">
      <h2 className="text-2xl font-black text-white mb-6">Adventure Board</h2>
      <p className="text-slate-500 text-sm mb-6 -mt-4">
        Drag cards between columns to update their status.
      </p>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid lg:grid-cols-2 gap-6">
          <KanbanColumn
            droppableId="want to do"
            title="Want to Do"
            headerEmoji="⭐"
            count={wantToDo.length}
            activities={wantToDo}
            accentClass="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            dropActiveClass="border-amber-400/40 bg-amber-500/5"
            countClass="bg-amber-500/20 text-amber-400"
            emptyMessage="Add some adventures with the + button!"
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEdit={onEdit}
          />
          <KanbanColumn
            droppableId="done"
            title="Done!"
            headerEmoji="🏆"
            count={done.length}
            activities={done}
            accentClass="from-emerald-500/20 to-teal-500/10 border-emerald-500/30"
            dropActiveClass="border-emerald-400/40 bg-emerald-500/5"
            countClass="bg-emerald-500/20 text-emerald-400"
            emptyMessage="Drag something over here when you've done it!"
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      </DragDropContext>
    </div>
  );
}

function KanbanColumn({
  droppableId, title, headerEmoji, count, activities,
  accentClass, dropActiveClass, countClass, emptyMessage,
  onUpdate, onDelete, onEdit,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r border ${accentClass}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{headerEmoji}</span>
          <h3 className="font-black text-white text-base">{title}</h3>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${countClass}`}>{count}</span>
      </div>

      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[240px] rounded-2xl border-2 border-dashed p-3 space-y-3 transition-all duration-200 ${
              snapshot.isDraggingOver ? dropActiveClass : 'border-white/8'
            }`}
          >
            {activities.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-36 text-slate-600 text-sm text-center px-4">
                {emptyMessage}
              </div>
            )}
            {activities.map((activity, index) => (
              <Draggable key={activity.id} draggableId={String(activity.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="drag-handle"
                  >
                    <ActivityCard
                      activity={activity}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
