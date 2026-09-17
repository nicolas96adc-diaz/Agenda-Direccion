import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle2, Ban, Flame, ShieldAlert, History, Clock, Undo2, Users } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Priority, TaskStatus } from '../types';
import { getTodayDateString, formatAuditDateTime } from '../utils/dateUtils';

export const TaskModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    editingTask,
    defaultModalStatus,
    addTask,
    updateTask,
    deleteTask,
    users,
    currentUser,
    getUserPermissions,
    claimTask,
    releaseTask,
  } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [status, setStatus] = useState<TaskStatus>(defaultModalStatus);
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('12:00');
  const [assignee, setAssignee] = useState<string>('');
  const [blockReason, setBlockReason] = useState('');
  const [inFocus, setInFocus] = useState(true);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Compute permissions for active user on this task
  const perms = getUserPermissions(editingTask);

  useEffect(() => {
    setIsConfirmingDelete(false);
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate || getTodayDateString());
      setDueTime(editingTask.dueTime || '');
      setAssignee(editingTask.assignee || '');
      setBlockReason(editingTask.blockReason || '');
      setInFocus(!!editingTask.inFocus);
      setShowAuditLogs(false);
    } else {
      setTitle('');
      setDescription('');
      setPriority('NORMAL');
      setStatus(defaultModalStatus);
      setDueDate(getTodayDateString());
      setDueTime('12:00');
      setAssignee(''); // Initially no responsible -> Disponible
      setBlockReason('');
      setInFocus(defaultModalStatus !== 'RESUELTA');
      setShowAuditLogs(false);
    }
  }, [editingTask, defaultModalStatus, isModalOpen, currentUser]);

  if (!isModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask(
        editingTask.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          dueDate,
          dueTime: dueTime || undefined,
          assignee: assignee || '',
          blockReason: status === 'BLOQUEADA' ? (blockReason.trim() || 'Esperando validación de Dirección') : undefined,
          inFocus,
        },
        true
      );
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate,
        dueTime: dueTime || undefined,
        assignee: '', // Initially no responsible -> Disponible
        blockReason: status === 'BLOQUEADA' ? (blockReason.trim() || 'Esperando validación de Dirección') : undefined,
        inFocus,
      });
    }
  };

  const handleQuickResolve = () => {
    const newStatus: TaskStatus = status === 'RESUELTA' ? 'EN_PROCESO' : 'RESUELTA';
    setStatus(newStatus);
    if (editingTask) {
      updateTask(editingTask.id, { status: newStatus }, false);
    }
  };

  const handleQuickBlock = () => {
    const newStatus: TaskStatus = status === 'BLOQUEADA' ? 'EN_PROCESO' : 'BLOQUEADA';
    setStatus(newStatus);
    const defaultReason = 'Esperando validación de Dirección';
    const newReason = newStatus === 'BLOQUEADA' ? (blockReason.trim() || defaultReason) : undefined;
    if (newStatus === 'BLOQUEADA' && !blockReason.trim()) {
      setBlockReason(defaultReason);
    }
    if (editingTask) {
      updateTask(
        editingTask.id,
        {
          status: newStatus,
          blockReason: newReason,
        },
        false
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!editingTask) return;
    deleteTask(editingTask.id);
  };

  const isFieldsDisabled = !!editingTask && !perms.canEditTask;

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeModal}
    >
      <div
        id="task-modal-container"
        className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.14)] border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/60 to-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {editingTask ? 'Detalle de Tarea' : 'Nueva Tarea Operativa'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Clínica Chutro • Dirección
            </p>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only or Permission notice banner if restricted */}
        {editingTask && perms.restrictionReason && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/70 flex items-center gap-2 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{perms.restrictionReason}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Título de la tarea <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-task-title"
              required
              disabled={isFieldsDisabled}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Validar presupuesto de insumos médicos"
              className={`w-full px-3.5 py-2.5 border rounded-xl font-semibold text-sm sm:text-base transition-all placeholder:text-slate-400 ${
                isFieldsDisabled
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50/70 border-slate-200/90 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400'
              }`}
              autoFocus={!isFieldsDisabled}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción operativa{' '}
              <span className="text-slate-400 font-normal">
                {isFieldsDisabled && perms.canAddCommentOrNote ? '(Podés agregar notas)' : '(opcional)'}
              </span>
            </label>
            <textarea
              id="input-task-description"
              rows={2}
              disabled={isFieldsDisabled && !perms.canAddCommentOrNote}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles relevantes, números de expediente o requerimientos de Dirección..."
              className={`w-full px-3.5 py-2 border rounded-xl text-xs sm:text-sm transition-all placeholder:text-slate-400 resize-none ${
                isFieldsDisabled && !perms.canAddCommentOrNote
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400'
              }`}
            />
          </div>

          {/* Row: Prioridad & Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prioridad
              </label>
              <select
                id="select-task-priority"
                disabled={isFieldsDisabled}
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isFieldsDisabled
                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer'
                }`}
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Estado
              </label>
              <select
                id="select-task-status"
                disabled={isFieldsDisabled && !perms.canBlockTask}
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isFieldsDisabled && !perms.canBlockTask
                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer'
                }`}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="BLOQUEADA">Bloqueada</option>
                <option value="RESUELTA" disabled={!perms.canResolveTask}>
                  Resuelta {!perms.canResolveTask ? '(Requiere autorización)' : ''}
                </option>
              </select>
            </div>
          </div>

          {/* If Blocked: Motivo de bloqueo */}
          {status === 'BLOQUEADA' && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-rose-800 uppercase tracking-wide">
                Motivo del bloqueo
              </label>
              <input
                type="text"
                id="input-task-block-reason"
                disabled={isFieldsDisabled && !perms.canBlockTask}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Ej: Esperando validación médica, Falta firma directiva..."
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs sm:text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
              />
            </div>
          )}

          {/* Row: Fecha & Hora de vencimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                id="input-task-due-date"
                disabled={isFieldsDisabled}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm transition-all ${
                  isFieldsDisabled
                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hora límite <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="time"
                id="input-task-due-time"
                disabled={isFieldsDisabled}
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm transition-all ${
                  isFieldsDisabled
                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50/70 border-slate-200/90 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer'
                }`}
              />
            </div>
          </div>

          {/* Row: Responsabilidad en Pizarra & Foco */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Responsabilidad en Pizarra
              </label>

              {!editingTask ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Disponible (sin responsable inicial)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    La tarea se publicará en la pizarra sin responsable. Cualquier integrante podrá tomarla haciendo clic en <strong>“Me hago cargo”</strong>.
                  </p>
                </div>
              ) : !assignee || assignee.toLowerCase() === 'disponible' || assignee.toLowerCase() === 'sin asignar' ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Disponible</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pendiente de que un integrante tome la tarea
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-modal-me-hago-cargo"
                    onClick={() => {
                      claimTask(editingTask.id, currentUser);
                      setAssignee(currentUser.name);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#142136] hover:bg-emerald-600 text-white transition-all shadow-2xs active:scale-[0.98] cursor-pointer shrink-0"
                    title={`Hacerme cargo de esta tarea voluntariamente como ${currentUser.name}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Me hago cargo</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Estado operativo:
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      A cargo de: {assignee}
                    </span>
                  </div>

                  <button
                    type="button"
                    id="btn-modal-release-task"
                    onClick={() => {
                      releaseTask(editingTask.id);
                      setAssignee('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl border border-slate-200/80 hover:border-amber-200 transition-colors cursor-pointer shrink-0"
                    title="Dejar de hacerme cargo (la tarea vuelve a quedar disponible para el equipo)"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dejar de hacerme cargo</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="checkbox-task-focus"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border select-none transition-colors bg-slate-50/60 border-slate-200/60 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="checkbox-task-focus"
                  checked={inFocus}
                  onChange={e => setInFocus(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-900 focus:ring-blue-800 border-slate-300 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Flame className={`w-4 h-4 ${inFocus ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                  <span>Prioridad en Foco de hoy</span>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Action Badges if editing */}
          {editingTask && (perms.canResolveTask || perms.canBlockTask) && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {perms.canResolveTask && (
                <button
                  type="button"
                  id="btn-modal-quick-resolve"
                  onClick={handleQuickResolve}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    status === 'RESUELTA'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{status === 'RESUELTA' ? 'Resuelta (Reabrir)' : 'Marcar Resuelta'}</span>
                </button>
              )}

              {perms.canBlockTask && (
                <button
                  type="button"
                  id="btn-modal-quick-block"
                  onClick={handleQuickBlock}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    status === 'BLOQUEADA'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{status === 'BLOQUEADA' ? 'Desbloquear tarea' : 'Informar Bloqueo'}</span>
                </button>
              )}
            </div>
          )}

          {/* Traceability & Audit Section in Modal */}
          {editingTask && (
            <div className="pt-3 border-t border-slate-100">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <span>Trazabilidad y Auditoría</span>
                  {editingTask.auditLog && editingTask.auditLog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAuditLogs(!showAuditLogs)}
                      className="text-blue-700 hover:underline cursor-pointer lowercase flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      <span>{showAuditLogs ? 'ocultar bitácora' : `ver historial (${editingTask.auditLog.length})`}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-600">
                  <div>
                    <span className="text-slate-400">Creado por:</span>{' '}
                    <strong className="text-slate-800">{editingTask.createdBy || 'Rodrigo Bustos'}</strong>
                    <div className="text-[11px] text-slate-400">
                      {formatAuditDateTime(editingTask.createdAt)}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">Última modif.:</span>{' '}
                    <strong className="text-slate-800">{editingTask.lastModifiedBy || editingTask.createdBy || 'Rodrigo Bustos'}</strong>
                    <div className="text-[11px] text-slate-400">
                      {formatAuditDateTime(editingTask.updatedAt)}
                    </div>
                  </div>

                  {editingTask.closedBy && (
                    <div className="sm:col-span-2 text-emerald-700">
                      <span className="text-slate-400">Cerrado por:</span>{' '}
                      <strong>{editingTask.closedBy}</strong> el {formatAuditDateTime(editingTask.resolvedAt)}
                    </div>
                  )}
                </div>

                {/* Expanded Audit Log inside Modal */}
                {showAuditLogs && editingTask.auditLog && editingTask.auditLog.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5 max-h-36 overflow-y-auto">
                    {editingTask.auditLog.map((log, i) => (
                      <div key={i} className="flex items-baseline gap-1.5 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-700">{log.byUserName}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">[{log.action}]</span>
                        <span className="text-slate-400">{formatAuditDateTime(log.timestamp)}</span>
                        {log.details && <span className="text-slate-600 truncate">• {log.details}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {editingTask ? (
              !isConfirmingDelete ? (
                <button
                  type="button"
                  id="btn-modal-delete"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              ) : (
                <div
                  id="delete-confirmation-container"
                  className="inline-flex items-center gap-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-xs font-medium text-rose-900 px-1">¿Eliminar esta tarea?</span>
                  <button
                    type="button"
                    id="btn-confirm-delete-cancel"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white bg-white/80 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-delete-execute"
                    onClick={handleConfirmDelete}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer"
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
                type="button"
                id="btn-modal-cancel"
                onClick={closeModal}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-modal-save"
                className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-[#142136] hover:bg-[#1e2f4a] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
