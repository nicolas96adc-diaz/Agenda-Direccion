import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { INITIAL_USERS } from './src/data/users';
import { Task, UserProfile, PersonNote } from './src/types';

interface SharedStorage {
  tasks: Task[];
  users: UserProfile[];
  notes: Record<string, PersonNote[]>;
  lastUpdated: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'app_storage.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// In-memory state cache
let storage: SharedStorage = {
  tasks: [],
  users: INITIAL_USERS,
  notes: {},
  lastUpdated: Date.now(),
};

function loadStorageFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        storage = {
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
          notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
          lastUpdated: typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : Date.now(),
        };
        return;
      }
    }
  } catch (err) {
    console.error('Error loading shared storage from disk:', err);
  }

  // If file doesn't exist or failed to load, initialize with defaults and save
  saveStorageToDisk();
}

function saveStorageToDisk() {
  storage.lastUpdated = Date.now();
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(storage, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error persisting shared storage to disk:', err);
  }
}

// Secure server-side salted PIN hashes (never stored in plain text)
const PIN_SALT = 'chutro_salt_';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`${PIN_SALT}${pin.trim()}`).digest('hex');
}

const MEMBER_PIN_HASHES: Record<string, string> = {
  'user-nicolas': '84191c9cf4e428b8e9ada78beed2d08e96c9edb988e0d988c2446b7b64091270',
  'user-rodrigo': 'b4e04aadd37bbf5379bd40d2387c4c16eee5f32db1d7f8dc4341a38c7b226e63',
  'user-noemi': 'e5ad0dd84bd62262c278524682592814cb35347ec4835bfe225d1600f71df67b',
  'user-sebastian': 'db44f67c07b7828c930b6522a5377d684c90f0a79bf99335e34b0eb1cdd8c006',
  'user-yasku': 'fa0bc825e3f5b1f90383b5ffc8093315bc2b5f6e4a482e479d7377e54ede3ebb',
  'user-lora': 'ba2c752fb8faa645aefb56ed3fd3595a3cbf229e5374d4f3114b48a7f8350d8b',
  'user-laura': '9d93c9828cec27af7309288e5fdf84e872dd0f9ae5ec78c45bb03c919310e5fb',
  'user-gabriela': '36199e10753b451dc692ad93745a22b497c58330a2075d4f3a374efc256b04e4',
};

const ALIAS_PIN_HASHES: Record<string, string> = {
  nicolas: '84191c9cf4e428b8e9ada78beed2d08e96c9edb988e0d988c2446b7b64091270',
  rodrigo: 'b4e04aadd37bbf5379bd40d2387c4c16eee5f32db1d7f8dc4341a38c7b226e63',
  noemi: 'e5ad0dd84bd62262c278524682592814cb35347ec4835bfe225d1600f71df67b',
  sebastian: 'db44f67c07b7828c930b6522a5377d684c90f0a79bf99335e34b0eb1cdd8c006',
  agustin: 'fa0bc825e3f5b1f90383b5ffc8093315bc2b5f6e4a482e479d7377e54ede3ebb',
  yasku: 'fa0bc825e3f5b1f90383b5ffc8093315bc2b5f6e4a482e479d7377e54ede3ebb',
  richard: 'ba2c752fb8faa645aefb56ed3fd3595a3cbf229e5374d4f3114b48a7f8350d8b',
  lora: 'ba2c752fb8faa645aefb56ed3fd3595a3cbf229e5374d4f3114b48a7f8350d8b',
  laura: '9d93c9828cec27af7309288e5fdf84e872dd0f9ae5ec78c45bb03c919310e5fb',
  gabriela: '36199e10753b451dc692ad93745a22b497c58330a2075d4f3a374efc256b04e4',
};

