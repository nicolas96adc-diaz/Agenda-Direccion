import React, { useState } from 'react';
import { AlertCircle, Clock, CalendarDays, Plus, Calendar } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskCard } from './TaskCard';

export const VencimientosView: React.FC = () => {
  const { overdueTasks, todayTasks, upcomingTasks, openCreateModal } = useTasks();
  const [filter, setFilter] = useState<'todos' | 'vencidas' | 'hoy' | 'proximas'>('todos');

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto pb-6">
      {/* Overview Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 shrink-0">
            <Calendar className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Control de Vencimientos
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Monitoreo y seguimiento de plazos de ejecución operativa para Dirección.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              filter === 'todos'
                ? 'bg-[#142136] text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({overdueTasks.length + todayTasks.length + upcomingTasks.length})
          </button>

          <button
            onClick={() => setFilter('vencidas')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              filter === 'vencidas'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Vencidas ({overdueTasks.length})</span>
          </button>

          <button
            onClick={() => setFilter('hoy')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              filter === 'hoy'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hoy ({todayTasks.length})</span>
          </button>

          <button
            onClick={() => setFilter('proximas')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              filter === 'proximas'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-700 border border-slate-200/60 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Próximas ({upcomingTasks.length})</span>
          </button>

          <button
            id="btn-nueva-tarea-vencimientos"
            onClick={() => openCreateModal()}
            className="ml-auto inline-flex items-center gap-1.5 bg-[#142136] hover:bg-[#1e2f4a] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NUEVA TAREA</span>
          </button>
        </div>
      </div>

      {/* Group 1: Vencidas */}
      {(filter === 'todos' || filter === 'vencidas') && overdueTasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <h3 className="text-xs sm:text-sm font-extrabold text-rose-700 uppercase tracking-wider">
              Vencidas ({overdueTasks.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {overdueTasks.map(task => (
              <TaskCard key={task.id} task={task} variant="hero" />
            ))}
          </div>
        </section>
      )}

      {/* Group 2: Hoy */}
      {(filter === 'todos' || filter === 'hoy') && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <h3 className="text-xs sm:text-sm font-extrabold text-sky-900 uppercase tracking-wider">
              Vence Hoy ({todayTasks.length})
            </h3>
          </div>
          {todayTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {todayTasks.map(task => (
                <TaskCard key={task.id} task={task} variant="hero" />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 text-center">
              No hay tareas adicionales con vencimiento programado para hoy.
            </div>
          )}
        </section>
      )}

      {/* Group 3: Próximas */}
      {(filter === 'todos' || filter === 'proximas') && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
              Próximas Fechas ({upcomingTasks.length})
            </h3>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {upcomingTasks.map(task => (
                <TaskCard key={task.id} task={task} variant="hero" />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 text-center">
              No hay tareas programadas para fechas posteriores.
            </div>
          )}
        </section>
      )}
    </div>
  );
};
