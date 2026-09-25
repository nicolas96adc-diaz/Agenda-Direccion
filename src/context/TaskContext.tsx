import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { MeetingAttendance, Task, TaskStatus, ViewType, UserProfile, PersonNote, PersonNoteEditableFields } from '../types';
import { INITIAL_TASKS } from '../data/initialTasks';
import { INITIAL_USERS } from '../data/users';
import { getTodayDateString, sortTasksByPriorityAndTime } from '../utils/dateUtils';
import { calculateTaskUrgencyScore } from '../utils/taskUrgency';
import { getPermissions, TaskPermissions, isTaskAvailable } from '../utils/permissions';
import {
  subscribeTasks,
  subscribeNotes,
  subscribeMeetingAttendance,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  addNoteToFirestore,
  setNoteCompletedInFirestore,
  updateNoteInFirestore,
  deleteNoteFromFirestore,
  confirmMeetingAttendance,
  cancelMeetingAttendance,
  fetchAllFromFirestore,
  getUserProfileByUid,
} from '../services/firestoreSync';
import { auth, onFirebaseAuthStateChanged, signOutFirebase } from '../lib/firebase';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

const migrateTaskStatus = (task: Task): Task =>
  (task.status as unknown as string) === 'EN_CURSO'
    ? { ...task, status: 'EN_PROCESO' }
    : task;

const migrateTaskStatuses = (items: Task[]): Task[] => items.map(migrateTaskStatus);

interface TaskContextType {
  tasks: Task[];
  users: UserProfile[];
  currentUser: UserProfile;
  isLoggedIn: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
  setCurrentUserId: (id: string) => void;
  toggleUserActive: (userId: string) => void;
  getUserPermissions: (task?: Task | null) => TaskPermissions;

  syncStatus: SyncStatus;
  syncError: string | null;
  isLoadingData: boolean;

  notes: Record<string, PersonNote[]>;
  addNote: (userId: string, note: PersonNote) => void;
  updateNote: (userId: string, noteId: string, updates: PersonNoteEditableFields) => void;
  deleteNote: (userId: string, noteId: string) => void;
  toggleNoteCompleted: (userId: string, noteId: string) => void;
  meetingAttendance: Record<string, MeetingAttendance[]>;
  toggleMeetingAttendance: (meetingId: string) => void;

  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isModalOpen: boolean;
  editingTask: Task | null;
  defaultModalStatus: TaskStatus;
  defaultModalInFocus: boolean;
  openCreateModal: (defaultStatus?: TaskStatus, defaultInFocus?: boolean) => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  addTask: (
    taskData: Omit<
      Task,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'createdBy'
      | 'createdById'
      | 'lastModifiedBy'
      | 'lastModifiedById'
    >
  ) => void;
  updateTask: (id: string, updates: Partial<Task>, shouldCloseModal?: boolean) => void;
  reassignTask: (id: string, assigneeId: string) => void;
  claimTask: (id: string, user?: UserProfile) => void;
  releaseTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTaskStatus: (id: string, newStatus: TaskStatus) => boolean;
  toggleTaskResolved: (id: string) => boolean;
  toggleTaskBlocked: (id: string, reason?: string) => boolean;
  toggleFocus: (id: string) => boolean;
  resetTasks: () => void;

