import { Task, UserProfile, PersonNote } from '../types';

export interface SharedDataResponse {
  tasks: Task[];
  users: UserProfile[];
  notes: Record<string, PersonNote[]>;
  lastUpdated: number;
}

export async function fetchSharedData(): Promise<SharedDataResponse | null> {
  try {
    const res = await fetch('/api/shared-data', {
      headers: { credentials: 'same-origin' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error fetching shared data, using local fallback:', err);
    return null;
  }
}

export async function apiCreateTask(task: Partial<Task>): Promise<{ task: Task; lastUpdated: number } | null> {
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error creating task on server:', err);
    return null;
  }
}

export async function apiUpdateTask(id: string, updates: Partial<Task>): Promise<{ task: Task; lastUpdated: number } | null> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error updating task on server:', err);
    return null;
  }
}

export async function apiDeleteTask(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Network error deleting task on server:', err);
    return false;
  }
}

export async function apiClaimTask(taskId: string, user: UserProfile): Promise<{ task: Task; lastUpdated: number } | null> {
  try {
    const res = await fetch('/api/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, user }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error claiming task on server:', err);
    return null;
  }
}

export async function apiReleaseTask(taskId: string, user?: UserProfile): Promise<{ task: Task; lastUpdated: number } | null> {
  try {
    const res = await fetch('/api/tasks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, user }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error releasing task on server:', err);
    return null;
  }
}

export async function apiUpdateUsers(users: UserProfile[]): Promise<boolean> {
  try {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Network error updating users on server:', err);
    return false;
  }
}

export async function apiAddNote(userId: string, note: PersonNote): Promise<Record<string, PersonNote[]> | null> {
  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, note }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.notes;
  } catch (err) {
    console.warn('Network error adding note on server:', err);
    return null;
  }
}

export async function apiDeleteNote(userId: string, noteId: string): Promise<Record<string, PersonNote[]> | null> {
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(userId)}/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.notes;
  } catch (err) {
    console.warn('Network error deleting note on server:', err);
    return null;
  }
}

export async function apiSyncAll(data: { tasks?: Task[]; users?: UserProfile[]; notes?: Record<string, PersonNote[]> }): Promise<SharedDataResponse | null> {
  try {
    const res = await fetch('/api/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Network error syncing all data with server:', err);
    return null;
  }
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export async function apiLogin(userId: string, pin: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      success: false,
      error: 'Error de conexión con el servidor. Verificá tu red.',
    };
  }
}

export async function apiVerifySession(token: string): Promise<{ success: boolean; valid: boolean; user?: UserProfile }> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return { success: false, valid: false };
    return await res.json();
  } catch {
    return { success: false, valid: false };
  }
}

export async function apiLogout(token?: string): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('Logout error:', err);
  }
}

export async function apiGetAllowedMembers(): Promise<UserProfile[] | null> {
  try {
    const res = await fetch('/api/auth/members');
    if (!res.ok) return null;
    const data = await res.json();
    return data.members || null;
  } catch {
    return null;
  }
}

