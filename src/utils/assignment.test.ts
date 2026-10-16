import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, UserProfile } from '../types';
import { hasDerivationPermission, isLeadershipProfile, isTaskAvailable, normalizedAccessLevel } from './assignment';
import { getPermissions } from './permissions';

const task = (overrides: Partial<Task> = {}): Pick<Task, 'assigneeUid' | 'assigneeId' | 'assignee'> => ({
  assignee: '',
  ...overrides,
});

test('reconoce tareas disponibles nuevas y legacy', () => {
  assert.equal(isTaskAvailable(task()), true);
  assert.equal(isTaskAvailable(task({ assigneeUid: undefined })), true);
  assert.equal(isTaskAvailable(task({ assigneeUid: '' })), true);
  assert.equal(isTaskAvailable(task({ assigneeId: 'legacy-residual' })), true);
  assert.equal(isTaskAvailable(task({ assignee: 'Disponible' })), true);
  assert.equal(isTaskAvailable(task({ assignee: 'Sin asignar' })), true);
  assert.equal(isTaskAvailable(task({ assignee: 'Sin responsable' })), true);
});

test('protege asignaciones legacy reales y asignaciones modernas', () => {
  assert.equal(isTaskAvailable(task({ assignee: 'Laura Figueroa' })), false);
  assert.equal(isTaskAvailable(task({ assigneeUid: 'firebase-laura', assignee: '' })), false);
});

test('un assigneeId residual no convierte una tarea disponible en propia', () => {
  const laura = profile('user-laura');
  const available = {
    id: 'task-residual',
    title: 'Disponible',
    status: 'PENDIENTE',
    priority: 'NORMAL',
    dueDate: '2026-10-16',
    assignee: '',
    assigneeId: 'user-laura',
    createdBy: 'Otra persona',
    createdByUid: 'firebase-other',
    createdAt: '2026-10-16T12:00:00.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z',
  } satisfies Task;
  assert.equal(getPermissions(laura, available).canEditTask, false);
  assert.equal(getPermissions(laura, available).canClaimTask, true);
});

const profile = (id: string, accessLevel?: UserProfile['accessLevel']): UserProfile => ({
  id,
  appUserId: id,
  uid: `firebase-${id}`,
  email: `${id}@example.test`,
  name: id,
  shortName: id,
  role: 'Equipo',
  accessLevel: accessLevel || 'Coordinación',
  active: true,
});

test('Nicolás puede derivar aunque el perfil legacy no tenga accessLevel', () => {
  const nicolas = profile('user-nicolas', undefined);
  assert.equal(hasDerivationPermission(nicolas), true);
  assert.equal(normalizedAccessLevel('user-nicolas', undefined), 'Dirección');
});

test('un usuario común no puede derivar', () => {
  assert.equal(hasDerivationPermission(profile('user-laura')), false);
});

test('Nico, Rodrigo y Noemí comparten la misma política de control total', () => {
  for (const id of ['user-nicolas', 'user-rodrigo', 'user-noemi']) {
    const user = profile(id);
    const permissions = getPermissions(user, {
      id: 'task-other',
      title: 'Ajena',
      status: 'EN_PROCESO',
      priority: 'NORMAL',
      dueDate: '2026-10-16',
      assignee: 'Laura',
      assigneeId: 'user-laura',
      assigneeUid: 'firebase-user-laura',
      createdBy: 'Laura',
      createdByUid: 'firebase-user-laura',
      createdAt: '2026-10-16T12:00:00.000Z',
      updatedAt: '2026-10-16T12:00:00.000Z',
    });
    assert.equal(isLeadershipProfile(user), true);
    assert.equal(permissions.canEditTask, true);
    assert.equal(permissions.canChangeAssignee, true);
    assert.equal(permissions.canBlockTask, true);
    assert.equal(permissions.canResolveTask, true);
    assert.equal(permissions.canDeleteTask, true);
  }
});

test('una etiqueta de acceso no otorga control total a un usuario común', () => {
  const common = profile('user-laura', 'Administración total');
  const permissions = getPermissions(common, {
    id: 'task-other',
    title: 'Ajena',
    status: 'EN_PROCESO',
    priority: 'NORMAL',
    dueDate: '2026-10-16',
    assignee: 'Noemí',
    assigneeId: 'user-noemi',
    assigneeUid: 'firebase-user-noemi',
    createdBy: 'Noemí',
    createdByUid: 'firebase-user-noemi',
    createdAt: '2026-10-16T12:00:00.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z',
  });
  assert.equal(isLeadershipProfile(common), false);
  assert.equal(permissions.canEditTask, false);
  assert.equal(permissions.canChangeAssignee, false);
  assert.equal(permissions.canDeleteTask, false);
});
