import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-clinica-chutro-rules';
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

let environment;

const baseTask = {
  id: 'task-1',
  title: 'Validación local',
  status: 'PENDIENTE',
  priority: 'NORMAL',
  assigneeUid: null,
  assigneeId: 'legacy-residual',
  assignee: 'Disponible',
  createdAt: '2026-10-05T12:00:00.000Z',
  createdByUid: 'uid-creator',
  lastModifiedBy: 'Creador',
  lastModifiedById: 'user-creator',
  lastModifiedByUid: 'uid-creator',
  updatedAt: '2026-10-05T12:00:00.000Z',
  auditLog: [],
};

async function seed(data = baseTask) {
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/uid-claimant'), {
      active: true,
      appUserId: 'user-laura',
      name: 'Laura',
    });
    await setDoc(doc(db, 'users/uid-nicolas'), {
      active: true,
      appUserId: 'user-nicolas',
      name: 'Nicolás',
    });
    await setDoc(doc(db, 'users/uid-rodrigo'), {
      active: true,
      appUserId: 'user-rodrigo',
      name: 'Rodrigo',
    });
    await setDoc(doc(db, 'users/uid-target'), {
      active: true,
      appUserId: 'user-noemi',
      name: 'Noemí',
    });
    await setDoc(doc(db, 'users/uid-intruder'), {
      active: true,
      appUserId: 'user-gabriela',
      name: 'Gabriela',
    });
    await setDoc(doc(db, 'tasks/task-1'), data);
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8088, rules },
  });
});

after(async () => {
  await environment.cleanup();
});

function createdTask(id, uid, appUserId, name) {
  return {
    ...baseTask,
    id,
    assigneeUid: null,
    assigneeId: null,
    assignee: '',
    createdByUid: uid,
    createdById: appUserId,
    createdBy: name,
    lastModifiedBy: name,
    lastModifiedById: appUserId,
    lastModifiedByUid: uid,
  };
}

function assignmentPatch(uid, appUserId, name, timestamp = '2026-10-16T12:10:00.000Z') {
  return {
    assigneeUid: uid,
    assigneeId: appUserId,
    assignee: name,
    status: 'EN_PROCESO',
    priority: 'NORMAL',
    lastModifiedBy: name,
    lastModifiedById: appUserId,
    lastModifiedByUid: uid,
    updatedAt: timestamp,
    auditLog: [{ action: 'DERIVADA', byUserName: name }],
  };
}

async function seedAssignedToTarget() {
  await seed({
    ...baseTask,
    assigneeUid: 'uid-target',
    assigneeId: 'user-noemi',
    assignee: 'Noemí',
    status: 'EN_PROCESO',
  });
}

async function leadershipCanModify(uid, appUserId, name) {
  await environment.clearFirestore();
  await seedAssignedToTarget();
  const db = environment.authenticatedContext(uid).firestore();
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-1'), {
    title: `Editada por ${name}`,
    lastModifiedBy: name,
    lastModifiedById: appUserId,
    lastModifiedByUid: uid,
    updatedAt: '2026-10-16T13:00:00.000Z',
  }));
}

async function leadershipCanDelegate(uid, appUserId, name) {
  await environment.clearFirestore();
  await seedAssignedToTarget();
  const db = environment.authenticatedContext(uid).firestore();
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-1'), {
    ...assignmentPatch('uid-claimant', 'user-laura', 'Laura'),
    lastModifiedBy: name,
    lastModifiedById: appUserId,
    lastModifiedByUid: uid,
  }));
}

test('1. usuario activo normal crea una tarea disponible', async () => {
  await environment.clearFirestore();
  await seed();
  const db = environment.authenticatedContext('uid-claimant').firestore();
  await assertSucceeds(setDoc(doc(db, 'tasks/task-created'), createdTask(
    'task-created', 'uid-claimant', 'user-laura', 'Laura',
  )));
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-created'), {
    title: 'Actualizada por su creadora',
    lastModifiedBy: 'Laura',
    lastModifiedById: 'user-laura',
    lastModifiedByUid: 'uid-claimant',
    updatedAt: '2026-10-16T12:06:00.000Z',
  }));
});

