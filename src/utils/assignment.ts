import type { Task, UserProfile } from '../types';

const AVAILABLE_LEGACY_ASSIGNEES = new Set([
  '',
  'disponible',
  'sin asignar',
  'sin responsable',
]);

export const DERIVATION_APP_USER_IDS = new Set([
  'user-rodrigo',
  'user-nicolas',
  'user-noemi',
]);

export function hasCanonicalAssignee(task?: Pick<Task, 'assigneeUid'> | null): boolean {
  return Boolean(task?.assigneeUid?.trim());
}

/**
 * `assigneeUid` is authoritative. Older documents without it remain assigned
 * only when their visible legacy assignee contains a real name. A residual
 * `assigneeId` alone is not an assignment.
 */
export function isTaskAvailable(task?: Pick<Task, 'assigneeUid' | 'assignee' | 'assigneeId'> | null): boolean {
  if (hasCanonicalAssignee(task)) return false;
  return AVAILABLE_LEGACY_ASSIGNEES.has((task?.assignee || '').trim().toLocaleLowerCase());
}

export function hasDerivationPermission(user: UserProfile): boolean {
  return user.active && DERIVATION_APP_USER_IDS.has(user.appUserId || user.id);
}

export function normalizedAccessLevel(
  appUserId: string,
  accessLevel?: UserProfile['accessLevel'],
): UserProfile['accessLevel'] {
  if (appUserId === 'user-rodrigo') return 'Administración total';
  if (appUserId === 'user-nicolas' || appUserId === 'user-noemi') return 'Dirección';
  return accessLevel || 'Coordinación';
}
