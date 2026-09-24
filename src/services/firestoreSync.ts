import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { MeetingAttendance, Task, UserProfile, PersonNote, PersonNoteEditableFields } from '../types';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'clinica-chutro';
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
export const TASKS_COLLECTION = 'tasks';
export const NOTES_COLLECTION = 'notes';
export const MEMORIAS_COLLECTION = 'memorias';
export const USERS_COLLECTION = 'users';
export const MEETING_ATTENDANCE_COLLECTION = 'meetingAttendance';

export interface FirestoreNoteDoc {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  color?: 'yellow' | 'blue' | 'slate';
  authorName?: string;
  authorUid?: string;
  isCompleted?: boolean;
}
export interface FirestoreMeetingAttendanceDoc extends MeetingAttendance {}
export interface FirestoreUserProfile { uid: string; email: string; appUserId: string; name: string; role: string; active: boolean; shortName?: string; accessLevel?: UserProfile['accessLevel']; }

function parseNoteColor(color?: string): 'yellow' | 'blue' | 'slate' { return color === 'blue' || color === 'slate' ? color : 'yellow'; }
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => stripUndefined(item)) as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) if (item !== undefined) result[key] = stripUndefined(item);
    return result as T;
  }
  return value;
}

/** Temporary diagnostic trace. Reads keep their existing behavior. */
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const primaryPath = `/users/${uid}`;
  
  console.info('[LOGIN_TRACE] PROFILE_READ_START', { primaryPath });

  const primarySnapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  const primaryExists = primarySnapshot.exists();
  console.info('[LOGIN_TRACE] PROFILE_PRIMARY_READ', { path: primaryPath, documentExists: primaryExists });

  const snapshot = primarySnapshot;

  if (!snapshot.exists()) {
    console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: profile_document_not_found', { attemptedPath: primaryPath, primaryExists });
    return null;
  }

  const data = snapshot.data() as Partial<FirestoreUserProfile>;
  const hasUid = Boolean(data.uid);
  const uidMatches = data.uid === uid;
  const hasEmail = Boolean(data.email);
  const hasAppUserId = Boolean(data.appUserId);
  const hasName = Boolean(data.name);
  const hasRole = Boolean(data.role);
  const hasBooleanActive = typeof data.active === 'boolean';
  console.info('[LOGIN_TRACE] PROFILE_DOCUMENT_AND_VALIDATIONS', {
    pathRead: primaryPath,
    documentExists: true,
    profileData: data,
    hasUid,
    uidMatches,
    hasEmail,
    hasAppUserId,
    hasName,
    hasRole,
    hasBooleanActive,
  });

  if (!hasUid || !uidMatches || !hasEmail || !hasAppUserId || !hasName || !hasRole || !hasBooleanActive) {
    console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: firestore_profile_shape_validation', { hasUid, uidMatches, hasEmail, hasAppUserId, hasName, hasRole, hasBooleanActive });
    return null;
  }

  const profile: UserProfile = {
    id: data.appUserId!,
    appUserId: data.appUserId!,
    uid: data.uid!,
    email: data.email!,
    name: data.name!,
    shortName: data.shortName || data.name!.split(' ')[0],
    role: data.role!,
    accessLevel: data.accessLevel || 'Coordinación',
    active: data.active!,
  };
  console.info('[LOGIN_TRACE] PROFILE_RESULT', { pathRead: primaryPath, profile });
  return profile;
}

export function subscribeTasks(onUpdate: (tasks: Task[]) => void, onError?: (err: unknown) => void) {
  try {
    return onSnapshot(collection(db, TASKS_COLLECTION), snapshot => {
      const tasks = snapshot.docs.map(item => { const data = item.data() as Task; return { ...data, id: data.id || item.id }; });
      onUpdate(tasks);
    }, error => { console.warn('Firestore tasks subscription error:', error); onError?.(error); });
  } catch (error) { console.warn('Could not initialize tasks listener:', error); return () => {}; }
}

export function subscribeNotes(onUpdate: (notes: Record<string, PersonNote[]>) => void, onError?: (err: unknown) => void) {
  try {
    return onSnapshot(collection(db, NOTES_COLLECTION), snapshot => {
      const grouped: Record<string, PersonNote[]> = {};
      snapshot.forEach(item => { const data = item.data() as FirestoreNoteDoc; if (!data?.userId) return; const id = data.id || item.id; (grouped[data.userId] ||= []).push({ id, text: data.text || '', createdAt: data.createdAt || new Date(0).toISOString(), color: parseNoteColor(data.color), authorName: data.authorName, authorUid: data.authorUid, isCompleted: data.isCompleted === true }); });
      Object.values(grouped).forEach(items => items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      onUpdate(grouped);
    }, error => { console.warn('Firestore notes subscription error:', error); onError?.(error); });
  } catch (error) { console.warn('Could not initialize tasks listener:', error); return () => {}; }
}

export function subscribeMeetingAttendance(onUpdate: (attendance: Record<string, MeetingAttendance[]>) => void, onError?: (err: unknown) => void) {
  try {
    return onSnapshot(collection(db, MEETING_ATTENDANCE_COLLECTION), snapshot => {
      const grouped: Record<string, MeetingAttendance[]> = {};
      snapshot.forEach(item => {
        const data = item.data() as Partial<FirestoreMeetingAttendanceDoc>;
        if (!data.meetingId || !data.attendeeUid || !data.attendeeName) return;
        (grouped[data.meetingId] ||= []).push({
          id: data.id || item.id,
          meetingId: data.meetingId,
          attendeeUid: data.attendeeUid,
          attendeeName: data.attendeeName,
          confirmedAt: data.confirmedAt || new Date(0).toISOString(),
        });
      });
      Object.values(grouped).forEach(items => items.sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt)));
      onUpdate(grouped);
    }, error => { console.warn('Firestore meeting attendance subscription error:', error); onError?.(error); });
  } catch (error) { console.warn('Could not initialize meeting attendance listener:', error); return () => {}; }
}

