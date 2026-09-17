import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, UserProfile, PersonNote } from '../types';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'clinica-chutro';
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
export const TASKS_COLLECTION = 'tasks';
export const NOTES_COLLECTION = 'notes';
export const MEMORIAS_COLLECTION = 'memorias';
export const USERS_COLLECTION = 'users';

export interface FirestoreNoteDoc {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  color?: 'yellow' | 'blue' | 'slate';
}

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  appUserId: string;
  name: string;
  role: string;
  active: boolean;
  shortName?: string;
  accessLevel?: UserProfile['accessLevel'];
}

function parseNoteColor(color?: string): 'yellow' | 'blue' | 'slate' {
  return color === 'blue' || color === 'slate' ? color : 'yellow';
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) {
        result[key] = stripUndefined(item);
      }
    }
    return result as T;
  }
  return value;
}

/** Reads exactly /users/{auth.uid}; user profiles are provisioned outside the browser client. */
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<FirestoreUserProfile>;
  if (
    !data.uid ||
    data.uid !== uid ||
    !data.email ||
    !data.appUserId ||
    !data.name ||
    !data.role ||
    typeof data.active !== 'boolean'
  ) {
    return null;
  }

  return {
    id: data.appUserId,
    appUserId: data.appUserId,
    uid: data.uid,
    email: data.email,
    name: data.name,
    shortName: data.shortName || data.name.split(' ')[0],
    role: data.role,
    accessLevel: data.accessLevel || 'Coordinación',
    active: data.active,
  };
}

export function subscribeTasks(
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: unknown) => void
) {
  try {
    return onSnapshot(
      collection(db, TASKS_COLLECTION),
      snapshot => {
        const tasks = snapshot.docs.map(item => {
          const data = item.data() as Task;
          return { ...data, id: data.id || item.id };
        });
        onUpdate(tasks);
      },
      error => {
        console.warn('Firestore tasks subscription error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.warn('Could not initialize tasks listener:', error);
    return () => {};
  }
}

export function subscribeNotes(
  onUpdate: (notes: Record<string, PersonNote[]>) => void,
  onError?: (err: unknown) => void
) {
  try {
    return onSnapshot(
      collection(db, NOTES_COLLECTION),
      snapshot => {
        const grouped: Record<string, PersonNote[]> = {};
        snapshot.forEach(item => {
          const data = item.data() as FirestoreNoteDoc;
          if (!data?.userId) return;
          const id = data.id || item.id;
          (grouped[data.userId] ||= []).push({
            id,
            text: data.text || '',
            createdAt: data.createdAt || new Date(0).toISOString(),
            color: parseNoteColor(data.color),
          });
        });
        Object.values(grouped).forEach(items =>
          items.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        onUpdate(grouped);
      },
      error => {
        console.warn('Firestore notes subscription error:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.warn('Could not initialize notes listener:', error);
    return () => {};
  }
}

/** Replaces the full task document so removed optional fields really disappear. */
export async function saveTaskToFirestore(task: Task): Promise<boolean> {
  try {
    const cleanTask = stripUndefined(task);
    await setDoc(doc(db, TASKS_COLLECTION, task.id), cleanTask as any);
    return true;
  } catch (error) {
    console.error('Error saving task to Firestore:', error);
    return false;
  }
}

export async function deleteTaskFromFirestore(taskId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    return true;
  } catch (error) {
    console.error('Error deleting task from Firestore:', error);
    return false;
  }
}

export async function addNoteToFirestore(userId: string, note: PersonNote): Promise<boolean> {
  try {
    const payload: FirestoreNoteDoc = {
      id: note.id,
      userId,
      text: note.text,
      createdAt: note.createdAt || new Date().toISOString(),
      color: parseNoteColor(note.color),
    };
    await setDoc(doc(db, NOTES_COLLECTION, note.id), payload);
    return true;
  } catch (error) {
    console.error('Error adding note to Firestore:', error);
    return false;
  }
}

export async function deleteNoteFromFirestore(noteId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, NOTES_COLLECTION, noteId));
    return true;
  } catch (error) {
    console.error('Error deleting note from Firestore:', error);
    return false;
  }
}

export async function fetchAllFromFirestore(): Promise<{
  tasks: Task[];
  users: UserProfile[];
  notes: Record<string, PersonNote[]>;
} | null> {
  try {
    const [tasksSnapshot, notesSnapshot] = await Promise.all([
      getDocs(collection(db, TASKS_COLLECTION)),
      getDocs(collection(db, NOTES_COLLECTION)),
    ]);

    const tasks = tasksSnapshot.docs.map(item => {
      const data = item.data() as Task;
      return { ...data, id: data.id || item.id };
    });

    const notes: Record<string, PersonNote[]> = {};
    notesSnapshot.forEach(item => {
      const data = item.data() as FirestoreNoteDoc;
      if (!data?.userId) return;
      const id = data.id || item.id;
      (notes[data.userId] ||= []).push({
        id,
        text: data.text || '',
        createdAt: data.createdAt || new Date(0).toISOString(),
        color: parseNoteColor(data.color),
      });
    });

    Object.values(notes).forEach(items =>
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );

    return { tasks, users: [], notes };
  } catch (error) {
    console.warn('[Firestore] fetchAllFromFirestore error:', error);
    return null;
  }
}
