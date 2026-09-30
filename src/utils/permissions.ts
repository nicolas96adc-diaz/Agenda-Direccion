import { UserProfile, Task } from '../types';

export interface TaskPermissions {
  canCreateTask: boolean;
  canManageTeam: boolean;
  canEditTask: boolean;
  canChangeAssignee: boolean;
  canResolveTask: boolean;
  canBlockTask: boolean;
  canDeleteTask: boolean;
  canToggleFocus: boolean;
  canAddCommentOrNote: boolean;
  canClaimTask: boolean;
  canReleaseTask: boolean;
  isReadOnly: boolean;
  restrictionReason?: string;
}

export function isTaskAssignedToUser(task: Task, user: UserProfile): boolean {
  if (task.assigneeUid && user.uid && task.assigneeUid === user.uid) return true;
  if (task.assigneeId && task.assigneeId === user.id) return true;
  const assignee = (task.assignee || '').trim().toLowerCase();
  return assignee === user.name.toLowerCase() || assignee === user.shortName.toLowerCase();
}

export function isTaskCreatedByUser(task: Task, user: UserProfile): boolean {
  if (task.createdByUid && user.uid && task.createdByUid === user.uid) return true;
  return task.createdById === user.id || (task.createdBy || '').toLowerCase() === user.name.toLowerCase();
}

export function isTaskAvailable(task?: Task | null): boolean {
  const assignee = (task?.assignee || '').trim().toLowerCase();
  return !assignee || assignee === 'disponible' || assignee === 'sin asignar' || assignee === 'sin responsable';
}

/** The three people who can administer work created by the whole team. */
export function isLeadershipUser(user: UserProfile): boolean {
  return ['user-nicolas', 'user-noemi', 'user-rodrigo'].includes(user.id);
}

/**
 * Assignment authority is configured on the active Firestore profile.
 * This deliberately stays separate from leadership-only actions such as
 * deleting tasks or notes.
 */
export function canAssignOrDeriveTasks(user: UserProfile): boolean {
  return user.active && ['Administración total', 'Dirección'].includes(user.accessLevel);
}

export function getPermissions(user: UserProfile, task?: Task | null): TaskPermissions {
  const isGroupMeeting = task?.kind === 'REUNION_GRUPO';
  const isMeetingOrganizer = !!task && !!user.uid && task.organizerUid === user.uid;
  if (isGroupMeeting) {
    const isLeadership = isLeadershipUser(user);
    return {
      canCreateTask: true,
      canManageTeam: false,
      canEditTask: isMeetingOrganizer || isLeadership,
      canChangeAssignee: false,
      canResolveTask: false,
      canBlockTask: false,
      canDeleteTask: isLeadership,
      canToggleFocus: false,
      canAddCommentOrNote: isMeetingOrganizer || isLeadership,
      canClaimTask: false,
      canReleaseTask: false,
      isReadOnly: !isMeetingOrganizer && !isLeadership,
      restrictionReason: !isMeetingOrganizer && !isLeadership ? 'Solo el organizador o la dirección puede modificar esta reunión.' : undefined,
    };
  }
  const isAdmin = user.id === 'user-rodrigo' || user.accessLevel === 'Administración total';
  const isOperations = user.id === 'user-nicolas' || user.id === 'user-noemi';
  const isAssignedToUser = !!task && isTaskAssignedToUser(task, user);
  const isOwnAvailableTask = !!task && isTaskAvailable(task) && isTaskCreatedByUser(task, user);
  const ownsTask = isAssignedToUser || isOwnAvailableTask;
  const canEditOwn = isAdmin || isOperations || ownsTask;
  const canBlock = isAdmin || isOperations || ownsTask;
  const canResolve = isAdmin || isOperations || ownsTask;
  const canRelease = isAdmin || isOperations || ownsTask;

  return {
    canCreateTask: true,
    canManageTeam: false,
    canEditTask: canEditOwn,
    canChangeAssignee: canAssignOrDeriveTasks(user),
    canResolveTask: canResolve,
    canBlockTask: canBlock,
    canDeleteTask: isLeadershipUser(user),
    canToggleFocus: isAdmin || isOperations,
    canAddCommentOrNote: canEditOwn,
    canClaimTask: !task || isTaskAvailable(task),
    canReleaseTask: canRelease,
    isReadOnly: !!task && !canEditOwn && !canBlock && !canResolve,
    restrictionReason:
      task && !canEditOwn && !canBlock && !canResolve
        ? 'Solo podés editar y bloquear tareas propias.'
        : undefined,
  };
}

function isAdminForUser(user: UserProfile): boolean {
  return user.id === 'user-rodrigo' || user.accessLevel === 'Administración total';
}

