import React, { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  Flame,
  History,
  ShieldAlert,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Priority, TaskStatus } from '../types';
import { formatAuditDateTime, getTodayDateString } from '../utils/dateUtils';

export const TaskModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    editingTask,
    defaultModalStatus,
    defaultModalInFocus,
    addTask,
    updateTask,
    deleteTask,
    currentUser,
    getUserPermissions,
    claimTask,
    releaseTask,
  } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [status, setStatus] = useState<TaskStatus>('PENDIENTE');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('12:00');
  const [blockReason, setBlockReason] = useState('');
  const [inFocus, setInFocus] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const permissions = getUserPermissions(editingTask);
  const isReadOnly = !!editingTask && !permissions.canEditTask;
  const assignee = editingTask?.assignee || '';
  const isAvailable =
    !assignee ||
    ['disponible', 'sin asignar', 'sin responsable'].includes(assignee.trim().toLowerCase());

  useEffect(() => {
    setIsConfirmingDelete(false);
    setShowAuditLogs(false);

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate || getTodayDateString());
      setDueTime(editingTask.dueTime || '');
      setBlockReason(editingTask.blockReason || '');
      setInFocus(!!editingTask.inFocus);
      return;
    }

    setTitle('');
    setDescription('');
    setPriority('NORMAL');
    setStatus(defaultModalStatus);
    setDueDate(getTodayDateString());
    setDueTime('12:00');
    setBlockReason('');
    setInFocus(defaultModalInFocus);
  }, [editingTask?.id, isModalOpen, defaultModalStatus, defaultModalInFocus]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      if (!permissions.canEditTask) return;
      updateTask(
        editingTask.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          dueDate,
          dueTime: dueTime || undefined,
          blockReason:
            status === 'BLOQUEADA'
              ? blockReason.trim() || 'Esperando validación de Dirección'
              : undefined,
          inFocus: permissions.canToggleFocus ? inFocus : editingTask.inFocus,
        },
        true
      );
      return;
    }

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status: 'PENDIENTE',
      dueDate,
      dueTime: dueTime || undefined,
      assignee: '',
      blockReason: undefined,
      inFocus: permissions.canToggleFocus ? inFocus : false,
    });
  };

  const handleQuickResolve = () => {
    if (!editingTask || !permissions.canResolveTask) return;
    const nextStatus: TaskStatus = status === 'RESUELTA' ? 'EN_PROCESO' : 'RESUELTA';
    setStatus(nextStatus);
    updateTask(editingTask.id, { status: nextStatus });
  };

  const handleQuickBlock = () => {
    if (!editingTask || !permissions.canBlockTask) return;
    const nextStatus: TaskStatus = status === 'BLOQUEADA' ? 'EN_PROCESO' : 'BLOQUEADA';
    const reason = blockReason.trim() || 'Esperando validación de Dirección';
    setStatus(nextStatus);
    if (nextStatus === 'BLOQUEADA' && !blockReason.trim()) setBlockReason(reason);
    updateTask(editingTask.id, {
      status: nextStatus,
      blockReason: nextStatus === 'BLOQUEADA' ? reason : undefined,
    });
  };

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={closeModal}
    >
      <div
        id="task-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.14)] border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={event => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/60 to-white">
          <div>
            <h2 id="task-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {editingTask ? 'Detalle de Tarea' : 'Nueva Tarea Operativa'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Clínica Chutro • Dirección</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editingTask && permissions.restrictionReason && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/70 flex items-center gap-2 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{permissions.restrictionReason}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Título de la tarea <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-task-title"
              type="text"
              required
              disabled={isReadOnly}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ej: Validar presupuesto de insumos médicos"
              className={`w-full px-3.5 py-2.5 border rounded-xl font-semibold text-sm sm:text-base transition-all ${
                isReadOnly
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50/70 border-slate-200/90 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300'
              }`}
              autoFocus={!isReadOnly}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="input-task-description"
              rows={2}
              disabled={isReadOnly}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Detalles relevantes..."
              className={`w-full px-3.5 py-2 border rounded-xl text-xs sm:text-sm resize-none ${
                isReadOnly
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prioridad</label>
              <select
                id="select-task-priority"
                disabled={isReadOnly}
                value={priority}
                onChange={event => setPriority(event.target.value as Priority)}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-semibold bg-slate-50/70 border-slate-200/90 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estado</label>
              {editingTask ? (
                <select
                  id="select-task-status"
                  disabled={isReadOnly && !permissions.canBlockTask}
                  value={status}
                  onChange={event => setStatus(event.target.value as TaskStatus)}
                  className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-semibold bg-slate-50/70 border-slate-200/90 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {permissions.canEditTask && <option value="PENDIENTE">Pendiente</option>}
                  {permissions.canEditTask && <option value="EN_PROCESO">En proceso</option>}
                  {permissions.canBlockTask && <option value="BLOQUEADA">Bloqueada</option>}
                  <option value="RESUELTA" disabled={!permissions.canResolveTask}>
                    ✓ Listo
                  </option>
                </select>
              ) : (
                <div className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 border-slate-200 text-slate-600">
                  Pendiente
                </div>
              )}
            </div>
          </div>

          {status === 'BLOQUEADA' && editingTask && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-rose-800 uppercase tracking-wide">
                Motivo del bloqueo
              </label>
              <input
                id="input-task-block-reason"
                type="text"
                disabled={!permissions.canBlockTask}
                value={blockReason}
                onChange={event => setBlockReason(event.target.value)}
                placeholder="Ej: Falta firma directiva..."
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs sm:text-sm text-rose-900 disabled:bg-slate-100"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha</label>
              <input
                id="input-task-due-date"
                type="date"
                disabled={isReadOnly}
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm bg-slate-50/70 border-slate-200/90 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hora límite <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id="input-task-due-time"
                type="time"
                disabled={isReadOnly}
                value={dueTime}
                onChange={event => setDueTime(event.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm bg-slate-50/70 border-slate-200/90 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">A cargo de</label>
            {!editingTask ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-800">
                Disponible — cualquier integrante puede usar “Me hago cargo”.
              </div>
            ) : isAvailable ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-emerald-800">Disponible</span>
                {permissions.canClaimTask && (
                  <button
                    id="btn-modal-me-hago-cargo"
                    type="button"
                    onClick={() => claimTask(editingTask.id, currentUser)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#142136] hover:bg-emerald-600 text-white transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Me hago cargo
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-black text-slate-900">{assignee}</span>
                {permissions.canReleaseTask && (
                  <button
                    id="btn-modal-release-task"
                    type="button"
                    onClick={() => releaseTask(editingTask.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl border border-slate-200/80 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                    Liberar
                  </button>
                )}
              </div>
            )}
          </div>

          {permissions.canToggleFocus && (
            <label
              htmlFor="checkbox-task-focus"
              className="flex items-center gap-2.5 p-2.5 rounded-xl border select-none bg-slate-50/60 border-slate-200/60 hover:bg-slate-50 cursor-pointer"
            >
              <input
                id="checkbox-task-focus"
                type="checkbox"
                checked={inFocus}
                onChange={event => setInFocus(event.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Flame className={`w-4 h-4 ${inFocus ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                Prioridad en Foco de hoy
              </div>
            </label>
          )}

          {editingTask && (permissions.canResolveTask || permissions.canBlockTask) && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {permissions.canResolveTask && (
                <button
                  id="btn-modal-quick-resolve"
                  type="button"
                  onClick={handleQuickResolve}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {status === 'RESUELTA' ? 'Desmarcar ✓ Listo' : '✓ Listo'}
                </button>
              )}
              {permissions.canBlockTask && status !== 'RESUELTA' && (
                <button
                  id="btn-modal-quick-block"
                  type="button"
                  onClick={handleQuickBlock}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-rose-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  {status === 'BLOQUEADA' ? 'Desbloquear' : 'Informar Bloqueo'}
                </button>
              )}
            </div>
          )}

          {editingTask && (
            <div className="pt-3 border-t border-slate-100">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <span>Trazabilidad</span>
                  {!!editingTask.auditLog?.length && (
                    <button
                      type="button"
                      onClick={() => setShowAuditLogs(value => !value)}
                      className="text-blue-700 hover:underline cursor-pointer lowercase flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      {showAuditLogs ? 'ocultar historial' : `ver historial (${editingTask.auditLog.length})`}
                    </button>
                  )}
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-400">Creado por:</span>{' '}
                  <strong className="text-slate-800">{editingTask.createdBy}</strong>{' '}
                  <span className="text-slate-400">· {formatAuditDateTime(editingTask.createdAt)}</span>
                </div>
                {showAuditLogs && !!editingTask.auditLog?.length && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5 max-h-36 overflow-y-auto">
                    {editingTask.auditLog.map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex items-start gap-1.5 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-bold text-slate-700">{log.byUserName}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">[{log.action}]</span>
                        <span className="text-slate-500">{log.details}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {editingTask && permissions.canDeleteTask ? (
              !isConfirmingDelete ? (
                <button
                  id="btn-modal-delete"
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-medium text-rose-900 px-1">¿Eliminar?</span>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirm-delete-execute"
                    type="button"
                    onClick={() => deleteTask(editingTask.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                id="btn-modal-cancel"
                type="button"
                onClick={closeModal}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {isReadOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {(!editingTask || permissions.canEditTask) && (
                <button
                  id="btn-modal-save"
                  type="submit"
                  className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-[#142136] hover:bg-[#1e2f4a] cursor-pointer"
                >
                  {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
