export type Priority = 'BAJA' | 'NORMAL' | 'ALTA' | 'CRITICA';

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'BLOQUEADA' | 'RESUELTA';

export type AccessLevel =
  | 'Administración total'
  | 'Dirección'
  | 'Coordinación'
  | 'Colaborador de Dirección'
  | 'Colaborador médico'
  | 'Responsable de Sistemas';

/** Profile stored at /users/{uid}. appUserId keeps compatibility with existing task data. */
export interface UserProfile {
  id: string; // Compatibility alias for appUserId.
  appUserId?: string;
  uid?: string;
  email?: string;
  name: string;
  shortName: string;
  role: string;
  accessLevel: AccessLevel;
  active: boolean;
}

export interface TaskAuditEntry {
  action: 'CREADA' | 'MODIFICADA' | 'ESTADO_CAMBIADO' | 'BLOQUEADA' | 'DESBLOQUEADA' | 'RESUELTA' | 'REABIERTA';
  byUserName: string;
  byUserId: string;
  timestamp: string;
  details?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  dueTime?: string;
  assignee: string;
  assigneeId?: string;
  assigneeUid?: string;
  blockReason?: string;
  inFocus?: boolean;
  createdBy: string;
  createdById?: string;
  createdByUid?: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedById?: string;
  lastModifiedByUid?: string;
  updatedAt: string;
  closedBy?: string;
  closedById?: string;
  closedByUid?: string;
  resolvedAt?: string;
  /** Mirrors a closed task so the completed state is explicit in Firestore. */
  isDone?: boolean;
  auditLog?: TaskAuditEntry[];
}

export interface PersonNote {
  id: string;
  text: string;
  createdAt: string;
  color?: 'yellow' | 'blue' | 'slate';
  isDone?: boolean;
}
export type ViewType = 'inicio' | 'pizarra' | 'bloqueos' | 'vencimientos' | 'historial' | 'equipo';
