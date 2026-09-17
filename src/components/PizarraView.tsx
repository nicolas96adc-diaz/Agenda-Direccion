import React, { useState, useEffect } from 'react';
import {
  Clock,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Flame,
  RotateCcw,
  Users,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pin,
  Sparkles,
  Undo2,
  Layers,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Task, UserProfile, TaskStatus, PersonNote } from '../types';
import { findUserByNameOrAlias } from '../data/users';
import { getTodayDateString, formatHumanDeadline, formatResponsibleLabel } from '../utils/dateUtils';
import { calculateTaskUrgencyScore, getTaskVisuals } from '../utils/taskUrgency';
import { PizarraTaskCard } from './PizarraTaskCard';

export const PizarraView: React.FC = () => {
  const {
    tasks,
    users,
    currentUser,
    notes,
    addNote,
    deleteNote,
    openCreateModal,
    openEditModal,
    toggleTaskResolved,
    toggleTaskBlocked,
    getUserPermissions,
    addTask,
    claimTask,
    releaseTask,
    moveTaskStatus,
  } = useTasks();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [showResolvedByUser, setShowResolvedByUser] = useState<Record<string, boolean>>({});
  const [quickNoteInputs, setQuickNoteInputs] = useState<Record<string, string>>({});
  const [sharedWhiteboardTaskTitle, setSharedWhiteboardTaskTitle] = useState('');
  const [processingTaskIds, setProcessingTaskIds] = useState<Record<string, boolean>>({});

  const handleClaimWithFeedback = (task: Task) => {
    setProcessingTaskIds(prev => ({ ...prev, [task.id]: true }));
    setTimeout(() => {
      claimTask(task.id, currentUser);
      setTimeout(() => {
        setProcessingTaskIds(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 150);
    }, 320);
  };

  const handleReleaseWithFeedback = (task: Task) => {
    setProcessingTaskIds(prev => ({ ...prev, [task.id]: true }));
    setTimeout(() => {
      releaseTask(task.id);
      setTimeout(() => {
        setProcessingTaskIds(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 150);
    }, 320);
  };

  const handleStatusChangeWithFeedback = (task: Task, newStatus: TaskStatus) => {
    setProcessingTaskIds(prev => ({ ...prev, [task.id]: true }));
    setTimeout(() => {
      moveTaskStatus(task.id, newStatus);
      setTimeout(() => {
        setProcessingTaskIds(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 150);
    }, 320);
  };

  const todayStr = getTodayDateString();

  // 1. Filter Available Tasks (tasks with no responsible person)
  const availableTasks = tasks.filter(t => {
    if (t.status === 'RESUELTA') return false;
    const a = (t.assignee || '').trim().toLowerCase();
    return !a || a === 'disponible' || a === 'sin asignar' || a === 'sin responsable';
  });

  const matchingAvailableTasks = availableTasks.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.blockReason && t.blockReason.toLowerCase().includes(term))
    );
  });

  // 2. Helper to match tasks taken by a specific team member
  const getTasksForUser = (user: UserProfile) => {
    return tasks.filter(t => {
      const a = (t.assignee || '').trim().toLowerCase();
      if (!a || a === 'disponible' || a === 'sin asignar' || a === 'sin responsable') {
        return false;
      }
      if (t.assigneeId && t.assigneeId === user.id) return true;
      const matched = findUserByNameOrAlias(t.assignee, users);
      if (matched && matched.id === user.id) return true;
      if (t.assignee && t.assignee.toLowerCase().includes(user.shortName.toLowerCase())) return true;
      if (t.assignee && user.name.toLowerCase().includes(t.assignee.toLowerCase())) return true;
      return false;
    });
  };

  // Filter users by selected filter
  const visibleUsers = users.filter(u => {
    if (selectedUserFilter === 'all') return true;
    return u.id === selectedUserFilter;
  });

  // Toggle resolved task visibility per person
  const toggleResolvedForUser = (userId: string) => {
    setShowResolvedByUser(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Add follow-up note
  const handleAddNote = (userId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = quickNoteInputs[userId]?.trim();
    if (!text) return;

    const colors: ('yellow' | 'blue' | 'slate')[] = ['yellow', 'blue', 'slate'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNote: PersonNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      createdAt: new Date().toISOString(),
      color: randomColor,
    };

    addNote(userId, newNote);
    setQuickNoteInputs(prev => ({ ...prev, [userId]: '' }));
  };

  // Delete note
  const handleDeleteNote = (userId: string, noteId: string) => {
    deleteNote(userId, noteId);
  };

  // Create a new task in the shared whiteboard (initially no responsible person -> Disponible)
  const handleCreateSharedTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = sharedWhiteboardTaskTitle.trim();
    if (!title) return;

    addTask({
      title,
      priority: 'NORMAL',
      status: 'PENDIENTE',
      dueDate: todayStr,
      dueTime: '18:00',
      assignee: '', // Initially no responsible
      inFocus: true,
    });

    setSharedWhiteboardTaskTitle('');
  };

  // Format note timestamp
  const formatNoteTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month} · ${hours}:${mins} hs`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1540px] mx-auto pb-12">
      {/* Top Header Card - Clean & Executive */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Pizarra Operativa
              </h2>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                {users.length} integrantes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-2xl leading-relaxed">
              Compromisos y tareas disponibles por integrante de Dirección.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-pizarra-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar en tareas o notas..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
            />
          </div>

          {/* User selector filter */}
          <select
            id="select-pizarra-user-filter"
            value={selectedUserFilter}
            onChange={e => setSelectedUserFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          >
            <option value="all">Ver todos los integrantes</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* New Task Button */}
          <button
            id="btn-pizarra-nueva-tarea"
            onClick={() => openCreateModal('PENDIENTE')}
            className="inline-flex items-center gap-2 bg-[#142136] hover:bg-[#1e2f4a] text-white px-4 py-2 rounded-2xl text-xs font-bold tracking-wide transition-all shadow-sm active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>NUEVA TAREA</span>
          </button>
        </div>
      </div>

      {/* SECTION: PIZARRA COMPARTIDA · TAREAS DISPONIBLES */}
      <div
        id="section-tareas-disponibles"
        className="bg-gradient-to-br from-slate-900 via-[#142136] to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.15)] border border-slate-800"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Tareas Disponibles
                </h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-xs uppercase tracking-wider">
                  {matchingAvailableTasks.length} {matchingAvailableTasks.length === 1 ? 'disponible' : 'disponibles'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium max-w-2xl leading-relaxed">
                Tareas pendientes para que cualquier integrante tome.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Sesión activa:
            </span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
        </div>

        {/* Clear slot to post a new task to the shared whiteboard */}
        <form
          onSubmit={handleCreateSharedTask}
          className="mt-5 p-3 sm:p-3.5 rounded-2xl border-2 border-dashed border-white/20 hover:border-emerald-400/50 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2.5"
        >
          <Plus className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
          <input
            type="text"
            id="input-shared-whiteboard-task"
            value={sharedWhiteboardTaskTitle}
            onChange={e => setSharedWhiteboardTaskTitle(e.target.value)}
            placeholder="+ Escribir nueva tarea disponible para el equipo..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            id="btn-submit-shared-task"
            title="Publicar tarea disponible en la pizarra"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shrink-0 shadow-sm active:scale-[0.98]"
          >
            Publicar
          </button>
        </form>

        {/* Grid of Available Tasks */}
        <div className="mt-5">
          {matchingAvailableTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {matchingAvailableTasks.map(task => (
                <PizarraTaskCard
                  key={task.id}
                  task={task}
                  permissions={getUserPermissions(task)}
                  isProcessing={!!processingTaskIds[task.id]}
                  onOpenModal={openEditModal}
                  onClaim={handleClaimWithFeedback}
                  onRelease={handleReleaseWithFeedback}
                  onStatusChange={handleStatusChangeWithFeedback}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs sm:text-sm font-bold text-white">
                No hay tareas disponibles sin tomar en este momento
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Todas las tareas tienen a alguien a cargo, o podés escribir una nueva tarea en el campo superior.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        {visibleUsers.map(user => {
          const userTasks = getTasksForUser(user);

          // Filter by search query if any
          const matchingTasks = userTasks.filter(t => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
              t.title.toLowerCase().includes(term) ||
              (t.description && t.description.toLowerCase().includes(term)) ||
              (t.blockReason && t.blockReason.toLowerCase().includes(term))
            );
          });

          // Active vs Resolved
          const activeTasks = matchingTasks.filter(t => t.status !== 'RESUELTA');
          const resolvedTasks = matchingTasks.filter(t => t.status === 'RESUELTA');

          // Sort active tasks by urgency: Overdue/Blocked/Critical first
          const sortedActiveTasks = [...activeTasks].sort((a, b) => {
            return calculateTaskUrgencyScore(b, todayStr) - calculateTaskUrgencyScore(a, todayStr);
          });

          const blockedCount = activeTasks.filter(t => t.status === 'BLOQUEADA').length;
          const criticalCount = activeTasks.filter(t => t.priority === 'CRITICA').length;

          const userNotes = (notes[user.id] || []).filter(n => {
            if (!searchTerm) return true;
            return n.text.toLowerCase().includes(searchTerm.toLowerCase());
          });

          const showResolved = !!showResolvedByUser[user.id];

          return (
            <div
              key={user.id}
              id={`person-panel-${user.id}`}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden transition-all duration-200"
            >
              {/* Panel Header: Prominent Name, Clear Hierarchy */}
              <div className="p-6 sm:p-7 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-slate-50/20 to-white">
                <div className="flex items-start justify-between gap-4">
                  {/* Name, role & active count */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        {user.name}
                      </h3>
                      {/* Active tasks counter pill */}
                      <span
                        id={`badge-counter-${user.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white shadow-xs whitespace-nowrap tracking-wide"
                      >
                        <span>{activeTasks.length}</span>
                        <span className="font-semibold text-[11px] text-slate-300">
                          {activeTasks.length === 1 ? 'a su cargo' : 'a su cargo'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                        {user.role}
                      </p>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                        {user.accessLevel}
                      </span>
                    </div>

                    {/* Urgent / Blocked indicators if any */}
                    {(blockedCount > 0 || criticalCount > 0) && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {blockedCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <Ban className="w-3.5 h-3.5 stroke-[2.4]" />
                            <span>{blockedCount} {blockedCount === 1 ? 'bloqueo' : 'bloqueos'}</span>
                          </span>
                        )}
                        {criticalCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.4]" />
                            <span>{criticalCount} {criticalCount === 1 ? 'crítica' : 'críticas'}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: TAREAS (Main workspace directly below name) */}
              <div className="p-6 sm:p-7 flex-1 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Tareas a cargo de {user.shortName}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      ({activeTasks.length})
                    </span>
                  </div>

                  {resolvedTasks.length > 0 && (
                    <button
                      onClick={() => toggleResolvedForUser(user.id)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50"
                    >
                      <span>
                        {showResolved
                          ? 'Ocultar resueltas'
                          : `Ver resueltas (${resolvedTasks.length})`}
                      </span>
                      {showResolved ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Active Tasks List */}
                {sortedActiveTasks.length > 0 ? (
                  <div className="space-y-3.5">
                    {sortedActiveTasks.map(task => (
                      <PizarraTaskCard
                        key={task.id}
                        task={task}
                        permissions={getUserPermissions(task)}
                        isProcessing={!!processingTaskIds[task.id]}
                        onOpenModal={openEditModal}
                        onClaim={handleClaimWithFeedback}
                        onRelease={handleReleaseWithFeedback}
                        onStatusChange={handleStatusChangeWithFeedback}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-6 px-4 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/40">
                    <p className="text-xs font-semibold text-slate-500">
                      Sin tareas activas asignadas
                    </p>
                  </div>
                )}

                {/* Resolved Tasks Collapsible List */}
                {showResolved && resolvedTasks.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Tareas Resueltas ({resolvedTasks.length})
                    </span>
                    {resolvedTasks.map(task => (
                      <PizarraTaskCard
                        key={task.id}
                        task={task}
                        permissions={getUserPermissions(task)}
                        isProcessing={!!processingTaskIds[task.id]}
                        onOpenModal={openEditModal}
                        onClaim={handleClaimWithFeedback}
                        onRelease={handleReleaseWithFeedback}
                        onStatusChange={handleStatusChangeWithFeedback}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: ANOTACIONES */}
              <div className="p-6 sm:p-7 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                    <Pin className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                    <span>Anotaciones</span>
                    <span className="text-[11px] font-bold text-slate-400">
                      ({userNotes.length})
                    </span>
                  </div>
                </div>

                {/* Sticky Notes Container */}
                <div className="space-y-3 mb-4">
                  {userNotes.length > 0 ? (
                    userNotes.map(note => {
                      const isYellow = note.color === 'yellow' || !note.color;
                      const isBlue = note.color === 'blue';

                      const noteStyle = isYellow
                        ? 'bg-[#fefce8] border-amber-200 text-amber-950 shadow-2xs'
                        : isBlue
                        ? 'bg-sky-50 border-sky-200 text-sky-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs';

                      return (
                        <div
                          key={note.id}
                          className={`group/note relative p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${noteStyle}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm leading-relaxed font-medium break-words">
                                {note.text}
                              </p>
                              {note.createdAt && (
                                <span className="text-[10px] font-semibold text-slate-500 mt-2 block opacity-75">
                                  {formatNoteTime(note.createdAt)}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteNote(user.id, note.id)}
                              title="Eliminar nota"
                              className="opacity-0 group-hover/note:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 text-center bg-white/60">
                      <p className="text-xs text-slate-400 italic font-medium">
                        Sin notas de seguimiento.
                      </p>
                    </div>
                  )}
                </div>

                {/* Input to Write Note */}
                <form
                  onSubmit={e => handleAddNote(user.id, e)}
                  className="p-2.5 sm:p-3 rounded-xl border border-dashed border-amber-300 bg-[#fefce8]/60 hover:bg-[#fefce8] transition-all flex items-center gap-2"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 stroke-[2.2]" />
                  <input
                    type="text"
                    id={`input-note-${user.id}`}
                    value={quickNoteInputs[user.id] || ''}
                    onChange={e =>
                      setQuickNoteInputs(prev => ({ ...prev, [user.id]: e.target.value }))
                    }
                    placeholder={`+ Escribir nota para ${user.shortName}...`}
                    className="flex-1 bg-transparent text-xs sm:text-sm text-amber-950 placeholder:text-amber-700/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    title="Guardar nota"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#142136] hover:bg-[#1e2f4a] text-white transition-colors cursor-pointer shrink-0 shadow-2xs active:scale-[0.98]"
                  >
                    Guardar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
