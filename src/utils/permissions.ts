import { UserProfile, Task } from '../types';
import { hasDerivationPermission, isLeadershipProfile, isTaskAvailable as hasCanonicalAvailability } from './assignment';

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
  // `assigneeId` is only a compatibility field for documents created before
  // Firebase UID assignment. A visible name is never an authorization input.
  return !task.assigneeUid && !hasCanonicalAvailability(task) && !!task.assigneeId &&
    task.assigneeId === (user.appUserId || user.id);
}

export function isTaskCreatedByUser(task: Task, user: UserProfile): boolean {
  if (task.createdByUid && user.uid && task.createdByUid === user.uid) return true;
  return !task.createdByUid && task.createdById === (user.appUserId || user.id);
}

export function isTaskAvailable(task?: Task | null): boolean {
  return hasCanonicalAvailability(task);
}

/** The three people who can administer work created by the whole team. */
export function isLeadershipUser(user: UserProfile): boolean {
  return isLeadershipProfile(user);
}

/**
 * Assignment authority is configured on the active Firestore profile.
 * This deliberately stays separate from leadership-only actions such as
 * deleting tasks or notes.
 */
export function canAssignOrDeriveTasks(user: UserProfile): boolean {
  return hasDerivationPermission(user);
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
  const isLeadership = isLeadershipUser(user);
  const isAssignedToUser = !!task && isTaskAssignedToUser(task, user);
  const isOwnAvailableTask = !!task && isTaskAvailable(task) && isTaskCreatedByUser(task, user);
  const ownsTask = isAssignedToUser || isOwnAvailableTask;
  const canEditOwn = isLeadership || ownsTask;
  const canBlock = isLeadership || ownsTask;
  const canResolve = isLeadership || ownsTask;
  const canRelease = isLeadership || ownsTask;

  return {
    canCreateTask: true,
    canManageTeam: false,
    canEditTask: canEditOwn,
    canChangeAssignee: canAssignOrDeriveTasks(user),
    canResolveTask: canResolve,
    canBlockTask: canBlock,
    canDeleteTask: isLeadership,
    canToggleFocus: isLeadership,
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