function verifyMemberPin(userId: string, pin: string): boolean {
  if (!pin) return false;
  const inputHash = hashPin(pin);
  if (MEMBER_PIN_HASHES[userId] && MEMBER_PIN_HASHES[userId] === inputHash) {
    return true;
  }
  const user = storage.users.find(u => u.id === userId);
  if (user) {
    const norm = user.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const [key, expectedHash] of Object.entries(ALIAS_PIN_HASHES)) {
      if (norm.includes(key) && expectedHash === inputHash) {
        return true;
      }
    }
  }
  return false;
}

const TEAM_EMAILS: Record<string, string> = {
  'user-rodrigo': 'rodrigo@clinicachutro.com',
  'user-nicolas': 'nicolas@clinicachutro.com',
  'user-noemi': 'noemi@clinicachutro.com',
  'user-laura': 'laura@clinicachutro.com',
  'user-gabriela': 'gabriela@clinicachutro.com',
  'user-sebastian': 'sebastian@clinicachutro.com',
  'user-lora': 'lora@clinicachutro.com',
  'user-yasku': 'yasku@clinicachutro.com',
};

const activeSessions = new Map<string, { userId: string; createdAt: number }>();

// Initial load
loadStorageFromDisk();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // Auth: Login with PIN (server verified, no PINs sent to client)
  app.post('/api/auth/login', (req, res) => {
    try {
      const { userId, pin } = req.body;
      if (!userId || !pin) {
        res.status(400).json({ success: false, error: 'Elegí tu nombre e ingresá tu PIN.' });
        return;
      }

      const isValid = verifyMemberPin(userId, pin);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'El PIN no es correcto. Revisalo e intentá de nuevo.',
        });
        return;
      }

      const user = storage.users.find(u => u.id === userId) || INITIAL_USERS.find(u => u.id === userId);
      const token = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      activeSessions.set(token, { userId, createdAt: Date.now() });

      res.json({
        success: true,
        token,
        user,
        firebaseEmail: TEAM_EMAILS[userId] || `${userId}@clinicachutro.com`,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error durante la autenticación' });
    }
  });

  // Auth: Verify existing session token
  app.post('/api/auth/verify', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || req.body.token;

      if (!token || !activeSessions.has(token)) {
        res.status(401).json({ success: false, valid: false });
        return;
      }

      const session = activeSessions.get(token)!;
      const user = storage.users.find(u => u.id === session.userId) || INITIAL_USERS.find(u => u.id === session.userId);

      res.json({
        success: true,
        valid: true,
        user,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error verificando sesión' });
    }
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || req.body.token;
      if (token) {
        activeSessions.delete(token);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  });

  // Auth: List of members allowed to log in (WITHOUT pins)
  app.get('/api/auth/members', (_req, res) => {
    const allowed = storage.users.map(u => ({
      id: u.id,
      name: u.name,
      shortName: u.shortName,
      role: u.role,
      accessLevel: u.accessLevel,
    }));
    res.json({ members: allowed });
  });

  // Firebase Configuration & Diagnostic endpoint
  app.get('/api/firebase-config', (_req, res) => {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      let baseConfig: any = {};
      if (fs.existsSync(configPath)) {
        baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      let projectId = baseConfig.projectId || 'clinica-chutro';
      let authDomain = baseConfig.authDomain || 'clinica-chutro.firebaseapp.com';
      let apiKey = baseConfig.apiKey || 'AIzaSyDTlcBc0Law5iRaRUaamBTn6bMFhzF40cc';
      let appId = baseConfig.appId || '1:654505421798:web:f273c2efbe42fe5fa30427';
      let storageBucket = baseConfig.storageBucket || 'clinica-chutro.firebasestorage.app';
      let messagingSenderId = baseConfig.messagingSenderId || '654505421798';
      let firestoreDatabaseId = baseConfig.firestoreDatabaseId || '(default)';

      res.json({
        success: true,
        config: {
          projectId,
          authDomain,
          apiKey,
          appId,
          storageBucket,
          messagingSenderId,
          firestoreDatabaseId,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error loading Firebase config' });
    }
  });

  app.post('/api/firebase-config', (req, res) => {
    try {
      const { apiKey, appId, projectId, authDomain, storageBucket, messagingSenderId } = req.body;
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      let baseConfig: any = {};
      if (fs.existsSync(configPath)) {
        baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      const updated = {
        ...baseConfig,
        projectId: projectId ? String(projectId).trim() : (baseConfig.projectId || 'clinica-chutro'),
        authDomain: authDomain ? String(authDomain).trim() : (baseConfig.authDomain || `${projectId || 'clinica-chutro'}.firebaseapp.com`),
        apiKey: apiKey ? String(apiKey).trim() : baseConfig.apiKey,
        appId: appId ? String(appId).trim() : baseConfig.appId,
        storageBucket: storageBucket ? String(storageBucket).trim() : (baseConfig.storageBucket || `${projectId || 'clinica-chutro'}.firebasestorage.app`),
        messagingSenderId: messagingSenderId ? String(messagingSenderId).trim() : baseConfig.messagingSenderId,
      };

      fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
      console.log('Firebase applet config updated on disk:', {
        projectId: updated.projectId,
        authDomain: updated.authDomain,
        appId: updated.appId,
        apiKeyPrefix: updated.apiKey ? updated.apiKey.substring(0, 8) + '...' : 'none',
      });

      res.json({ success: true, config: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Error updating Firebase config' });
    }
  });

  // 1. Get all shared data (tasks, users, notes)
  app.get('/api/shared-data', (_req, res) => {
    res.json({
      tasks: storage.tasks,
      users: storage.users,
      notes: storage.notes,
      lastUpdated: storage.lastUpdated,
    });
  });

  // 2. Full synchronization / batch push (used when client connects with cached state)
  app.post('/api/sync-all', (req, res) => {
    try {
      const { tasks, users, notes } = req.body;
      let modified = false;

      if (Array.isArray(tasks) && tasks.length > 0 && storage.tasks.length === 0) {
        storage.tasks = tasks;
        modified = true;
      }

      if (Array.isArray(users) && users.length > 0) {
        // Merge users
        storage.users = users;
        modified = true;
      }

      if (notes && typeof notes === 'object' && Object.keys(notes).length > 0 && Object.keys(storage.notes).length === 0) {
        storage.notes = notes;
        modified = true;
      }

      if (modified) {
        saveStorageToDisk();
      }

      res.json({
        tasks: storage.tasks,
        users: storage.users,
        notes: storage.notes,
        lastUpdated: storage.lastUpdated,
      });
    } catch (e) {
      res.status(500).json({ error: 'Error in sync-all', details: String(e) });
    }
  });

  // 3. Create task
  app.post('/api/tasks', (req, res) => {
    try {
      const task = req.body;
      if (!task || !task.title) {
        res.status(400).json({ error: 'Task title is required' });
        return;
      }

      const newTask: Task = {
        ...task,
        id: task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.tasks.unshift(newTask);
      saveStorageToDisk();

      res.status(201).json({ task: newTask, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error creating task', details: String(e) });
    }
  });

  // 4. Update task
  app.put('/api/tasks/:id', (req, res) => {
    try {
      const taskId = req.params.id;
      const updates = req.body;

      let found = false;
      storage.tasks = storage.tasks.map(t => {
        if (t.id === taskId) {
          found = true;
          return {
            ...t,
            ...updates,
            id: taskId, // Ensure ID does not change
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });

      if (!found) {
        // If not found, add it
        const newTask: Task = {
          ...updates,
          id: taskId,
          createdAt: updates.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.tasks.unshift(newTask);
      }

      saveStorageToDisk();
      const updatedTask = storage.tasks.find(t => t.id === taskId);
      res.json({ task: updatedTask, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error updating task', details: String(e) });
    }
  });

  // 5. Delete task
  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const taskId = req.params.id;
      storage.tasks = storage.tasks.filter(t => t.id !== taskId);
      saveStorageToDisk();
      res.json({ success: true, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error deleting task', details: String(e) });
    }
  });

  // 6. Claim task ("Me hago cargo")
  app.post('/api/tasks/claim', (req, res) => {
    try {
      const { taskId, user } = req.body;
      if (!taskId || !user) {
        res.status(400).json({ error: 'taskId and user are required' });
        return;
      }

      const now = new Date().toISOString();
      let claimedTask: Task | null = null;

      storage.tasks = storage.tasks.map(t => {
        if (t.id === taskId) {
          const auditLog = [...(t.auditLog || [])];
          auditLog.unshift({
            action: 'MODIFICADA',
            byUserName: user.name,
            byUserId: user.id,
            timestamp: now,
            details: `${user.name} se hizo cargo de la tarea voluntariamente`,
          });

          claimedTask = {
            ...t,
            status: t.status === 'PENDIENTE' ? 'EN_PROCESO' : t.status,
            assignee: user.name,
            assigneeId: user.id,
            lastModifiedBy: user.name,
            lastModifiedById: user.id,
            updatedAt: now,
            auditLog,
          };
          return claimedTask;
        }
        return t;
      });

      saveStorageToDisk();
      res.json({ task: claimedTask, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error claiming task', details: String(e) });
    }
  });

  // 7. Release task ("Dejar de hacerme cargo")
  app.post('/api/tasks/release', (req, res) => {
    try {
      const { taskId, user } = req.body;
      if (!taskId) {
        res.status(400).json({ error: 'taskId is required' });
        return;
      }

      const now = new Date().toISOString();
      let releasedTask: Task | null = null;

      storage.tasks = storage.tasks.map(t => {
        if (t.id === taskId) {
          const prevAssignee = t.assignee;
          const auditLog = [...(t.auditLog || [])];
          auditLog.unshift({
            action: 'MODIFICADA',
            byUserName: user?.name || 'Dirección',
            byUserId: user?.id || '',
            timestamp: now,
            details: `${prevAssignee || 'Responsable'} dejó de hacerse cargo. La tarea vuelve a estar disponible para el equipo.`,
          });

          releasedTask = {
            ...t,
            assignee: '',
            assigneeId: undefined,
            lastModifiedBy: user?.name || t.lastModifiedBy,
            lastModifiedById: user?.id || t.lastModifiedById,
            updatedAt: now,
            auditLog,
          };
          return releasedTask;
        }
        return t;
      });

      saveStorageToDisk();
      res.json({ task: releasedTask, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error releasing task', details: String(e) });
    }
  });

  // 8. Update users (e.g. active toggle)
  app.put('/api/users', (req, res) => {
    try {
      const { users } = req.body;
      if (Array.isArray(users) && users.length > 0) {
        storage.users = users;
        saveStorageToDisk();
      }
      res.json({ users: storage.users, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error updating users', details: String(e) });
    }
  });

  // 9. Add note to whiteboard
  app.post('/api/notes', (req, res) => {
    try {
      const { userId, note } = req.body;
      if (!userId || !note || !note.text) {
        res.status(400).json({ error: 'userId and note text are required' });
        return;
      }

      const userNotes = storage.notes[userId] || [];
      const newNote: PersonNote = {
        id: note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: note.text,
        createdAt: note.createdAt || new Date().toISOString(),
        color: note.color || 'yellow',
      };

      storage.notes[userId] = [newNote, ...userNotes];
      saveStorageToDisk();

      res.status(201).json({ notes: storage.notes, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error adding note', details: String(e) });
    }
  });

  // 10. Delete note from whiteboard
  app.delete('/api/notes/:userId/:noteId', (req, res) => {
    try {
      const { userId, noteId } = req.params;
      if (storage.notes[userId]) {
        storage.notes[userId] = storage.notes[userId].filter(n => n.id !== noteId);
        saveStorageToDisk();
      }
      res.json({ notes: storage.notes, lastUpdated: storage.lastUpdated });
    } catch (e) {
      res.status(500).json({ error: 'Error deleting note', details: String(e) });
    }
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clínica Chutro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
