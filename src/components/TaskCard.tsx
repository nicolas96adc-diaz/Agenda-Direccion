import React from 'react';
import {
  AlertTriangle,
  Clock,
  Ban,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Flame,
  Lock,
} from 'lucide-react';
import { Task } from '../types';
import { useTasks } from '../context/TaskContext';
import { formatResponsibleLabel, getTodayDateString } from '../utils/dateUtils';
import { getTaskVisuals, CardVisualRole } from '../utils/taskUrgency';

interface TaskCardProps {
  task: Task;
  variant?: 'hero' | 'kanban' | 'compact';
  visualRole?: CardVisualRole;
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  variant = 'hero',
  visualRole = 'standard',
  isDragging = false,
}) => {
  const { openEditModal, toggleTaskResolved, toggleFocus, getUserPermissions, claimTask, currentUser } = useTasks();
  const todayStr = getTodayDateString();
  const isHero = variant === 'hero';
  const isResolved = task.status === 'RESUELTA';

  const isUnassigned =
    !task.assignee ||
    task.assignee.trim().toLowerCase() === 'disponible' ||
    task.assignee.trim().toLowerCase() === 'sin asignar' ||
    task.assignee.trim().toLowerCase() === 'sin responsable';

  // Real user permissions for active user on this card
  const perms = getUserPermissions(task);

  // Derive visual rules and semantic styling dynamically
  const visuals = getTaskVisuals(task, todayStr);

  // Icon mapping for status/urgency badge
  const renderBadgeIcon = () => {
    switch (visuals.badgeIconType) {
      case 'ban':
        return <Ban className="w-3 h-3 stroke-[2.5] shrink-0" />;
      case 'alert':
        return <AlertTriangle className="w-3 h-3 stroke-[2.5] shrink-0" />;
      case 'calendar':
        return <Calendar className="w-3 h-3 stroke-[2.5] shrink-0" />;
      case 'check':
        return <CheckCircle2 className="w-3 h-3 stroke-[2.5] shrink-0" />;
      case 'clock':
      default:
        return <Clock className="w-3 h-3 stroke-[2.5] shrink-0" />;
    }
  };

  // Icon mapping for bottom left
  const renderBottomIcon = () => {
    switch (visuals.bottomLeftIcon) {
      case 'ban':
        return <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.2]" />;
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.2]" />;
      case 'check':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.2]" />;
      case 'clock':
      default:
        return (
          <Clock
            className={`w-3.5 h-3.5 shrink-0 stroke-[2] ${
              visuals.colorTheme === 'amber'
                ? 'text-amber-500'
                : visuals.colorTheme === 'red'
                ? 'text-rose-500'
                : 'text-sky-500'
            }`}
          />
        );
    }
  };

  if (isHero) {
    // Dynamic styling based on visual hierarchy role (primary dominant vs secondary vs standard)
    const isPrimary = visualRole === 'primary';
    const isSecondary = visualRole === 'secondary';

    const cardPadding = isPrimary
      ? 'p-4 sm:p-5'
      : isSecondary
      ? 'p-3.5 sm:p-4.5'
      : 'p-3.5 sm:p-4';

    const titleTypography = isPrimary
      ? 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug'
      : isSecondary
      ? 'text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug'
      : 'text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug';

    const minHeightClass = isPrimary
      ? 'min-h-[142px]'
      : isSecondary
      ? 'min-h-[132px]'
      : 'min-h-[122px]';

    return (
      <div
        id={`hero-card-${task.id}`}
                data-priority={task.priority}
        onClick={() => openEditModal(task)}
        className={`group relative bg-white rounded-2xl border border-slate-200/80 ${visuals.leftBarClass} ${cardPadding} ${minHeightClass} shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden select-none ${
          isDragging ? 'opacity-50 ring-2 ring-slate-400 shadow-lg' : ''
        } ${isResolved ? 'opacity-70 grayscale-[20%] bg-slate-50/50' : ''}`}
      >
        {/* Top Row: Single clear status badge + Quick actions */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase border shadow-2xs whitespace-nowrap ${visuals.badgeClass}`}
            >
              {renderBadgeIcon()}
              <span>{visuals.badgeLabel}</span>
            </span>

            {perms.isReadOnly && (
              <span
                title="Solo lectura para tu perfil"
                className="inline-flex items-center text-[10px] text-slate-400 gap-0.5 font-medium"
              >
                <Lock className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Quick Actions on hover */}
          <div
            className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            {perms.canResolveTask && (
              <button
                id={`btn-card-resolve-${task.id}`}
                onClick={() => toggleTaskResolved(task.id)}
                title={isResolved ? 'Reabrir tarea' : 'Marcar como resuelta'}
                className={`min-w-10 min-h-10 p-1.5 rounded-lg hover:bg-slate-100/90 transition-colors ${
                  isResolved ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {perms.canToggleFocus && (
              <button
                id={`btn-card-focus-${task.id}`}
                onClick={() => toggleFocus(task.id)}
                title={task.inFocus ? 'Quitar de Foco' : 'Mover a Foco del Día'}
                className={`min-w-10 min-h-10 p-1.5 rounded-lg hover:bg-slate-100/90 transition-colors ${
                  task.inFocus ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                }`}
              >
                <Flame className={`w-4 h-4 ${task.inFocus ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}

            <button
              id={`btn-card-edit-${task.id}`}
              onClick={() => openEditModal(task)}
              title={perms.isReadOnly ? 'Ver detalles (Solo lectura)' : 'Editar detalles'}
              className="min-w-10 min-h-10 p-1.5 rounded-lg hover:bg-slate-100/90 transition-colors text-slate-400 hover:text-slate-700"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: High-contrast title with readable wrapping */}
        <div className="my-1 flex-1">
          <h3
            className={`${titleTypography} group-hover:text-blue-950 transition-colors break-words line-clamp-2 ${
              isResolved ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-1 leading-relaxed font-normal break-words">
              {task.description}
            </p>
          )}
        </div>

        {/* Bottom Row: Localized Human Deadline / Reason + Readable Assignee Tag */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2.5">
          {/* Left: icon + localized readable text */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {renderBottomIcon()}
            <span className={`text-xs font-semibold truncate leading-none ${visuals.bottomLeftClass}`}>
              {visuals.bottomLeftText}
            </span>
          </div>

          {/* Right: Readable responsible pill or Me hago cargo */}
          {isUnassigned && !isResolved ? (
            <button
              type="button"
              id={`btn-hero-claim-${task.id}`}
              onClick={e => {
                e.stopPropagation();
                claimTask(task.id, currentUser);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#142136] hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-2xs shrink-0"
              title={`Hacerme cargo como ${currentUser.name}`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Me hago cargo</span>
            </button>
          ) : (
            <div
              className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100/80 text-slate-600 border border-slate-200/70 whitespace-nowrap shadow-2xs"
              title={`Responsable: ${task.assignee}`}
            >
              {formatResponsibleLabel(task.assignee)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Kanban / Standard view card (used in Pizarra, Bloqueos, Vencimientos, Historial)
  return (
    <div
      id={`task-card-${task.id}`}
      onClick={() => openEditModal(task)}
      className={`group relative bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden p-3.5 sm:p-4 min-h-[128px] select-none ${
        visuals.leftBarClass
      } ${isDragging ? 'opacity-50 ring-2 ring-slate-400 shadow-lg' : ''} ${
        isResolved ? 'opacity-70 bg-slate-50/60' : ''
      }`}
    >
      {/* Top Row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border shadow-2xs ${visuals.badgeClass}`}
          >
            {renderBadgeIcon()}
            <span>{visuals.badgeLabel}</span>
          </span>

          {perms.isReadOnly && (
            <span
              title="Solo lectura para tu perfil"
              className="inline-flex items-center text-[10px] text-slate-400 gap-0.5 font-medium"
            >
              <Lock className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div
          className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {perms.canResolveTask && (
            <button
              onClick={() => toggleTaskResolved(task.id)}
              title={isResolved ? 'Reabrir tarea' : 'Marcar como resuelta'}
                className={`min-w-10 min-h-10 p-1 rounded-lg hover:bg-slate-100 ${
                isResolved ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}

          {perms.canToggleFocus && (
            <button
              onClick={() => toggleFocus(task.id)}
              title={task.inFocus ? 'Quitar de Foco' : 'Mover a Foco del Día'}
                className={`min-w-10 min-h-10 p-1 rounded-lg hover:bg-slate-100 ${
                task.inFocus ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => openEditModal(task)}
            title={perms.isReadOnly ? 'Ver detalles' : 'Editar tarea'}
            className="min-w-10 min-h-10 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Title & Description */}
      <div className="my-1 flex-1">
        <h4
          className={`font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition-colors text-sm sm:text-base break-words line-clamp-2 ${
            isResolved ? 'line-through text-slate-400' : ''
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal break-words">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom Row */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {renderBottomIcon()}
          <span className={`truncate text-xs font-semibold ${visuals.bottomLeftClass}`}>
            {visuals.bottomLeftText}
          </span>
        </div>

        {/* Right: Responsible pill or Me hago cargo */}
        {isUnassigned && !isResolved ? (
          <button
            type="button"
            id={`btn-standard-claim-${task.id}`}
            onClick={e => {
              e.stopPropagation();
              claimTask(task.id, currentUser);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#142136] hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-2xs shrink-0"
            title={`Hacerme cargo como ${currentUser.name}`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Me hago cargo</span>
          </button>
        ) : (
          <div
            className="shrink-0 px-2.5 py-0.5 rounded-full bg-slate-100/80 text-slate-600 font-medium text-[11px] border border-slate-200/70 whitespace-nowrap shadow-2xs"
            title={`Responsable: ${task.assignee}`}
          >
            {formatResponsibleLabel(task.assignee)}
          </div>
        )}
      </div>
    </div>
  );
};
