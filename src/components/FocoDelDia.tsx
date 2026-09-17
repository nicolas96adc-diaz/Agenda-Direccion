import React from 'react';
import {
  Ban,
  Calendar,
  BarChart2,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskCard } from './TaskCard';
import { getTodayDateString } from '../utils/dateUtils';
import { calculateTaskUrgencyScore, calculateCardColumnSpans } from '../utils/taskUrgency';

export const FocoDelDia: React.FC = () => {
  const {
    focusTasks,
    blockedTasks,
    todayTasks,
    stats,
    setActiveView,
    openEditModal,
    openCreateModal,
  } = useTasks();

  const todayStr = getTodayDateString();

  const sortedFocusTasks = [...focusTasks].sort((a, b) => {
    const scoreA = calculateTaskUrgencyScore(a, todayStr);
    const scoreB = calculateTaskUrgencyScore(b, todayStr);
    return scoreB - scoreA;
  });

  const { spans, roles } = calculateCardColumnSpans(sortedFocusTasks);
  const actionRequiredCount = sortedFocusTasks.filter(t => t.status !== 'RESUELTA').length;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
            Tareas prioritarias
          </h2>
          <span className="text-xs font-semibold text-slate-400">({sortedFocusTasks.length})</span>
        </div>

        {actionRequiredCount > 0 ? (
          <div
            id="action-required-counter"
            className="inline-flex items-center gap-2 bg-rose-50/90 border border-rose-200/80 px-3 py-1 rounded-full text-xs font-bold text-rose-700 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span>
              {actionRequiredCount} {actionRequiredCount === 1 ? 'requiere acción' : 'requieren acción'}
            </span>
          </div>
        ) : (
          <div
            id="action-required-counter"
            className="inline-flex items-center gap-2 bg-emerald-50/90 border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Prioridades al día</span>
          </div>
        )}
      </div>

      {sortedFocusTasks.length > 0 ? (
        <div
          id="foco-cards-board"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4"
        >
          {sortedFocusTasks.map(task => {
            const spanClass = spans[task.id] || 'col-span-1 md:col-span-1 lg:col-span-4';
            const role = roles[task.id] || 'standard';
            return (
              <div key={task.id} className={spanClass}>
                <TaskCard task={task} variant="hero" visualRole={role} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 sm:p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No hay tareas prioritarias para hoy</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
            Podés marcar cualquier tarea como Foco desde la Pizarra o crear una nueva tarea prioritaria.
          </p>
          <button
            onClick={() => openCreateModal('PENDIENTE', true)}
            className="inline-flex items-center gap-2 bg-[#142136] hover:bg-[#1e2f4a] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear tarea prioritaria</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        <section
          id="panel-bloqueos"
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
          aria-label="Panel de Bloqueos"
        >
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 min-h-[42px]">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                  <Ban className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="truncate">Bloqueos</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                  {blockedTasks.length}
                </span>
              </div>
              <button
                id="link-ver-todos-bloqueos"
                onClick={() => setActiveView('bloqueos')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0 px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {blockedTasks.length > 0 ? (
                blockedTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    id={`blocked-item-${task.id}`}
                    onClick={() => openEditModal(task)}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50/90 cursor-pointer transition-colors group border border-transparent hover:border-slate-100"
                    title={`Ver bloqueo: ${task.title}`}
                  >
                    <Ban className="w-4 h-4 text-rose-500 shrink-0 stroke-[2.2] mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-950 leading-snug break-words">
                        {task.title}
                      </p>
                      {task.blockReason && (
                        <p className="text-[11px] font-medium text-rose-600 mt-0.5 leading-tight break-words">
                          Motivo: {task.blockReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 px-3 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-500">Sin tareas bloqueadas actualmente</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="panel-vence-hoy"
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
          aria-label="Panel de Vence Hoy"
        >
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 min-h-[42px]">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
                  <Calendar className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="truncate">Vence hoy</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                  {todayTasks.length}
                </span>
              </div>
              <button
                id="link-ver-todos-vencimientos"
                onClick={() => setActiveView('vencimientos')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0 px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {todayTasks.length > 0 ? (
                todayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    id={`today-due-item-${task.id}`}
                    onClick={() => openEditModal(task)}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50/90 cursor-pointer transition-colors group border border-transparent hover:border-slate-100"
                    title={`Ver vencimiento: ${task.title}`}
                  >
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 stroke-[2] mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-950 leading-snug break-words">
                        {task.title}
                      </p>
                      {task.dueTime && (
                        <p className="text-[11px] font-bold text-amber-700 mt-0.5 leading-tight">
                          Plazo: {task.dueTime} hs
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 px-3 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
                  <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-500">Sin vencimientos programados para hoy</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="panel-estado-del-dia"
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
          aria-label="Panel de Estado del Día"
        >
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base pb-3 border-b border-slate-100 min-h-[42px]">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 shrink-0">
                <BarChart2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span>Estado del día</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:bg-slate-100/60 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{stats.foco}</span>
                <span className="text-[11px] font-bold text-slate-500 mt-1.5 uppercase tracking-wide">En foco</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50/70 border border-rose-100 hover:bg-rose-50 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight leading-none">{stats.bloqueadas}</span>
                <span className="text-[11px] font-bold text-rose-700/80 mt-1.5 uppercase tracking-wide">Bloqueadas</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-sky-50/70 border border-sky-100 hover:bg-sky-50 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-sky-700 tracking-tight leading-none">{stats.enCurso}</span>
                <span className="text-[11px] font-bold text-sky-700/80 mt-1.5 uppercase tracking-wide">En curso</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight leading-none">{stats.resueltas}</span>
                <span className="text-[11px] font-bold text-emerald-700/80 mt-1.5 uppercase tracking-wide">Resueltas</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