test('2. usuario autorizado puede tomar una tarea disponible', async () => {
  await environment.clearFirestore();
  await seed();
  const db = environment.authenticatedContext('uid-claimant').firestore();
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-1'), {
    assigneeUid: 'uid-claimant',
    assigneeId: 'user-laura',
    assignee: 'Laura',
    status: 'EN_PROCESO',
    priority: 'NORMAL',
    lastModifiedBy: 'Laura',
    lastModifiedById: 'user-laura',
    lastModifiedByUid: 'uid-claimant',
    updatedAt: '2026-10-05T12:05:00.000Z',
    auditLog: [{ action: 'MODIFICADA', byUserName: 'Laura' }],
  }));
  const saved = await assertSucceeds(getDoc(doc(db, 'tasks/task-1')));
  if (saved.data()?.assigneeUid !== 'uid-claimant') throw new Error('La asignación no quedó persistida.');
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-1'), {
    title: 'Trabajo propio actualizado',
    lastModifiedBy: 'Laura',
    lastModifiedById: 'user-laura',
    lastModifiedByUid: 'uid-claimant',
    updatedAt: '2026-10-16T12:06:00.000Z',
  }));
});

test('3. dos usuarios no pueden tomar la misma tarea', async () => {
  await environment.clearFirestore();
  await seed();
  const claimantDb = environment.authenticatedContext('uid-claimant').firestore();
  const intruderDb = environment.authenticatedContext('uid-intruder').firestore();
  const results = await Promise.allSettled([
    updateDoc(doc(claimantDb, 'tasks/task-1'), assignmentPatch('uid-claimant', 'user-laura', 'Laura')),
    updateDoc(doc(intruderDb, 'tasks/task-1'), assignmentPatch('uid-intruder', 'user-gabriela', 'Gabriela')),
  ]);
  if (results.filter(result => result.status === 'fulfilled').length !== 1) {
    throw new Error('La carrera de asignación no produjo exactamente un ganador.');
  }
  const snapshot = await assertSucceeds(getDoc(doc(claimantDb, 'tasks/task-1')));
  if (!['uid-claimant', 'uid-intruder'].includes(snapshot.data()?.assigneeUid)) {
    throw new Error('La tarea no quedó asignada a uno de los dos usuarios.');
  }
});

test('4. Nico crea una tarea', async () => {
  await environment.clearFirestore();
  await seed();
  const db = environment.authenticatedContext('uid-nicolas').firestore();
  await assertSucceeds(setDoc(doc(db, 'tasks/task-nico'), createdTask(
    'task-nico', 'uid-nicolas', 'user-nicolas', 'Nicolás',
  )));
});

test('5. Nico delega a cualquier usuario activo mediante appUserId', async () => {
  await environment.clearFirestore();
  await seed({
    ...baseTask,
    assigneeUid: 'uid-nicolas',
    assigneeId: 'user-nicolas',
    assignee: 'Nicolás',
    status: 'EN_PROCESO',
  });
  const db = environment.authenticatedContext('uid-nicolas').firestore();
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-1'), {
    ...assignmentPatch('uid-target', 'user-noemi', 'Noemí'),
    lastModifiedBy: 'Nicolás',
    lastModifiedById: 'user-nicolas',
    lastModifiedByUid: 'uid-nicolas',
  }));
  const saved = await assertSucceeds(getDoc(doc(db, 'tasks/task-1')));
  if (saved.data()?.assigneeId !== 'user-noemi' || saved.data()?.assigneeUid !== 'uid-target') {
    throw new Error('La derivación no quedó persistida con appUserId y UID.');
  }
});

