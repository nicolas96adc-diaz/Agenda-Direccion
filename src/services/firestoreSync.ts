import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { db, testFirestoreConnection } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, UserProfile, PersonNote } from '../types';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'clinica-chutro';
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
export const TASKS_COLLECTION = 'tasks';
export const NOTES_COLLECTION = 'notes';
export const MEMORIAS_COLLECTION = 'memorias';
export const USERS_COLLECTION = 'users';

export interface FirestoreNoteDoc { id: string; userId: string; text: string; createdAt: string; color?: 'yellow' | 'blue' | 'slate'; }
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

function parseNoteColor(color?: string): 'yellow' | 'blue' | 'slate' { return color === 'blue' || color === 'slate' ? color : 'yellow'; }

/** Reads exactly /users/{auth.uid}; no client-side profile writes are provided. */
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<FirestoreUserProfile>;
  if (!data.uid || data.uid !== uid || !data.email || !data.appUserId || !data.name || !data.role || typeof data.active !== 'boolean') return null;
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

export function subscribeTasks(onUpdate: (tasks: Task[]) => void, onError?: (err: unknown) => void) {
  try { return onSnapshot(collection(db, TASKS_COLLECTION), snap => onUpdate(snap.docs.map(d => d.data() as Task)), err => { console.warn('Firestore tasks subscription error:', err); onError?.(err); }); }
  catch (err) { console.warn('Could not initialize tasks listener:', err); return () => {}; }
}

export function subscribeNotes(onUpdate: (notes: Record<string, PersonNote[]>) => void, onError?: (err: unknown) => void) {
  try { return onSnapshot(collection(db, NOTES_COLLECTION), snap => {
    const grouped: Record<string, PersonNote[]> = {};
    snap.forEach(d => { const data = d.data() as FirestoreNoteDoc; if (data?.userId && data.id) (grouped[data.userId] ||= []).push({ id:data.id, text:data.text, createdAt:data.createdAt, color:parseNoteColor(data.color) }); });
    Object.values(grouped).forEach(items => items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    onUpdate(grouped);
  }, err => { console.warn('Firestore notes subscription error:', err); onError?.(err); }); }
  catch (err) { console.warn('Could not initialize notes listener:', err); return () => {}; }
}

export async function saveTaskToFirestore(task: Task): Promise<boolean> {
  try { await setDoc(doc(db, TASKS_COLLECTION, task.id), task, { merge: true }); return true; }
  catch (error) { console.error('Error saving task to Firestore:', error); return false; }
}
export async function deleteTaskFromFirestore(taskId: string): Promise<boolean> {
  try { await deleteDoc(doc(db, TASKS_COLLECTION, taskId)); return true; }
  catch (error) { console.error('Error deleting task from Firestore:', error); return false; }
}
export async function addNoteToFirestore(userId: string, note: PersonNote): Promise<boolean> {
  try { await setDoc(doc(db, NOTES_COLLECTION, note.id), { id:note.id, userId, text:note.text, createdAt:note.createdAt || new Date().toISOString(), color:parseNoteColor(note.color) } as FirestoreNoteDoc); return true; }
  catch (error) { console.error('Error adding note to Firestore:', error); return false; }
}
export async function deleteNoteFromFirestore(noteId: string): Promise<boolean> {
  try { await deleteDoc(doc(db, NOTES_COLLECTION, noteId)); return true; }
  catch (error) { console.error('Error deleting note from Firestore:', error); return false; }
}

export async function fetchAllFromFirestore(): Promise<{ tasks: Task[]; users: UserProfile[]; notes: Record<string, PersonNote[]> } | null> {
  try {
    const [tasksSnap, notesSnap] = await Promise.all([getDocs(collection(db, TASKS_COLLECTION)), getDocs(collection(db, NOTES_COLLECTION))]);
    const notes: Record<string, PersonNote[]> = {};
    notesSnap.forEach(d => { const data=d.data() as FirestoreNoteDoc; if (data?.userId && data.id) (notes[data.userId] ||= []).push({ id:data.id,text:data.text,createdAt:data.createdAt,color:parseNoteColor(data.color) }); });
    return { tasks: tasksSnap.docs.map(d => d.data() as Task), users: [], notes };
  } catch (err) { console.warn('[Firestore] fetchAllFromFirestore error:', err); return null; }
}

/** Legacy task/note seed only. User profiles are never seeded or updated from a browser client. */
export async function seedFirestoreIfEmpty(initialTasks: Task[], initialNotes: Record<string, PersonNote[]>, _initialUsers: UserProfile[]): Promise<void> {
  try {
    await testFirestoreConnection();
    const tasksSnapshot = await getDocs(collection(db, TASKS_COLLECTION));
    if (tasksSnapshot.empty && initialTasks.length) await Promise.all(initialTasks.slice(0,50).map(task => setDoc(doc(db,TASKS_COLLECTION,task.id), task)));
    const notesSnapshot = await getDocs(collection(db, NOTES_COLLECTION));
    if (notesSnapshot.empty) await Promise.all(Object.entries(initialNotes).flatMap(([userId, items]) => items.map(n => addNoteToFirestore(userId,n))));
  } catch (err) { console.warn('[Firestore] Inicialización completada o saltada:', err); }
}