export async function saveTaskToFirestore(task: Task): Promise<boolean> { try { const cleanTask = stripUndefined(task); await setDoc(doc(db, TASKS_COLLECTION, task.id), cleanTask as any); return true; } catch (error) { console.error('Error saving task to Firestore:', error); return false; } }
export async function deleteTaskFromFirestore(taskId: string): Promise<boolean> { try { await deleteDoc(doc(db, TASKS_COLLECTION, taskId)); return true; } catch (error) { console.error('Error deleting task from Firestore:', error); return false; } }
export async function addNoteToFirestore(userId: string, note: PersonNote): Promise<boolean> { try { const payload: FirestoreNoteDoc = { id: note.id, userId, text: note.text, createdAt: note.createdAt || new Date().toISOString(), color: parseNoteColor(note.color), authorName: note.authorName, authorUid: note.authorUid, isCompleted: note.isCompleted === true }; await setDoc(doc(db, NOTES_COLLECTION, note.id), stripUndefined(payload) as FirestoreNoteDoc); return true; } catch (error) { console.error('Error adding note to Firestore:', error); return false; } }
export async function setNoteCompletedInFirestore(noteId: string, isCompleted: boolean): Promise<boolean> { try { await updateDoc(doc(db, NOTES_COLLECTION, noteId), { isCompleted }); return true; } catch (error) { console.error('Error updating note in Firestore:', error); return false; } }
export async function updateNoteInFirestore(noteId: string, updates: PersonNoteEditableFields): Promise<boolean> { try { await updateDoc(doc(db, NOTES_COLLECTION, noteId), { text: updates.text, color: parseNoteColor(updates.color) }); return true; } catch (error) { console.error('Error updating note in Firestore:', error); return false; } }
export async function deleteNoteFromFirestore(noteId: string): Promise<boolean> { try { await deleteDoc(doc(db, NOTES_COLLECTION, noteId)); return true; } catch (error) { console.error('Error deleting note from Firestore:', error); return false; } }
export async function confirmMeetingAttendance(attendance: MeetingAttendance): Promise<boolean> { try { await setDoc(doc(db, MEETING_ATTENDANCE_COLLECTION, attendance.id), attendance); return true; } catch (error) { console.error('Error confirming meeting attendance:', error); return false; } }
export async function cancelMeetingAttendance(attendanceId: string): Promise<boolean> { try { await deleteDoc(doc(db, MEETING_ATTENDANCE_COLLECTION, attendanceId)); return true; } catch (error) { console.error('Error cancelling meeting attendance:', error); return false; } }

export async function fetchAllFromFirestore(): Promise<{ tasks: Task[]; users: UserProfile[]; notes: Record<string, PersonNote[]>; attendance: Record<string, MeetingAttendance[]>; } | null> {
  try {
    const [tasksSnapshot, notesSnapshot, attendanceSnapshot] = await Promise.all([getDocs(collection(db, TASKS_COLLECTION)), getDocs(collection(db, NOTES_COLLECTION)), getDocs(collection(db, MEETING_ATTENDANCE_COLLECTION))]);
    const tasks = tasksSnapshot.docs.map(item => { const data = item.data() as Task; return { ...data, id: data.id || item.id }; });
    const notes: Record<string, PersonNote[]> = {};
    notesSnapshot.forEach(item => { const data = item.data() as FirestoreNoteDoc; if (!data?.userId) return; const id = data.id || item.id; (notes[data.userId] ||= []).push({ id, text: data.text || '', createdAt: data.createdAt || new Date(0).toISOString(), color: parseNoteColor(data.color), authorName: data.authorName, authorUid: data.authorUid, isCompleted: data.isCompleted === true }); });
    Object.values(notes).forEach(items => items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    const attendance: Record<string, MeetingAttendance[]> = {};
    attendanceSnapshot.forEach(item => {
      const data = item.data() as Partial<FirestoreMeetingAttendanceDoc>;
      if (!data.meetingId || !data.attendeeUid || !data.attendeeName) return;
      (attendance[data.meetingId] ||= []).push({ id: data.id || item.id, meetingId: data.meetingId, attendeeUid: data.attendeeUid, attendeeName: data.attendeeName, confirmedAt: data.confirmedAt || new Date(0).toISOString() });
    });
    Object.values(attendance).forEach(items => items.sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt)));
    return { tasks, users: [], notes, attendance };
  } catch (error) { console.warn('[Firestore] fetchAllFromFirestore error:', error); return null; }
}

