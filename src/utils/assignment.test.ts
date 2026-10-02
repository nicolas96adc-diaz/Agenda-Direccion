import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, UserProfile } from '../types';
import { hasDerivationPermission, isTaskAvailable, normalizedAccessLevel } from './assignment';

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