test('6. Nico modifica una tarea ajena', async () => {
  await leadershipCanModify('uid-nicolas', 'user-nicolas', 'Nicolás');
});

test('7. Rodrigo delega a cualquier usuario activo', async () => {
  await leadershipCanDelegate('uid-rodrigo', 'user-rodrigo', 'Rodrigo');
});

test('8. Rodrigo modifica una tarea ajena', async () => {
  await leadershipCanModify('uid-rodrigo', 'user-rodrigo', 'Rodrigo');
});

test('9. Noemí delega a cualquier usuario activo', async () => {
  await leadershipCanDelegate('uid-target', 'user-noemi', 'Noemí');
});

test('10. Noemí modifica una tarea ajena', async () => {
  await leadershipCanModify('uid-target', 'user-noemi', 'Noemí');
});

test('11. usuario no autorizado no puede modificar una tarea ajena', async () => {
  await environment.clearFirestore();
  await seed({
    ...baseTask,
    assigneeUid: 'uid-target',
    assigneeId: 'user-noemi',
    assignee: 'Noemí',
    status: 'EN_PROCESO',
  });
  const db = environment.authenticatedContext('uid-intruder').firestore();
  await assertFails(updateDoc(doc(db, 'tasks/task-1'), {
    title: 'Cambio no autorizado',
    lastModifiedBy: 'Gabriela',
    lastModifiedById: 'user-gabriela',
    lastModifiedByUid: 'uid-intruder',
    updatedAt: '2026-10-05T12:15:00.000Z',
  }));
});

test('12. Firestore rechaza las mismas identidades de asignación que el frontend', async () => {
  await environment.clearFirestore();
  await seedAssignedToTarget();
  const db = environment.authenticatedContext('uid-nicolas').firestore();
  await assertFails(updateDoc(doc(db, 'tasks/task-1'), {
    ...assignmentPatch('uid-claimant', 'user-noemi', 'Nombre inconsistente'),
    lastModifiedBy: 'Nicolás',
    lastModifiedById: 'user-nicolas',
    lastModifiedByUid: 'uid-nicolas',
  }));

  await environment.clearFirestore();
  await seed({
    ...baseTask,
    assigneeUid: 'uid-claimant',
    assigneeId: 'user-laura',
    assignee: 'Laura',
    status: 'EN_PROCESO',
  });
  const ownerDb = environment.authenticatedContext('uid-claimant').firestore();
  await assertFails(updateDoc(doc(ownerDb, 'tasks/task-1'), {
    title: 'Cambio colado durante liberación',
    assigneeUid: null,
    assigneeId: null,
    assignee: '',
    lastModifiedBy: 'Laura',
    lastModifiedById: 'user-laura',
    lastModifiedByUid: 'uid-claimant',
    updatedAt: '2026-10-16T12:20:00.000Z',
  }));
});

test('13. assignee null es consistente en creación, listado y toma', async () => {
  await environment.clearFirestore();
  await seed();
  const db = environment.authenticatedContext('uid-claimant').firestore();
  await assertSucceeds(setDoc(doc(db, 'tasks/task-null'), createdTask(
    'task-null', 'uid-claimant', 'user-laura', 'Laura',
  )));
  const listed = await assertSucceeds(getDocs(collection(db, 'tasks')));
  const available = listed.docs.find(item => item.id === 'task-null');
  if (!available || available.data().assigneeUid !== null) {
    throw new Error('La tarea con assignee=null no apareció como disponible.');
  }
  await assertSucceeds(updateDoc(doc(db, 'tasks/task-null'), assignmentPatch(
    'uid-claimant', 'user-laura', 'Laura',
  )));
  const claimed = await assertSucceeds(getDoc(doc(db, 'tasks/task-null')));
  if (claimed.data()?.assigneeUid !== 'uid-claimant') {
    throw new Error('La tarea con assignee=null no pudo tomarse de forma consistente.');
  }
});
