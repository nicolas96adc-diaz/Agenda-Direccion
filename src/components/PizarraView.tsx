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
  Pencil,
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
import { MeetingCard } from './MeetingCard';

export const PizarraView: React.FC = () => {
  const {
    tasks,
    users,
    currentUser,
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleNoteCompleted,
    openCreateModal,
    openEditModal,
    toggleTaskResolved,
    toggleTaskBlocked,
    getUserPermissions,
    addTask,
    claimTask,
    releaseTask,
    moveTaskStatus,
    meetingAttendance,
    toggleMeetingAttendance,
  } = useTasks();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [showResolvedByUser, setShowResolvedByUser] = useState<Record<string, boolean>>({});
  const [quickNoteInputs, setQuickNoteInputs] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<{
    userId: string;
    noteId: string;
    text: string;
    color: 'yellow' | 'blue' | 'slate';
  } | null>(null);
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
  const groupMeetings = tasks.filter(task => task.kind === 'REUNION_GRUPO');

  const availableTasks = tasks.filter(t => {
    if (t.kind === 'REUNION_GRUPO') return false;
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
      if (t.kind === 'REUNION_GRUPO') return false;
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

  const startEditingNote = (userId: string, note: PersonNote) => {
    setEditingNote({
      userId,
      noteId: note.id,
      text: note.text,
      color: note.color === 'blue' || note.color === 'slate' ? note.color : 'yellow',
    });
  };

  const saveEditedNote = () => {
    if (!editingNote) return;
    const text = editingNote.text.trim();
    if (!text) return;
    updateNote(editingNote.userId, editingNote.noteId, { text, color: editingNote.color });
    setEditingNote(null);
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Pizarra
              </h2>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                {users.length} integrantes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-2xl leading-relaxed">
              Mirá qué está en curso, qué necesita responsable y qué requiere atención.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-pizarra-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar tareas o anotaciones"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* User selector filter */}
          <select
            id="select-pizarra-user-filter"
            value={selectedUserFilter}
            onChange={e => setSelectedUserFilter(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto cursor-pointer"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142136] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1e2f4a] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva tarea</span>
          </button>
        </div>
      </div>

      {/* SECTION: PIZARRA COMPARTIDA · TAREAS DISPONIBLES */}
      {groupMeetings.length > 0 && (
        <section aria-labelledby="group-meetings-heading" className="rounded-2xl border border-indigo-100 bg-white p-5 sm:p-6 shadow-[0_4px_22px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><Users className="w-5 h-5" /></div>
            <div>
              <h3 id="group-meetings-heading" className="text-lg sm:text-xl font-bold text-slate-900">Reuniones de grupo</h3>
              <p className="text-xs sm:text-sm text-slate-500">Confirmá tu asistencia; solo el organizador puede editar cada reunión.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {groupMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} attendance={meetingAttendance[meeting.id] || []} currentUser={currentUser} onOpen={openEditModal} onToggleAttendance={toggleMeetingAttendance} />)}
          </div>
        </section>
      )}
      <div
        id="section-tareas-disponibles"
        className="bg-[#142136] text-white rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.15)] border border-slate-800"
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

        </div>

        {/* Clear slot to post a new task to the shared whiteboard */}
        <form
          onSubmit={handleCreateSharedTask}
          className="mt-5 flex flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-3 transition-colors focus-within:border-emerald-400/70 focus-within:bg-white/10 sm:flex-row sm:items-center sm:gap-2.5"
        >
          <Plus className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
          <input
            type="text"
            id="input-shared-whiteboard-task"
            value={sharedWhiteboardTaskTitle}
            onChange={e => setSharedWhiteboardTaskTitle(e.target.value)}
            aria-label="Título de la tarea rápida disponible para el equipo"
            placeholder="Escribí una tarea rápida para el equipo…"
            className="min-h-10 w-full flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            id="btn-submit-shared-task"
            title="Publicar tarea disponible en la pizarra"
            className="min-h-10 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-emerald-400 active:scale-[0.98] sm:w-auto cursor-pointer shrink-0"
          >
            Crear tarea rápida
          </button>
        </form>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">Queda disponible para el equipo, vence hoy a las 18:00 y aparece en Foco de hoy. Para definir otro plazo, usá “Nueva tarea”.</p>

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
              className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden transition-all duration-200"
            >
              {/* Panel Header: Prominent Name, Clear Hierarchy */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-slate-50/20 to-white">
                <div className="flex items-start justify-between gap-4">
                  {/* Name, role & active count */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
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
              <div className="p-5 sm:p-6 flex-1 space-y-4">
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
                      className="min-h-10 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50">
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
                <div className="space-y-2 mb-4">
                  {userNotes.length > 0 ? (
                    userNotes.map(note => {
                      const isYellow = note.color === 'yellow' || !note.color;
                      const isBlue = note.color === 'blue';
                      const canEditNote = !!note.authorUid && note.authorUid === currentUser.uid;
                      const isEditing = editingNote?.noteId === note.id && editingNote.userId === user.id;

                      const noteStyle = isYellow
                        ? 'bg-[#fefce8] border-amber-200 text-amber-950 shadow-2xs'
                        : isBlue
                        ? 'bg-sky-50 border-sky-200 text-sky-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs';

                      return (
                        <div
                          key={note.id}
                          className={`group/note relative p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${noteStyle} ${note.isCompleted ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="space-y-2.5">
                                  <textarea
                                    id={`textarea-note-${note.id}`}
                                    value={editingNote.text}
                                    onChange={event => setEditingNote(current => current ? { ...current, text: event.target.value } : current)}
                                    aria-label="Editar anotación"
                                    rows={3}
                                    className="w-full resize-y rounded-lg border border-amber-300 bg-white/80 px-2.5 py-2 text-xs sm:text-sm leading-relaxed text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-300"
                                  />
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5" aria-label="Color de fondo">
                                      {([
                                        ['yellow', 'Amarillo', 'bg-amber-200 border-amber-400'],
                                        ['blue', 'Celeste', 'bg-sky-200 border-sky-400'],
                                        ['slate', 'Blanco', 'bg-white border-slate-400'],
                                      ] as const).map(([color, label, swatchClass]) => (
                                        <button
                                          key={color}
                                          type="button"
                                          aria-label={`Fondo ${label}`}
                                          aria-pressed={editingNote.color === color}
                                          title={`Fondo ${label}`}
                                          onClick={() => setEditingNote(current => current ? { ...current, color } : current)}
                                          className={`h-7 w-7 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${swatchClass} ${editingNote.color === color ? 'scale-110 ring-2 ring-slate-700 ring-offset-1' : 'hover:scale-105'}`}
                                        />
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => setEditingNote(null)} className="min-h-8 rounded-lg px-2 text-[11px] font-bold text-slate-600 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-slate-300">
                                        Cancelar
                                      </button>
                                      <button type="button" onClick={saveEditedNote} disabled={!editingNote.text.trim()} className="min-h-8 rounded-lg bg-[#142136] px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-[#1e2f4a] focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50">
                                        Guardar cambios
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className={`text-xs sm:text-sm leading-relaxed font-medium break-words ${note.isCompleted ? 'text-slate-500 line-through' : ''}`}>
                                  {note.text}
                                </p>
                              )}
                              {note.createdAt && (
                                <span className="text-[10px] font-medium text-slate-500 mt-2.5 block">
                                  {note.authorName ? (
                                    <>Creada por: {note.authorName} · {formatNoteTime(note.createdAt)}</>
                                  ) : (
                                    formatNoteTime(note.createdAt)
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1" onClick={event => event.stopPropagation()}>
                              {canEditNote && !isEditing && (
                                <button
                                  type="button"
                                  onClick={() => toggleNoteCompleted(user.id, note.id)}
                                  aria-pressed={note.isCompleted === true}
                                  title={note.isCompleted ? 'Desmarcar como listo' : 'Marcar como listo'}
                                  className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors ${note.isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-200 hover:text-emerald-800'}`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>{note.isCompleted ? 'Desmarcar listo' : '✓ Listo'}</span>
                                </button>
                              )}
                              {canEditNote && !isEditing && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingNote(user.id, note)}
                                    title="Editar anotación"
                                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-slate-600 opacity-100 transition-colors hover:bg-white/70 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:opacity-0 sm:group-hover/note:opacity-100"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only">Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(user.id, note.id)}
                                    title="Eliminar nota"
                                    className="p-1.5 rounded-lg text-slate-400 opacity-100 transition-all hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 sm:opacity-0 sm:group-hover/note:opacity-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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
                    aria-label={`Nueva anotación para ${user.name}`}
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

