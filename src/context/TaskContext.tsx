import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, TaskStatus, ViewType, UserProfile, PersonNote } from '../types';
import { INITIAL_TASKS } from '../data/initialTasks';
import { INITIAL_USERS, findUserByNameOrAlias } from '../data/users';
import { getTodayDateString, sortTasksByPriorityAndTime } from '../utils/dateUtils';
import { calculateTaskUrgencyScore } from '../utils/taskUrgency';
import { getPermissions, TaskPermissions } from '../utils/permissions';
import {
  fetchSharedData,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiClaimTask,
  apiReleaseTask,
  apiUpdateUsers,
  apiAddNote,
  apiDeleteNote,
  apiSyncAll,
  apiVerifySession,
  apiLogout,
} from '../utils/api';
import {
  subscribeTasks,
  subscribeNotes,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  addNoteToFirestore,
  deleteNoteFromFirestore,
  seedFirestoreIfEmpty,
  fetchAllFromFirestore,
  getUserProfileByUid,
} from '../services/firestoreSync';
import { auth, onFirebaseAuthStateChanged, signOutFirebase } from '../lib/firebase';
import type { User } from 'firebase/auth';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

const TASKS_STORAGE_KEY = 'clinica_chutro_tasks_v2';
const USERS_STORAGE_KEY = 'clinica_chutro_users_v1';
const AUTH_USER_KEY = 'clinica_chutro_auth_user_id_v2';
const AUTH_TOKEN_KEY = 'clinica_chutro_auth_token_v3';
const NOTES_STORAGE_KEY = 'clinica_chutro_pizarra_notes_v2';

