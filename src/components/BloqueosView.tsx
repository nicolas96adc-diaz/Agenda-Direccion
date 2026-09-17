import React from 'react';
import { Ban, Plus, CheckCircle2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskCard } from './TaskCard';

export const BloqueosView: React.FC = () => {
  const { blockedTasks, openCreateModal, toggleTaskBlocked, getUserPermissions } = useTasks();

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto pb-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50/80 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Impedimentos y Bloqueos
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                {blockedTasks.length} {blockedTasks.length === 1 ? 'bloqueo' : 'bloqueos'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed font-medium">
              Tareas detenidas por dependencias externas, firmas médicas pendientes, insumos o autorizaciones de Dirección.
            </p>
          </div>
        </div>

        <button
          id="btn-nuevo-bloqueo"
          onClick={() => openCreateModal('BLOQUEADA')}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>REPORTAR BLOQUEO</span>
        </button>
      </div>

      {/* Grid of Blocked Tasks */}
      {blockedTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {blockedTasks.map(task => {
            const perms = getUserPermissions(task);
            return (
              <div key={task.id} className="relative flex flex-col justify-between group">
                <TaskCard task={task} variant="hero" />

                {/* Action bar on card */}
                <div className="mt-2 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs gap-2">
                  <span className="text-slate-600 font-medium text-xs break-words flex-1 min-w-0">
                    {task.blockReason || 'Esperando validación médica'}
                  </span>
                  {perms.canBlockTask ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleTaskBlocked(task.id);
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Desbloquear</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Solo responsable
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3 text-emerald-500 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No hay tareas bloqueadas actualmente
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            La operación clínica y administrativa avanza sin impedimentos registrados en Dirección.
          </p>
        </div>
      )}
    </div>
  );
};
