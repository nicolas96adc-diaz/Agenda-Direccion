import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, RotateCcw, ChevronDown, Loader2 } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { TaskPermissions } from '../utils/permissions';
import { formatHumanDeadline } from '../utils/dateUtils';

interface PizarraTaskCardProps {
  task: Task;
  permissions: TaskPermissions;
  onOpenModal: (task: Task) => void;
  onClaim?: (task: Task) => void;
  onRelease?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  isProcessing?: boolean;
}

export const PizarraTaskCard: React.FC<PizarraTaskCardProps> = ({
  task,
  permissions,
  onOpenModal,
  onClaim,
  onRelease,
  onStatusChange,
  isProcessing = false,
}) => {
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const isBusy = isProcessing || isLocalProcessing;

  useEffect(() => {
    if (!isProcessing) setIsLocalProcessing(false);
  }, [isProcessing, task.status, task.assignee]);

  const isUnassigned = !task.assignee || ['disponible', 'sin asignar', 'sin responsable'].includes(task.assignee.trim().toLowerCase());
  const isResolved = task.status === 'RESUELTA';
  const isInProgress = task.status === 'EN_PROCESO';
  const isBlocked = task.status === 'BLOQUEADA';
  const isPending = task.status === 'PENDIENTE';
  const canChangeStatus = permissions.canEditTask || permissions.canBlockTask || permissions.canResolveTask;

  const handleClaim = () => {
    if (!isBusy && permissions.canClaimTask && onClaim) {
      setIsLocalProcessing(true);
      onClaim(task);
    }
  };
  const handleRelease = () => {
    if (!isBusy && permissions.canReleaseTask && onRelease) {
      setIsLocalProcessing(true);
      onRelease(task);
    }
  };
  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!isBusy && onStatusChange) {
      setIsLocalProcessing(true);
      onStatusChange(task, newStatus);
    }
  };

  const statusLabel = isResolved ? 'Resuelta' : isBlocked ? 'Bloqueada' : isInProgress ? 'En proceso' : 'Pendiente';

  return (
    <div
      id={`pizarra-card-${task.id}`}
      onClick={() => { if (!isBusy) onOpenModal(task); }}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-4.5 select-none ${
        isBusy ? 'border-slate-200 shadow-xs pointer-events-none' : isResolved ? 'cursor-pointer border-slate-200/70 bg-slate-50/50 opacity-80 hover:opacity-100 hover:border-slate-300' : isInProgress ? 'cursor-pointer border-sky-200/90 hover:border-sky-300 shadow-[0_2px_12px_rgba(14,165,233,0.06)] hover:shadow-md' : 'cursor-pointer border-slate-200/90 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md'
      }`}
    >
      {isBusy ? (
        <div className="space-y-3 py-0.5 animate-pulse" aria-label="Actualizando estado de la tarea">
          <div className="flex items-center justify-between gap-2"><div className="h-5 w-24 bg-slate-200 rounded-full" /><div className="h-4 w-20 bg-slate-100 rounded-md" /></div>
          <div className="space-y-2 my-2"><div className="h-4.5 w-4/5 bg-slate-200 rounded-md" /><div className="h-3 w-1/2 bg-slate-100 rounded-md" /></div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs"><div className="h-5 w-28 bg-slate-200/80 rounded-lg" /><div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /><span>Actualizando...</span></div></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            {isUnassigned ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span>Disponible</span></span>
            ) : canChangeStatus ? (
              <div className="relative inline-flex items-center" onClick={e => e.stopPropagation()}>
                <select id={`select-card-status-${task.id}`} value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)} aria-label={`Estado de ${task.title}`} className={`min-h-10 appearance-none text-xs font-bold px-3 pr-6 rounded-xl border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 ${isPending ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80' : isInProgress ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' : isResolved ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`} title="Cambiar estado de la tarea">
                  {permissions.canEditTask && <option value="PENDIENTE">Pendiente</option>}
                  {permissions.canEditTask && <option value="EN_PROCESO">En proceso</option>}
                  {permissions.canBlockTask && <option value="BLOQUEADA">Bloqueada</option>}
                  {permissions.canResolveTask && <option value="RESUELTA">Resuelta</option>}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{statusLabel}</span>
            )}
            {task.dueDate && <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500"><Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{formatHumanDeadline(task.dueDate, task.dueTime).text}</span></div>}
          </div>
          <div className="mb-2.5"><h4 className={`font-bold text-sm sm:text-base leading-snug break-words transition-colors ${isResolved ? 'line-through text-slate-400 font-medium' : 'text-slate-900 group-hover:text-blue-950'}`}>{task.title}</h4>{task.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">{task.description}</p>}</div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">{isUnassigned ? <span className="text-[11px] text-slate-400">Sin asignar</span> : <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[180px]" title={`A cargo de: ${task.assignee}`}><strong className="font-semibold text-slate-800">{task.assignee}</strong></span>}</div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              {isUnassigned && permissions.canClaimTask && onClaim && <button type="button" id={`btn-me-hago-cargo-${task.id}`} onClick={e => { e.stopPropagation(); handleClaim(); }} className="inline-flex min-h-10 items-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-[#142136] hover:bg-emerald-600 text-white transition-all shadow-2xs active:scale-[0.98] cursor-pointer" title="Hacerme cargo de esta tarea"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Me hago cargo</span></button>}
              {!isUnassigned && isResolved && permissions.canResolveTask && onStatusChange && <button type="button" id={`btn-reabrir-${task.id}`} onClick={e => { e.stopPropagation(); handleStatusChange('EN_PROCESO'); }} className="inline-flex min-h-10 items-center gap-1 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 transition-colors cursor-pointer" title="Reabrir tarea"><RotateCcw className="w-3 h-3 text-slate-400" /><span>Reabrir</span></button>}
              {!isUnassigned && !isResolved && permissions.canReleaseTask && onRelease && <button type="button" id={`btn-liberar-${task.id}`} onClick={e => { e.stopPropagation(); handleRelease(); }} className="min-h-10 text-xs text-slate-500 hover:text-rose-600 hover:underline px-2 transition-colors cursor-pointer" title="Liberar tarea (vuelve a quedar disponible para el equipo)">Liberar</button>}
              {!isUnassigned && !isResolved && permissions.canResolveTask && onStatusChange && <button type="button" id={`btn-resolver-${task.id}`} onClick={e => { e.stopPropagation(); handleStatusChange('RESUELTA'); }} className="inline-flex min-h-10 items-center gap-1 px-2.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer" title="Marcar como resuelta"><CheckCircle2 className="w-3.5 h-3.5" /><span>Resolver</span></button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