const migrateTaskStatus = (task: Task): Task =>
  (task.status as unknown as string) === 'EN_CURSO' ? { ...task, status: 'EN_PROCESO' } : task;
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

  // Cloud Firestore Sync status
  syncStatus: SyncStatus;
  syncError: string | null;
  isLoadingData: boolean;

  notes: Record<string, PersonNote[]>;
  addNote: (userId: string, note: PersonNote) => void;
  deleteNote: (userId: string, noteId: string) => void;

  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isModalOpen: boolean;
  editingTask: Task | null;
  defaultModalStatus: TaskStatus;
  openCreateModal: (defaultStatus?: TaskStatus) => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdById' | 'lastModifiedBy' | 'lastModifiedById'>) => void;
  updateTask: (id: string, updates: Partial<Task>, shouldCloseModal?: boolean) => void;
  claimTask: (id: string, user?: UserProfile) => void;
  releaseTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTaskStatus: (id: string, newStatus: TaskStatus) => boolean;
  toggleTaskResolved: (id: string) => boolean;
  toggleTaskBlocked: (id: string, reason?: string) => boolean;
  toggleFocus: (id: string) => boolean;
  resetTasks: () => void;

  // Computed task collections
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
  // 1. Users state with persistent storage (never duplicates)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading users from localStorage:', e);
    }
    return INITIAL_USERS;
  });

  // Firebase Auth is the only source of an operational session.
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserIdState] = useState('');
  const currentUser = users.find(u => u.id === currentUserId) || users[0] || INITIAL_USERS[0];

  // Firebase Auth & Cloud Firestore Sync State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged(async user => {
      setFirebaseUser(user);
      if (!user) { setIsLoggedIn(false); setCurrentUserIdState(''); setSyncStatus('offline'); return; }
      try {
        const profile = await getUserProfileByUid(user.uid);
        const emailMatches = profile?.email?.toLowerCase() === (user.email || '').toLowerCase();
        if (!profile || !profile.active || !emailMatches) { await signOutFirebase(); setIsLoggedIn(false); setCurrentUserIdState(''); return; }
        setUsers(prev => prev.map(item => item.id === profile.id ? { ...item, ...profile } : item));
        setCurrentUserIdState(profile.id);
        setIsLoggedIn(true);
      } catch (error) { console.warn('No se pudo cargar el perfil Firebase:', error); setIsLoggedIn(false); }
    });
    return () => unsubscribe();
  }, []);

  const login = (profile: UserProfile) => {
    if (!auth.currentUser || profile.uid !== auth.currentUser.uid || !profile.active) return;
    setUsers(prev => prev.map(item => item.id === profile.id ? { ...item, ...profile } : item));
    setCurrentUserIdState(profile.id);
    setIsLoggedIn(true);
    setActiveView('inicio');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsModalOpen(false);
    setEditingTask(null);
    signOutFirebase();
    if (authToken) {
      apiLogout(authToken);
      setAuthToken(null);
    }
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn('Error removing login state:', e);
    }
  };

  const setCurrentUserId = (_id: string) => { console.warn('La identidad activa solo puede provenir de Firebase Auth.'); };

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving users to localStorage:', e);
    }
  }, [users]);

  // 3. Tasks state with migration for traceability & full names
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate & migrate any missing traceability or legacy assignee names
          return parsed.map((t: any) => {
            const rawAssignee = (t.assignee || '').trim();
            const isUnassigned = !rawAssignee || rawAssignee === 'Disponible' || rawAssignee === 'Sin asignar';
            const matchedUser = !isUnassigned ? findUserByNameOrAlias(rawAssignee) : undefined;
            const fullAssignee = isUnassigned ? '' : (matchedUser ? matchedUser.name : rawAssignee);
            const assigneeId = isUnassigned ? undefined : (matchedUser ? matchedUser.id : t.assigneeId);
            const createdBy = t.createdBy || fullAssignee || 'Rodrigo Bustos';
            const createdById = t.createdById || assigneeId || 'user-rodrigo';
            const lastModifiedBy = t.lastModifiedBy || createdBy;
            const lastModifiedById = t.lastModifiedById || createdById;
            const closedBy = t.status === 'RESUELTA' ? (t.closedBy || lastModifiedBy) : undefined;
            const closedById = t.status === 'RESUELTA' ? (t.closedById || lastModifiedById) : undefined;
            const auditLog = t.auditLog && Array.isArray(t.auditLog) ? t.auditLog : [
              {
                action: 'CREADA',
                byUserName: createdBy,
                byUserId: createdById,
                timestamp: t.createdAt || new Date().toISOString(),
                details: fullAssignee ? `A cargo de ${fullAssignee}` : 'Tarea disponible en pizarra',
              },
            ];

            return {
              ...t,
              status: t.status === 'EN_CURSO' ? 'EN_PROCESO' : t.status,
              assignee: fullAssignee,
              assigneeId,
              createdBy,
              createdById,
              lastModifiedBy,
              lastModifiedById,
              closedBy,
              closedById,
              auditLog,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Error reading tasks from localStorage:', e);
    }
    return INITIAL_TASKS;
  });

  const [activeView, setActiveView] = useState<ViewType>('inicio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultModalStatus, setDefaultModalStatus] = useState<TaskStatus>('PENDIENTE');

  // 4. Whiteboard notes state with local & shared synchronization
  const [notes, setNotes] = useState<Record<string, PersonNote[]>>(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading notes from localStorage:', e);
    }
    return {};
  });

  const [lastServerTimestamp, setLastServerTimestamp] = useState<number>(0);

  // Sync notes to local cache
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('Error saving notes to localStorage:', e);
    }
  }, [notes]);

  // Sync tasks to local cache
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Error saving tasks to localStorage:', e);
    }
  }, [tasks]);

  // Shared server sync & live polling
  useEffect(() => {
    let isMounted = true;

    async function initializeSharedData() {
      const serverData = await fetchSharedData();
      if (!isMounted) return;

      if (serverData) {
        if (serverData.tasks.length > 0 || Object.keys(serverData.notes).length > 0) {
          setTasks(migrateTaskStatuses(serverData.tasks));
          setUsers(serverData.users);
          setNotes(serverData.notes);
          setLastServerTimestamp(serverData.lastUpdated);
        } else {
          // If server storage is fresh but this browser has existing local data, seed server
          if (tasks.length > 0 || Object.keys(notes).length > 0) {
            const synced = await apiSyncAll({ tasks, users, notes });
            if (synced && isMounted) {
              setTasks(migrateTaskStatuses(synced.tasks));
              setUsers(synced.users);
              setNotes(synced.notes);
              setLastServerTimestamp(synced.lastUpdated);
            }
          }
        }
      }
    }

    initializeSharedData();

    // Background live synchronization every 3 seconds
    const intervalId = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const liveData = await fetchSharedData();
      if (!isMounted || !liveData) return;
      if (liveData.lastUpdated > lastServerTimestamp) {
        setTasks(migrateTaskStatuses(liveData.tasks));
        setUsers(liveData.users);
        setNotes(liveData.notes);
        setLastServerTimestamp(liveData.lastUpdated);
      }
    }, 3000);

    const handleFocusSync = async () => {
      const liveData = await fetchSharedData();
      if (!isMounted || !liveData) return;
      if (liveData.lastUpdated > lastServerTimestamp) {
        setTasks(migrateTaskStatuses(liveData.tasks));
        setUsers(liveData.users);
        setNotes(liveData.notes);
        setLastServerTimestamp(liveData.lastUpdated);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [lastServerTimestamp]);

  // Cloud Firestore Real-time synchronization
  // Only connect to Cloud Firestore if an authenticated user session is active (Zero-Trust)
  useEffect(() => {
    if (!isLoggedIn || !firebaseUser) {
      setSyncStatus('offline');
      setIsLoadingData(false);
      return;
    }

    let isMounted = true;
    setIsLoadingData(true);
    setSyncStatus('syncing');

    // 1. Seed collections if empty, then fetch initial snapshot
    seedFirestoreIfEmpty(tasks, notes, users)
      .then(() => {
        if (!isMounted) return null;
        return fetchAllFromFirestore();
      })
      .then(remoteData => {
        if (!isMounted || !remoteData) return;
        if (remoteData.tasks && remoteData.tasks.length > 0) {
          setTasks(migrateTaskStatuses(remoteData.tasks));
          try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(remoteData.tasks));
          } catch (e) {
            console.warn(e);
          }
        }
        if (remoteData.users && remoteData.users.length > 0) {
          setUsers(remoteData.users);
          try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(remoteData.users));
          } catch (e) {
            console.warn(e);
          }
        }
        if (remoteData.notes && Object.keys(remoteData.notes).length > 0) {
          setNotes(remoteData.notes);
          try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(remoteData.notes));
          } catch (e) {
            console.warn(e);
          }
        }
        setSyncStatus('synced');
        setSyncError(null);
        setIsLoadingData(false);
      })
      .catch(err => {
        console.warn('Firestore initial load warning:', err);
        if (isMounted) {
          setSyncStatus('error');
          setSyncError(err instanceof Error ? err.message : 'Error al conectar con Firestore');
          setIsLoadingData(false);
        }
      });

    // 2. Real-time Listeners
    const unsubTasks = subscribeTasks(
      remoteTasks => {
        if (!isMounted) return;
        if (remoteTasks && remoteTasks.length > 0) {
          setTasks(migrateTaskStatuses(remoteTasks));
          try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(remoteTasks));
          } catch (e) {
            console.warn(e);
          }
        }
        setSyncStatus('synced');
        setSyncError(null);
      },
      () => {
        if (!isMounted) return;
        setSyncStatus('error');
        setSyncError('Problema al escuchar cambios de tareas');
      }
    );

    const unsubNotes = subscribeNotes(
      remoteNotes => {
        if (!isMounted) return;
        if (remoteNotes && Object.keys(remoteNotes).length > 0) {
          setNotes(remoteNotes);
          try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(remoteNotes));
          } catch (e) {
            console.warn(e);
          }
        }
        setSyncStatus('synced');
        setSyncError(null);
      },
      () => {
        if (!isMounted) return;
        setSyncStatus('error');
        setSyncError('Problema al escuchar notas de pizarra');
      }
    );

    const unsubUsers = () => {};

    return () => {
      isMounted = false;
      unsubTasks();
      unsubNotes();
      unsubUsers();
    };
  }, [isLoggedIn, firebaseUser]);

  // Notes operations
  const addNote = (userId: string, note: PersonNote) => {
    setNotes(prev => {
      const updated = {
        ...prev,
        [userId]: [note, ...(prev[userId] || [])],
      };
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
    apiAddNote(userId, note);
    setSyncStatus('syncing');
    addNoteToFirestore(userId, note)
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn('Firestore note sync error:', err);
        setSyncStatus('error');
        setSyncError('Error al guardar nota en Firestore');
      });
  };

  const deleteNote = (userId: string, noteId: string) => {
    setNotes(prev => {
      const updated = {
        ...prev,
        [userId]: (prev[userId] || []).filter(n => n.id !== noteId),
      };
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
    apiDeleteNote(userId, noteId);
    setSyncStatus('syncing');
    deleteNoteFromFirestore(noteId)
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn('Firestore note delete error:', err);
        setSyncStatus('error');
        setSyncError('Error al eliminar nota en Firestore');
      });
  };

  // Helper to get permissions for active user
  const getUserPermissions = (task?: Task | null): TaskPermissions => {
    return getPermissions(currentUser, task);
  };

  // User role and active state are provisioning data, never client mutations.
  const toggleUserActive = (_userId: string) => { alert('La activación de perfiles se administra de forma segura fuera del cliente.'); };

  const openCreateModal = (defaultStatus: TaskStatus = 'PENDIENTE') => {
    setEditingTask(null);
    setDefaultModalStatus(defaultStatus);
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

  const addTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdById' | 'lastModifiedBy' | 'lastModifiedById'>
  ) => {
    const now = new Date().toISOString();
    const rawAssignee = ''; // New tasks are always available
    const matchedUser = rawAssignee && rawAssignee !== 'Disponible' ? findUserByNameOrAlias(rawAssignee, users) : undefined;
    const finalAssignee = matchedUser ? matchedUser.name : (rawAssignee === 'Disponible' ? '' : rawAssignee);
    const finalAssigneeId = matchedUser ? matchedUser.id : undefined;

    const newTask: Task = {
      ...taskData,
      status: 'PENDIENTE',
      assignee: '',
      assigneeId: undefined,
      assigneeUid: undefined,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdBy: currentUser.name,
      createdById: currentUser.id,
      createdByUid: firebaseUser?.uid || currentUser.uid,
      createdAt: now,
      lastModifiedBy: currentUser.name,
      lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
      updatedAt: now,
      closedBy: undefined,
      closedById: undefined,
      resolvedAt: undefined,
      auditLog: [
        {
          action: 'CREADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: finalAssignee
            ? `Creada por ${currentUser.name} (${currentUser.role}) • A cargo de: ${finalAssignee}`
            : `Creada por ${currentUser.name} en la Pizarra (Disponible para el equipo)`,
        },
      ],
    };

    setTasks(prev => [newTask, ...prev]);
    closeModal();
    apiCreateTask(newTask);
    setSyncStatus('syncing');
    saveTaskToFirestore(newTask)
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn('Firestore task create error:', err);
        setSyncStatus('error');
        setSyncError('Error al crear tarea en Firestore');
      });
  };

  const updateTask = (id: string, updates: Partial<Task>, shouldCloseModal: boolean = false) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    const perms = getPermissions(currentUser, targetTask);
    if (!perms.canEditTask) { alert(perms.restrictionReason || 'No tenés permiso para editar esta tarea.'); return; }
    const requestedStatus = updates.status;
    if (requestedStatus === 'RESUELTA' && !perms.canResolveTask) { alert('No tenés permiso para resolver esta tarea.'); return; }
    if (targetTask.status === 'RESUELTA' && requestedStatus && requestedStatus !== 'RESUELTA' && !perms.canResolveTask) { alert('No tenés permiso para reabrir esta tarea.'); return; }
    if (requestedStatus === 'BLOQUEADA' && !perms.canBlockTask) { alert('No tenés permiso para bloquear esta tarea.'); return; }
    const { assignee: _ignoredAssignee, assigneeId: _ignoredAssigneeId, assigneeUid: _ignoredAssigneeUid, ...safeUpdates } = updates;
    updates = safeUpdates;
    const now = new Date().toISOString();
    let updatedTaskObj: Task | undefined;

    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;

        const updatedStatus = updates.status !== undefined ? updates.status : t.status;
        let resolvedAt = t.resolvedAt;
        let closedBy = t.closedBy;
        let closedById = t.closedById;

        const newAuditEntries = [...(t.auditLog || [])];

        // Audit & Status changes
        if (updatedStatus === 'RESUELTA' && t.status !== 'RESUELTA') {
          resolvedAt = now;
          closedBy = currentUser.name;
          closedById = currentUser.id;
          newAuditEntries.unshift({
            action: 'RESUELTA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: 'Tarea cerrada y marcada como RESUELTA',
          });
        } else if (t.status === 'RESUELTA' && updatedStatus !== 'RESUELTA') {
          resolvedAt = undefined;
          closedBy = undefined;
          closedById = undefined;
          newAuditEntries.unshift({
            action: 'REABIERTA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Reabierta a estado ${updatedStatus}`,
          });
        } else if (updatedStatus === 'BLOQUEADA' && t.status !== 'BLOQUEADA') {
          newAuditEntries.unshift({
            action: 'BLOQUEADA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: updates.blockReason ? `Bloqueada: ${updates.blockReason}` : 'Marcada como BLOQUEADA',
          });
        } else if (t.status === 'BLOQUEADA' && updatedStatus !== 'BLOQUEADA') {
          newAuditEntries.unshift({
            action: 'DESBLOQUEADA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Desbloqueada y movida a ${updatedStatus}`,
          });
        } else if (t.status !== updatedStatus) {
          newAuditEntries.unshift({
            action: 'ESTADO_CAMBIADO',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Estado cambiado de ${t.status} a ${updatedStatus}`,
          });
        } else {
          newAuditEntries.unshift({
            action: 'MODIFICADA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: 'Datos operativos actualizados',
          });
        }

        // Handle assignee mapping if updated
        let finalAssignee = t.assignee;
        let finalAssigneeId = t.assigneeId;
        if (updates.assignee !== undefined && updates.assignee !== t.assignee) {
          if (!updates.assignee || updates.assignee.toLowerCase() === 'disponible' || updates.assignee.toLowerCase() === 'sin asignar') {
            finalAssignee = '';
            finalAssigneeId = undefined;
            newAuditEntries.unshift({
              action: 'MODIFICADA',
              byUserName: currentUser.name,
              byUserId: currentUser.id,
              timestamp: now,
              details: 'La tarea vuelve a estar disponible para el equipo',
            });
          } else {
            const matched = findUserByNameOrAlias(updates.assignee, users);
            finalAssignee = matched ? matched.name : updates.assignee;
            finalAssigneeId = matched ? matched.id : undefined;
            newAuditEntries.unshift({
              action: 'MODIFICADA',
              byUserName: currentUser.name,
              byUserId: currentUser.id,
              timestamp: now,
              details: `A cargo de: ${finalAssignee}`,
            });
          }
        }

        const resTask: Task = {
          ...t,
          ...updates,
          assignee: finalAssignee,
          assigneeId: finalAssigneeId,
          lastModifiedBy: currentUser.name,
          lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
          updatedAt: now,
          resolvedAt,
          closedBy,
          closedById,
          auditLog: newAuditEntries,
        };
        updatedTaskObj = resTask;
        return resTask;
      })
    );
    if (shouldCloseModal) {
      closeModal();
    }
    apiUpdateTask(id, updates);
    if (updatedTaskObj) {
      setSyncStatus('syncing');
      saveTaskToFirestore(updatedTaskObj)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Firestore task update error:', err);
          setSyncStatus('error');
          setSyncError('Error al actualizar tarea en Firestore');
        });
    }
  };

  const claimTask = (id: string, userToClaim?: UserProfile) => {
    const targetTask = tasks.find(t => t.id === id);
    const isUnassigned = !targetTask?.assignee || ['disponible', 'sin asignar', 'sin responsable'].includes(targetTask.assignee.trim().toLowerCase());
    if (!targetTask || !isUnassigned || !getPermissions(currentUser, targetTask).canClaimTask) { alert('Solo podés tomar tareas disponibles.'); return; }
    const targetUser = currentUser;
    void userToClaim;
    const now = new Date().toISOString();
    let claimedTaskObj: Task | undefined;

    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const newAuditEntries = [...(t.auditLog || [])];
        newAuditEntries.unshift({
          action: 'MODIFICADA',
          byUserName: targetUser.name,
          byUserId: targetUser.id,
          timestamp: now,
          details: `${targetUser.name} se hizo cargo de la tarea voluntariamente`,
        });
        const resTask: Task = {
          ...t,
          status: t.status === 'PENDIENTE' ? 'EN_PROCESO' : t.status,
          assignee: targetUser.name,
          assigneeId: targetUser.id,
          assigneeUid: firebaseUser?.uid || targetUser.uid,
          lastModifiedBy: targetUser.name,
          lastModifiedById: targetUser.id,
          updatedAt: now,
          auditLog: newAuditEntries,
        };
        claimedTaskObj = resTask;
        return resTask;
      })
    );
    apiClaimTask(id, targetUser);
    if (claimedTaskObj) {
      setSyncStatus('syncing');
      saveTaskToFirestore(claimedTaskObj)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Firestore claim task error:', err);
          setSyncStatus('error');
          setSyncError('Error al tomar tarea en Firestore');
        });
    }
  };

  const releaseTask = (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask || !getPermissions(currentUser, targetTask).canReleaseTask) { alert('No tenés permiso para liberar esta tarea.'); return; }
    const now = new Date().toISOString();
    let releasedTaskObj: Task | undefined;

    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const prevAssignee = t.assignee;
        const newAuditEntries = [...(t.auditLog || [])];
        newAuditEntries.unshift({
          action: 'MODIFICADA',
          byUserName: currentUser.name,
          byUserId: currentUser.id,
          timestamp: now,
          details: `${prevAssignee || currentUser.name} dejó de hacerse cargo. La tarea vuelve a estar disponible para el equipo.`,
        });
        const resTask: Task = {
          ...t,
          assignee: '',
          assigneeId: undefined,
          assigneeUid: undefined,
          lastModifiedBy: currentUser.name,
          lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
          updatedAt: now,
          auditLog: newAuditEntries,
        };
        releasedTaskObj = resTask;
        return resTask;
      })
    );
    apiReleaseTask(id, currentUser);
    if (releasedTaskObj) {
      setSyncStatus('syncing');
      saveTaskToFirestore(releasedTaskObj)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Firestore release task error:', err);
          setSyncStatus('error');
          setSyncError('Error al liberar tarea en Firestore');
        });
    }
  };

  const deleteTask = (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask || !getPermissions(currentUser, targetTask).canDeleteTask) { alert('Solo Rodrigo puede eliminar tareas.'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    closeModal();
    apiDeleteTask(id);
    setSyncStatus('syncing');
    deleteTaskFromFirestore(id)
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn('Firestore delete task error:', err);
        setSyncStatus('error');
        setSyncError('Error al eliminar tarea en Firestore');
      });
  };

  const moveTaskStatus = (id: string, newStatus: TaskStatus): boolean => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const perms = getPermissions(currentUser, task);
    if (newStatus === 'RESUELTA' && !perms.canResolveTask) {
      alert(perms.restrictionReason || 'No tienes permiso para cerrar esta tarea.');
      return false;
    }
    if (task.status === 'RESUELTA' && newStatus !== 'RESUELTA' && !perms.canResolveTask) {
      alert(perms.restrictionReason || 'No tienes permiso para reabrir esta tarea.');
      return false;
    }
    if (newStatus === 'BLOQUEADA' && !perms.canBlockTask) {
      alert(perms.restrictionReason || 'No tenés permiso para bloquear esta tarea.');
      return false;
    }
    if (newStatus !== 'BLOQUEADA' && newStatus !== 'RESUELTA' && !perms.canEditTask) {
      alert(perms.restrictionReason || 'No tenés permiso para cambiar esta tarea.');
      return false;
    }
    if (!perms.canEditTask && !perms.canBlockTask) {
      alert(perms.restrictionReason || 'Tu perfil solo puede ver esta tarea.');
      return false;
    }

    const now = new Date().toISOString();
    let updatedTaskPayload: Partial<Task> = { status: newStatus };

    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;

        let resolvedAt = t.resolvedAt;
        let closedBy = t.closedBy;
        let closedById = t.closedById;
        const newAudit = [...(t.auditLog || [])];

        if (newStatus === 'RESUELTA' && t.status !== 'RESUELTA') {
          resolvedAt = now;
          closedBy = currentUser.name;
          closedById = currentUser.id;
          newAudit.unshift({
            action: 'RESUELTA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: 'Tarea cerrada y marcada como RESUELTA',
          });
        } else if (t.status === 'RESUELTA' && newStatus !== 'RESUELTA') {
          resolvedAt = undefined;
          closedBy = undefined;
          closedById = undefined;
          newAudit.unshift({
            action: 'REABIERTA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Reabierta a ${newStatus}`,
          });
        } else if (newStatus === 'BLOQUEADA' && t.status !== 'BLOQUEADA') {
          newAudit.unshift({
            action: 'BLOQUEADA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: 'Marcada como BLOQUEADA',
          });
        } else if (t.status === 'BLOQUEADA' && newStatus !== 'BLOQUEADA') {
          newAudit.unshift({
            action: 'DESBLOQUEADA',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Desbloqueada y movida a ${newStatus}`,
          });
        } else {
          newAudit.unshift({
            action: 'ESTADO_CAMBIADO',
            byUserName: currentUser.name,
            byUserId: currentUser.id,
            timestamp: now,
            details: `Estado cambiado de ${t.status} a ${newStatus}`,
          });
        }

        const updated = {
          ...t,
          status: newStatus,
          lastModifiedBy: currentUser.name,
          lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
          updatedAt: now,
          resolvedAt,
          closedBy,
          closedById,
          auditLog: newAudit,
        };
        updatedTaskPayload = updated;
        return updated;
      })
    );

    apiUpdateTask(id, updatedTaskPayload);
    if (updatedTaskPayload) {
      setSyncStatus('syncing');
      saveTaskToFirestore(updatedTaskPayload as Task)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Firestore move status error:', err);
          setSyncStatus('error');
          setSyncError('Error al cambiar estado de tarea en Firestore');
        });
    }
    return true;
  };

  const toggleTaskResolved = (id: string): boolean => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    const perms = getPermissions(currentUser, task);
    if (!perms.canResolveTask) {
      alert(perms.restrictionReason || 'No tienes permiso para marcar o reabrir esta tarea.');
      return false;
    }
    const newStatus: TaskStatus = task.status === 'RESUELTA' ? 'EN_PROCESO' : 'RESUELTA';
    return moveTaskStatus(id, newStatus);
  };

  const toggleTaskBlocked = (id: string, reason?: string): boolean => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    const perms = getPermissions(currentUser, task);
    if (!perms.canBlockTask) {
      alert(perms.restrictionReason || 'No tienes permiso para bloquear o desbloquear esta tarea.');
      return false;
    }
    if (task.status === 'BLOQUEADA') {
      return moveTaskStatus(id, 'EN_PROCESO');
    } else {
      updateTask(id, {
        status: 'BLOQUEADA',
        blockReason: reason || 'Esperando validación de Dirección',
      });
      return true;
    }
  };

  const toggleFocus = (id: string): boolean => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    const perms = getPermissions(currentUser, task);
    if (!perms.canToggleFocus) {
      alert('Solo Dirección y Administración tienen permiso para modificar el Foco del Día.');
      return false;
    }
    const now = new Date().toISOString();
    let updatedFocus = false;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          updatedFocus = !t.inFocus;
          return {
            ...t,
            inFocus: updatedFocus,
            lastModifiedBy: currentUser.name,
            lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
            updatedAt: now,
          };
        }
        return t;
      })
    );
    apiUpdateTask(id, { inFocus: updatedFocus, lastModifiedBy: currentUser.name, lastModifiedById: currentUser.id });
    const focusTask = tasks.find(t => t.id === id);
    if (focusTask) {
      setSyncStatus('syncing');
      saveTaskToFirestore({
        ...focusTask,
        inFocus: updatedFocus,
        lastModifiedBy: currentUser.name,
        lastModifiedById: currentUser.id,
          lastModifiedByUid: firebaseUser?.uid || currentUser.uid,
        updatedAt: now,
      })
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Firestore focus error:', err);
          setSyncStatus('error');
          setSyncError('Error al actualizar foco en Firestore');
        });
    }
    return true;
  };

  const resetTasks = () => {
    setTasks(INITIAL_TASKS);
    setUsers(INITIAL_USERS);
    setNotes({});
    setCurrentUserId('user-rodrigo');
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({}));
      localStorage.setItem(AUTH_USER_KEY, 'user-rodrigo');
    } catch (e) {
      console.warn(e);
    }
    apiSyncAll({ tasks: INITIAL_TASKS, users: INITIAL_USERS, notes: {} });
    setSyncStatus('syncing');
    Promise.all([
      ...INITIAL_TASKS.map(t => saveTaskToFirestore(t)),
    ])
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn('Firestore reset error:', err);
        setSyncStatus('error');
      });
  };

  // Computations
  const todayStr = getTodayDateString();

  const focusTasks = [...tasks.filter(t => t.inFocus && t.status !== 'RESUELTA')].sort((a, b) => {
    const scoreA = calculateTaskUrgencyScore(a, todayStr);
    const scoreB = calculateTaskUrgencyScore(b, todayStr);
    return scoreB - scoreA;
  });

  const blockedTasks = sortTasksByPriorityAndTime(
    tasks.filter(t => t.status === 'BLOQUEADA')
  );

  const todayTasks = sortTasksByPriorityAndTime(
    tasks.filter(t => t.dueDate === todayStr && t.status !== 'RESUELTA')
  );

  const overdueTasks = sortTasksByPriorityAndTime(
    tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'RESUELTA')
  );

  const upcomingTasks = sortTasksByPriorityAndTime(
    tasks.filter(t => t.dueDate && t.dueDate > todayStr && t.status !== 'RESUELTA')
  );

  const resolvedTasks = [...tasks.filter(t => t.status === 'RESUELTA')].sort((a, b) => {
    const timeA = a.resolvedAt || a.updatedAt;
    const timeB = b.resolvedAt || b.updatedAt;
    return timeB.localeCompare(timeA);
  });

  const stats = {
    foco: focusTasks.length,
    bloqueadas: blockedTasks.length,
    enCurso: tasks.filter(t => t.status === 'EN_PROCESO').length,
    resueltas: resolvedTasks.length,
    vencimientos: todayTasks.length + overdueTasks.length,
  };

  const activeEditingTask = editingTask ? (tasks.find(t => t.id === editingTask.id) || editingTask) : null;

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
        deleteNote,
        activeView,
        setActiveView,
        isModalOpen,
        editingTask: activeEditingTask,
        defaultModalStatus,
        openCreateModal,
        openEditModal,
        closeModal,
        addTask,
        updateTask,
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