  focusTasks: Task[];
  blockedTasks: Task[];
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  resolvedTasks: Task[];
  stats: {
    foco: number;
    bloqueadas: number;
    enCurso: number;
    resueltas: number;
    vencimientos: number;
  };
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notes, setNotes] = useState<Record<string, PersonNote[]>>({});
  const [meetingAttendance, setMeetingAttendance] = useState<Record<string, MeetingAttendance[]>>({});

  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserIdState] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [activeView, setActiveView] = useState<ViewType>('inicio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultModalStatus, setDefaultModalStatus] = useState<TaskStatus>('PENDIENTE');
  const [defaultModalInFocus, setDefaultModalInFocus] = useState(false);

  const currentUser =
    users.find(user => user.id === currentUserId) || INITIAL_USERS[0];

  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged(async user => {
            console.info('[LOGIN_TRACE] AUTH_CONTEXT_STATE_CHANGED', {
        authUid: user?.uid ?? null,
        authEmail: user?.email ?? null,
        hasAuthenticatedUser: Boolean(user),
      });

      setFirebaseUser(user);

      if (!user) {
        setIsLoggedIn(false);
        setCurrentUserIdState('');
        setTasks([]);
        setNotes({});
        setMeetingAttendance({});
        setUsers(INITIAL_USERS);
        setSyncStatus('offline');
        setSyncError(null);
        setIsLoadingData(false);
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);
        const emailMatches =
          profile?.email?.toLowerCase() === (user.email || '').toLowerCase();

                const profileExists = Boolean(profile);
        const profileIsActive = profile?.active === true;
        console.info('[LOGIN_TRACE] AUTH_CONTEXT_PROFILE_VALIDATIONS', {
          authUid: user.uid,
          authEmail: user.email ?? null,
          profileExists,
          emailMatches,
          profileIsActive,
          profile: profile ?? null,
        });

if (!profile || !profile.active || !emailMatches) {
                    console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: auth_context_profile_validation', {
            profileExists,
            emailMatches,
            profileIsActive,
          });
await signOutFirebase();
          return;
        }

        setUsers(
          INITIAL_USERS.map(base =>
            base.id === profile.id ? { ...base, ...profile } : base
          )
        );
        setCurrentUserIdState(profile.id);
        setIsLoggedIn(true);
                console.info('[LOGIN_TRACE] LOGIN_SUCCESS', {
          source: 'auth_context',
          profileUid: profile.uid,
          profileAppUserId: profile.appUserId,
          activeView: 'inicio',
        });
setActiveView('inicio');
      } catch (error) {
        console.warn('No se pudo cargar el perfil Firebase:', error);
        await signOutFirebase();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !firebaseUser) {
      return;
    }

    let mounted = true;
    setIsLoadingData(true);
    setSyncStatus('syncing');
    setSyncError(null);

    fetchAllFromFirestore()
      .then(remote => {
        if (!mounted || !remote) return;
        setTasks(migrateTaskStatuses(remote.tasks || []));
        setNotes(remote.notes || {});
        setMeetingAttendance(remote.attendance || {});
        setSyncStatus('synced');
        setIsLoadingData(false);
      })
      .catch(error => {
        if (!mounted) return;
        console.warn('Firestore initial load error:', error);
        setSyncStatus('error');
        setSyncError('No se pudo cargar la información de Firestore.');
        setIsLoadingData(false);
      });

    const unsubscribeTasks = subscribeTasks(
      remoteTasks => {
        if (!mounted) return;
        setTasks(migrateTaskStatuses(remoteTasks || []));
        setSyncStatus('synced');
        setSyncError(null);
        setIsLoadingData(false);
      },
      () => {
        if (!mounted) return;
        setSyncStatus('error');
        setSyncError('Problema al escuchar cambios de tareas.');
        setIsLoadingData(false);
      }
    );

    const unsubscribeNotes = subscribeNotes(
      remoteNotes => {
        if (!mounted) return;
        setNotes(remoteNotes || {});
        setSyncStatus('synced');
        setSyncError(null);
      },
      () => {
        if (!mounted) return;
        setSyncStatus('error');
        setSyncError('Problema al escuchar cambios de notas.');
      }
    );

    const unsubscribeAttendance = subscribeMeetingAttendance(
      remoteAttendance => {
        if (!mounted) return;
        setMeetingAttendance(remoteAttendance || {});
        setSyncStatus('synced');
        setSyncError(null);
      },
      () => {
        if (!mounted) return;
        setSyncStatus('error');
        setSyncError('Problema al escuchar confirmaciones de reuniones.');
      }
    );

    return () => {
      mounted = false;
      unsubscribeTasks();
      unsubscribeNotes();
      unsubscribeAttendance();
    };
  }, [isLoggedIn, firebaseUser]);

  const login = (profile: UserProfile) => {
        const hasAuthCurrentUser = Boolean(auth.currentUser);
    const profileUidMatchesAuth = profile.uid === auth.currentUser?.uid;
    const profileIsActive = profile.active === true;
    console.info('[LOGIN_TRACE] CONTEXT_LOGIN_VALIDATIONS', {
      authUid: auth.currentUser?.uid ?? null,
      profileUid: profile.uid,
      profileAppUserId: profile.appUserId,
      hasAuthCurrentUser,
      profileUidMatchesAuth,
      profileIsActive,
    });

    if (!auth.currentUser || profile.uid !== auth.currentUser.uid || !profile.active) {
            console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: context_login_validation', {
        hasAuthCurrentUser,
        profileUidMatchesAuth,
        profileIsActive,
      });

      return;
    }
    setUsers(
      INITIAL_USERS.map(base =>
        base.id === profile.id ? { ...base, ...profile } : base
      )
    );
    setCurrentUserIdState(profile.id);
    setIsLoggedIn(true);
    setActiveView('inicio');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsModalOpen(false);
    setEditingTask(null);
    setTasks([]);
    setNotes({});
    setMeetingAttendance({});
    setUsers(INITIAL_USERS);
    setCurrentUserIdState('');
    setSyncStatus('offline');
    setSyncError(null);
    void signOutFirebase();
  };

  const setCurrentUserId = (_id: string) => {
    console.warn('La identidad activa solo puede provenir de Firebase Auth.');
  };

  const toggleUserActive = (_userId: string) => {
    alert('Los perfiles se activan o desactivan desde la administración segura de Firebase.');
  };

  const getUserPermissions = (task?: Task | null): TaskPermissions =>
    getPermissions(currentUser, task);

  const openCreateModal = (
    defaultStatus: TaskStatus = 'PENDIENTE',
    defaultInFocus = false
  ) => {
    setEditingTask(null);
    setDefaultModalStatus(defaultStatus);
    setDefaultModalInFocus(defaultInFocus);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const persistTask = (task: Task, errorMessage: string) => {
    setSyncStatus('syncing');
    setSyncError(null);
    void saveTaskToFirestore(task)
      .then(success => {
        if (!success) throw new Error(errorMessage);
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn(errorMessage, error);
        setSyncStatus('error');
        setSyncError(errorMessage);
      });
  };

  const addTask = (
    taskData: Omit<
      Task,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'createdBy'
      | 'createdById'
      | 'lastModifiedBy'
      | 'lastModifiedById'
    >
  ) => {
    if (!firebaseUser) {
      alert('Necesitás una sesión válida para crear tareas.');
      return;
    }

    const now = new Date().toISOString();
    const isGroupMeeting = taskData.kind === 'REUNION_GRUPO';
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      status: 'PENDIENTE',
      assignee: isGroupMeeting ? currentUser.name : '',
      assigneeId: isGroupMeeting ? currentUser.id : undefined,
      assigneeUid: isGroupMeeting ? firebaseUser.uid : undefined,
      createdBy: currentUser.name,
      createdById: currentUser.id,
      createdByUid: firebaseUser.uid,
      createdAt: now,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
      lastModifiedByUid: firebaseUser.uid,
      updatedAt: now,
      closedBy: undefined,
      closedById: undefined,
      closedByUid: undefined,
      resolvedAt: undefined,
      kind: isGroupMeeting ? 'REUNION_GRUPO' : undefined,
      organizerName: isGroupMeeting ? currentUser.name : undefined,
      organizerId: isGroupMeeting ? currentUser.id : undefined,
      organizerUid: isGroupMeeting ? firebaseUser.uid : undefined,
      auditLog: [
        {
          action: 'CREADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: isGroupMeeting ? 'Reunión de grupo creada; el organizador la gestiona.' : 'Tarea creada y disponible para el equipo',
        },
      ],
    };

    setTasks(previous => [newTask, ...previous]);
    closeModal();
    persistTask(newTask, 'Error al crear la tarea en Firestore.');
  };

  const updateTask = (
    id: string,
    updates: Partial<Task>,
    shouldCloseModal = false
  ) => {
    const targetTask = tasks.find(task => task.id === id);
    if (!targetTask) return;

    const permissions = getPermissions(currentUser, targetTask);
    if (!permissions.canEditTask) {
      alert(permissions.restrictionReason || 'No tenés permiso para editar esta tarea.');
      return;
    }

    const {
      assignee: _ignoredAssignee,
      assigneeId: _ignoredAssigneeId,
      assigneeUid: _ignoredAssigneeUid,
      id: _ignoredId,
      createdBy: _ignoredCreatedBy,
      createdById: _ignoredCreatedById,
      createdByUid: _ignoredCreatedByUid,
      createdAt: _ignoredCreatedAt,
      auditLog: _ignoredAuditLog,
      ...safeUpdates
    } = updates;

    const requestedStatus = safeUpdates.status;
    if (requestedStatus === 'RESUELTA' && !permissions.canResolveTask) {
      alert('No tenés permiso para resolver esta tarea.');
      return;
    }
    if (
      targetTask.status === 'RESUELTA' &&
      requestedStatus &&
      requestedStatus !== 'RESUELTA' &&
      !permissions.canResolveTask
    ) {
      alert('No tenés permiso para reabrir esta tarea.');
      return;
    }
    if (requestedStatus === 'BLOQUEADA' && !permissions.canBlockTask) {
      alert('No tenés permiso para bloquear esta tarea.');
      return;
    }
    if (
      safeUpdates.inFocus !== undefined &&
      safeUpdates.inFocus !== targetTask.inFocus &&
      !permissions.canToggleFocus
    ) {
      alert('No tenés permiso para modificar el Foco del Día.');
      return;
    }

    const now = new Date().toISOString();
    const nextStatus = safeUpdates.status ?? targetTask.status;
    let resolvedAt = targetTask.resolvedAt;
    let closedBy = targetTask.closedBy;
    let closedById = targetTask.closedById;
    let closedByUid = targetTask.closedByUid;
    let action: NonNullable<Task['auditLog']>[number]['action'] = 'MODIFICADA';
    let details = 'Datos operativos actualizados';

    if (nextStatus === 'RESUELTA' && targetTask.status !== 'RESUELTA') {
      resolvedAt = now;
      closedBy = currentUser.name;
      closedById = currentUser.id;
      closedByUid = firebaseUser?.uid;
      action = 'RESUELTA';
      details = 'Tarea cerrada y marcada como RESUELTA';
    } else if (targetTask.status === 'RESUELTA' && nextStatus !== 'RESUELTA') {
      resolvedAt = undefined;
      closedBy = undefined;
      closedById = undefined;
      closedByUid = undefined;
      action = 'REABIERTA';
      details = `Reabierta a ${nextStatus}`;
    } else if (nextStatus === 'BLOQUEADA' && targetTask.status !== 'BLOQUEADA') {
      action = 'BLOQUEADA';
      details = safeUpdates.blockReason
        ? `Bloqueada: ${safeUpdates.blockReason}`
        : 'Marcada como BLOQUEADA';
    } else if (targetTask.status === 'BLOQUEADA' && nextStatus !== 'BLOQUEADA') {
      action = 'DESBLOQUEADA';
      details = `Desbloqueada y movida a ${nextStatus}`;
    } else if (nextStatus !== targetTask.status) {
      action = 'ESTADO_CAMBIADO';
      details = `Estado cambiado de ${targetTask.status} a ${nextStatus}`;
    } else if (
      safeUpdates.inFocus !== undefined &&
      safeUpdates.inFocus !== targetTask.inFocus
    ) {
      details = safeUpdates.inFocus
        ? 'Agregada al Foco del Día'
        : 'Quitada del Foco del Día';
    }

    const blockReason =
      targetTask.status === 'BLOQUEADA' && nextStatus !== 'BLOQUEADA'
        ? undefined
        : safeUpdates.blockReason !== undefined
          ? safeUpdates.blockReason
          : targetTask.blockReason;

    const nextTask: Task = {
      ...targetTask,
      ...safeUpdates,
      status: nextStatus,
      blockReason,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
      lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
      updatedAt: now,
      resolvedAt,
      closedBy,
      closedById,
      closedByUid,
      auditLog: [
        {
          action,
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details,
        },
        ...(targetTask.auditLog || []),
      ],
    };

    setTasks(previous => previous.map(task => (task.id === id ? nextTask : task)));
    if (shouldCloseModal) closeModal();
    persistTask(nextTask, 'Error al actualizar la tarea en Firestore.');
  };

  const reassignTask = (id: string, assigneeId: string) => {
    const targetTask = tasks.find(task => task.id === id);
    const nextAssignee = users.find(user => user.id === assigneeId && user.active);
    if (!targetTask || !nextAssignee) {
      alert('Elegí un integrante activo para derivar la tarea.');
      return;
    }

    const permissions = getPermissions(currentUser, targetTask);
    if (targetTask.kind === 'REUNION_GRUPO' || !permissions.canChangeAssignee) {
      alert('No tenés permiso para derivar esta tarea.');
      return;
    }
    if (targetTask.assigneeId === nextAssignee.id || targetTask.assigneeUid === nextAssignee.uid) {
      return;
    }

    const now = new Date().toISOString();
    const previousAssignee = targetTask.assignee || 'Sin responsable';
    const nextTask: Task = {
      ...targetTask,
      assignee: nextAssignee.name,
      assigneeId: nextAssignee.id,
      assigneeUid: nextAssignee.uid,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
      lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
      updatedAt: now,
      auditLog: [
        {
          action: 'DERIVADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: `Derivada de ${previousAssignee} a ${nextAssignee.name}`,
        },
        ...(targetTask.auditLog || []),
      ],
    };

    setTasks(previous => previous.map(task => (task.id === id ? nextTask : task)));
    persistTask(nextTask, 'Error al derivar la tarea en Firestore.');
  };

  const claimTask = (id: string, _userToClaim?: UserProfile) => {
    const targetTask = tasks.find(task => task.id === id);
    if (!targetTask || !firebaseUser) return;

    const permissions = getPermissions(currentUser, targetTask);
    if (targetTask.kind === 'REUNION_GRUPO' || !isTaskAvailable(targetTask) || !permissions.canClaimTask) {
      alert('Solo podés tomar tareas disponibles.');
      return;
    }

    const now = new Date().toISOString();
    const nextTask: Task = {
      ...targetTask,
      status: targetTask.status === 'PENDIENTE' ? 'EN_PROCESO' : targetTask.status,
      assignee: currentUser.name,
      assigneeId: currentUser.id,
      assigneeUid: firebaseUser.uid,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
      lastModifiedByUid: firebaseUser.uid,
      updatedAt: now,
      auditLog: [
        {
          action: 'MODIFICADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: `${currentUser.name} se hizo cargo de la tarea`,
        },
        ...(targetTask.auditLog || []),
      ],
    };

    setTasks(previous => previous.map(task => (task.id === id ? nextTask : task)));
    persistTask(nextTask, 'Error al tomar la tarea en Firestore.');
  };

  const releaseTask = (id: string) => {
    const targetTask = tasks.find(task => task.id === id);
    if (!targetTask) return;

    const permissions = getPermissions(currentUser, targetTask);
    if (targetTask.kind === 'REUNION_GRUPO' || !permissions.canReleaseTask) {
      alert('No tenés permiso para liberar esta tarea.');
      return;
    }

    const now = new Date().toISOString();
    const previousAssignee = targetTask.assignee;
    const nextTask: Task = {
      ...targetTask,
      assignee: '',
      assigneeId: undefined,
      assigneeUid: undefined,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
      lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
      updatedAt: now,
      auditLog: [
        {
          action: 'MODIFICADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: `${previousAssignee || 'Responsable'} dejó la tarea disponible para el equipo`,
        },
        ...(targetTask.auditLog || []),
      ],
    };

    setTasks(previous => previous.map(task => (task.id === id ? nextTask : task)));
    persistTask(nextTask, 'Error al liberar la tarea en Firestore.');
  };

  const deleteTask = (id: string) => {
    const targetTask = tasks.find(task => task.id === id);
    if (!targetTask || !getPermissions(currentUser, targetTask).canDeleteTask) {
      alert('Solo Rodrigo puede eliminar tareas.');
      return;
    }

    setTasks(previous => previous.filter(task => task.id !== id));
    closeModal();
    setSyncStatus('syncing');
    setSyncError(null);
    void deleteTaskFromFirestore(id)
      .then(success => {
        if (!success) throw new Error('Error al eliminar la tarea en Firestore.');
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn('Firestore delete error:', error);
        setSyncStatus('error');
        setSyncError('Error al eliminar la tarea en Firestore.');
      });
  };

  const moveTaskStatus = (id: string, newStatus: TaskStatus): boolean => {
    const task = tasks.find(item => item.id === id);
    if (!task) return false;

    const permissions = getPermissions(currentUser, task);
    if (newStatus === 'RESUELTA' && !permissions.canResolveTask) {
      alert(permissions.restrictionReason || 'No tenés permiso para resolver esta tarea.');
      return false;
    }
    if (
      task.status === 'RESUELTA' &&
      newStatus !== 'RESUELTA' &&
      !permissions.canResolveTask
    ) {
      alert(permissions.restrictionReason || 'No tenés permiso para reabrir esta tarea.');
      return false;
    }
    if (newStatus === 'BLOQUEADA' && !permissions.canBlockTask) {
      alert(permissions.restrictionReason || 'No tenés permiso para bloquear esta tarea.');
      return false;
    }
    if (
      newStatus !== 'BLOQUEADA' &&
      newStatus !== 'RESUELTA' &&
      !permissions.canEditTask
    ) {
      alert(permissions.restrictionReason || 'No tenés permiso para cambiar esta tarea.');
      return false;
    }

    updateTask(id, { status: newStatus });
    return true;
  };

  const toggleTaskResolved = (id: string): boolean => {
    const task = tasks.find(item => item.id === id);
    if (!task) return false;
    const nextStatus: TaskStatus =
      task.status === 'RESUELTA' ? 'EN_PROCESO' : 'RESUELTA';
    return moveTaskStatus(id, nextStatus);
  };

  const toggleTaskBlocked = (id: string, reason?: string): boolean => {
    const task = tasks.find(item => item.id === id);
    if (!task) return false;

    const permissions = getPermissions(currentUser, task);
    if (!permissions.canBlockTask) {
      alert(permissions.restrictionReason || 'No tenés permiso para bloquear esta tarea.');
      return false;
    }

    if (task.status === 'BLOQUEADA') {
      return moveTaskStatus(id, 'EN_PROCESO');
    }

    updateTask(id, {
      status: 'BLOQUEADA',
      blockReason: reason || 'Esperando validación de Dirección',
    });
    return true;
  };

  const toggleFocus = (id: string): boolean => {
    const task = tasks.find(item => item.id === id);
    if (!task) return false;

    const permissions = getPermissions(currentUser, task);
    if (!permissions.canToggleFocus) {
      alert('Solo Dirección y Administración pueden modificar el Foco del Día.');
      return false;
    }

    updateTask(id, { inFocus: !task.inFocus });
    return true;
  };

  const addNote = (userId: string, note: PersonNote) => {
    if (!firebaseUser || !isLoggedIn) {
      alert('Necesitás una sesión válida para crear una anotación.');
      return;
    }

    // The UI only supplies note content. Authorship is always stamped from the active session.
    const noteWithAuthor: PersonNote = {
      ...note,
      authorName: currentUser.name,
      authorUid: firebaseUser.uid,
    };
    setNotes(previous => ({
      ...previous,
      [userId]: [noteWithAuthor, ...(previous[userId] || [])],
    }));
    setSyncStatus('syncing');
    void addNoteToFirestore(userId, noteWithAuthor)
      .then(success => {
        if (!success) throw new Error('Error al guardar la nota.');
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn('Firestore note error:', error);
        setSyncStatus('error');
        setSyncError('Error al guardar la nota en Firestore.');
      });
  };

  const deleteNote = (userId: string, noteId: string) => {
    setNotes(previous => ({
      ...previous,
      [userId]: (previous[userId] || []).filter(note => note.id !== noteId),
    }));
    setSyncStatus('syncing');
    void deleteNoteFromFirestore(noteId)
      .then(success => {
        if (!success) throw new Error('Error al eliminar la nota.');
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn('Firestore note delete error:', error);
        setSyncStatus('error');
        setSyncError('Error al eliminar la nota en Firestore.');
      });
  };

  const updateNote = (userId: string, noteId: string, updates: PersonNoteEditableFields) => {
    if (!firebaseUser || !isLoggedIn) {
      alert('Necesitás una sesión válida para actualizar una anotación.');
      return;
    }

    const note = (notes[userId] || []).find(item => item.id === noteId);
    const text = updates.text.trim();
    const color = updates.color === 'blue' || updates.color === 'slate' ? updates.color : 'yellow';
    if (!note || !note.authorUid || note.authorUid !== firebaseUser.uid) {
      alert('Solo quien creó esta anotación puede editarla.');
      return;
    }
    if (!text) {
      alert('La anotación no puede quedar vacía.');
      return;
    }

    const nextNote: PersonNote = { ...note, text, color };
    setNotes(previous => ({
      ...previous,
      [userId]: (previous[userId] || []).map(item => item.id === noteId ? nextNote : item),
    }));
    setSyncStatus('syncing');
    void updateNoteInFirestore(noteId, { text, color })
      .then(success => {
        if (!success) throw new Error('Error al actualizar la anotación.');
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn('Firestore note update error:', error);
        setSyncStatus('error');
        setSyncError('Error al actualizar la anotación en Firestore.');
      });
  };

  const toggleNoteCompleted = (userId: string, noteId: string) => {
    if (!firebaseUser || !isLoggedIn) {
      alert('Necesitás una sesión válida para actualizar una anotación.');
      return;
    }

    const note = (notes[userId] || []).find(item => item.id === noteId);
    if (!note || !note.authorUid || note.authorUid !== firebaseUser.uid) {
      alert('No tenés permiso para actualizar esta anotación.');
      return;
    }

    const isCompleted = !note.isCompleted;
    setNotes(previous => ({
      ...previous,
      [userId]: (previous[userId] || []).map(item =>
        item.id === noteId ? { ...item, isCompleted } : item,
      ),
    }));
    setSyncStatus('syncing');
    void setNoteCompletedInFirestore(noteId, isCompleted)
      .then(success => {
        if (!success) throw new Error('Error al actualizar la anotación.');
        setSyncStatus('synced');
      })
      .catch(error => {
        console.warn('Firestore note update error:', error);
        setSyncStatus('error');
        setSyncError('Error al actualizar la anotación en Firestore.');
      });
  };

  const toggleMeetingAttendance = (meetingId: string) => {
    if (!firebaseUser || !isLoggedIn) {
      alert('Necesitás una sesión válida para confirmar asistencia.');
      return;
    }
    const meeting = tasks.find(task => task.id === meetingId && task.kind === 'REUNION_GRUPO');
    if (!meeting || meeting.organizerUid === firebaseUser.uid) return;

    const attendanceId = `${meetingId}_${firebaseUser.uid}`;
    const existing = (meetingAttendance[meetingId] || []).find(item => item.attendeeUid === firebaseUser.uid);
    setSyncStatus('syncing');
    if (existing) {
      setMeetingAttendance(previous => ({ ...previous, [meetingId]: (previous[meetingId] || []).filter(item => item.attendeeUid !== firebaseUser.uid) }));
      void cancelMeetingAttendance(attendanceId)
        .then(success => { if (!success) throw new Error('Error al cancelar asistencia.'); setSyncStatus('synced'); })
        .catch(error => { console.warn('Meeting attendance cancellation error:', error); setSyncStatus('error'); setSyncError('Error al cancelar asistencia a la reunión.'); });
      return;
    }

    const attendance: MeetingAttendance = { id: attendanceId, meetingId, attendeeUid: firebaseUser.uid, attendeeName: currentUser.name, confirmedAt: new Date().toISOString() };
    setMeetingAttendance(previous => ({ ...previous, [meetingId]: [...(previous[meetingId] || []), attendance] }));
    void confirmMeetingAttendance(attendance)
      .then(success => { if (!success) throw new Error('Error al confirmar asistencia.'); setSyncStatus('synced'); })
      .catch(error => { console.warn('Meeting attendance confirmation error:', error); setSyncStatus('error'); setSyncError('Error al confirmar asistencia a la reunión.'); });
  };

  const resetTasks = () => {
    alert('El reinicio masivo desde el navegador está deshabilitado por seguridad.');
  };

  const todayString = getTodayDateString();

  const focusTasks = [...tasks.filter(task => task.inFocus && task.status !== 'RESUELTA')].sort(
    (a, b) =>
      calculateTaskUrgencyScore(b, todayString) - calculateTaskUrgencyScore(a, todayString)
  );

  const blockedTasks = sortTasksByPriorityAndTime(
    tasks.filter(task => task.status === 'BLOQUEADA')
  );

  const todayTasks = sortTasksByPriorityAndTime(
    tasks.filter(task => task.dueDate === todayString && task.status !== 'RESUELTA')
  );

  const overdueTasks = sortTasksByPriorityAndTime(
    tasks.filter(
      task => task.dueDate && task.dueDate < todayString && task.status !== 'RESUELTA'
    )
  );

  const upcomingTasks = sortTasksByPriorityAndTime(
    tasks.filter(
      task => task.dueDate && task.dueDate > todayString && task.status !== 'RESUELTA'
    )
  );

  const resolvedTasks = [...tasks.filter(task => task.status === 'RESUELTA')].sort(
    (a, b) => (b.resolvedAt || b.updatedAt).localeCompare(a.resolvedAt || a.updatedAt)
  );

  const stats = {
    foco: focusTasks.length,
    bloqueadas: blockedTasks.length,
    enCurso: tasks.filter(task => task.status === 'EN_PROCESO').length,
    resueltas: resolvedTasks.length,
    vencimientos: todayTasks.length + overdueTasks.length,
  };

  const activeEditingTask = editingTask
    ? tasks.find(task => task.id === editingTask.id) || editingTask
    : null;

  return (
    <TaskContext.Provider
      value={{
        tasks,
        users,
        currentUser,
        isLoggedIn,
        login,
        logout,
        setCurrentUserId,
        toggleUserActive,
        getUserPermissions,
        syncStatus,
        syncError,
        isLoadingData,
        notes,
        addNote,
        updateNote,
        deleteNote,
        toggleNoteCompleted,
      meetingAttendance,
      toggleMeetingAttendance,
        activeView,
        setActiveView,
        isModalOpen,
        editingTask: activeEditingTask,
        defaultModalStatus,
        defaultModalInFocus,
        openCreateModal,
        openEditModal,
        closeModal,
        addTask,
        updateTask,
        reassignTask,
        claimTask,
        releaseTask,
        deleteTask,
        moveTaskStatus,
        toggleTaskResolved,
        toggleTaskBlocked,
        toggleFocus,
        resetTasks,
        focusTasks,
        blockedTasks,
        todayTasks,
        overdueTasks,
        upcomingTasks,
        resolvedTasks,
        stats,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
