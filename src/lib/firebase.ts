import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, setDoc, Firestore } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  Auth,
} from 'firebase/auth';
import baseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseRuntimeConfig {
  projectId: string;
  authDomain: string;
  apiKey: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
  firestoreDatabaseId: string;
}

const LOCAL_STORAGE_KEY = 'clinica_chutro_firebase_config';

function sanitizeFirebaseFields(raw: {
  projectId?: string;
  authDomain?: string;
  apiKey?: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  firestoreDatabaseId?: string;
}): FirebaseRuntimeConfig {
  let projectId = raw.projectId || 'clinica-chutro';
  let authDomain = raw.authDomain || `${projectId}.firebaseapp.com`;
  let apiKey = raw.apiKey || 'AIzaSyDTlcBc0Law5iRaRUaamBTn6bMFhzF40cc';
  let appId = raw.appId || '1:654505421798:web:f273c2efbe42fe5fa30427';
  let storageBucket = raw.storageBucket || `${projectId}.firebasestorage.app`;
  let messagingSenderId = raw.messagingSenderId || '654505421798';
  let firestoreDatabaseId = raw.firestoreDatabaseId || '(default)';

  // Correct transposed environment variables if present
  if (appId && appId.includes('.firebasestorage.app')) {
    const wrongAppId = appId;
    appId = messagingSenderId && messagingSenderId.includes(':web:') ? messagingSenderId : '1:654505421798:web:f273c2efbe42fe5fa30427';
    storageBucket = wrongAppId;
  }
  if (storageBucket && /^\d+$/.test(storageBucket)) {
    messagingSenderId = storageBucket;
    storageBucket = `${projectId}.firebasestorage.app`;
  }
  if (messagingSenderId && messagingSenderId.includes(':web:')) {
    appId = messagingSenderId;
    messagingSenderId = '654505421798';
  }

  return {
    projectId,
    authDomain,
    apiKey,
    appId,
    storageBucket,
    messagingSenderId,
    firestoreDatabaseId,
  };
}

/**
 * Resolves the active Firebase configuration with strict precedence:
 * 1. Runtime overrides from localStorage (user configured in browser)
 * 2. Vite environment variables (VITE_FIREBASE_*)
 * 3. firebase-applet-config.json
 */
export function resolveFirebaseConfig(): FirebaseRuntimeConfig {
  let localOverride: Partial<FirebaseRuntimeConfig> = {};
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (raw) {
      localOverride = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read local Firebase config override:', e);
  }

  // Clear legacy invalid API keys or broken overrides
  const OLD_KEY = 'AIzaSyDhBTEzplg1X-1X8XXK_W7187nINqErato';
  if (localOverride.apiKey === OLD_KEY) {
    delete localOverride.apiKey;
    delete localOverride.appId;
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (_) {}
  }

  const rawConfig = {
    projectId:
      localOverride.projectId ||
      (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID ||
      baseAppletConfig.projectId ||
      'clinica-chutro',

    authDomain:
      localOverride.authDomain ||
      (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
      baseAppletConfig.authDomain ||
      'clinica-chutro.firebaseapp.com',

    apiKey:
      localOverride.apiKey ||
      baseAppletConfig.apiKey ||
      (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
      'AIzaSyDTlcBc0Law5iRaRUaamBTn6bMFhzF40cc',

    appId:
      localOverride.appId ||
      baseAppletConfig.appId ||
      (import.meta as any).env?.VITE_FIREBASE_APP_ID ||
      '1:654505421798:web:f273c2efbe42fe5fa30427',

    storageBucket:
      localOverride.storageBucket ||
      baseAppletConfig.storageBucket ||
      (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
      'clinica-chutro.firebasestorage.app',

    messagingSenderId:
      localOverride.messagingSenderId ||
      baseAppletConfig.messagingSenderId ||
      (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      '654505421798',

    firestoreDatabaseId:
      baseAppletConfig.firestoreDatabaseId ||
      (import.meta as any).env?.VITE_FIRESTORE_DATABASE_ID ||
      '(default)',
  };

  return sanitizeFirebaseFields(rawConfig);
}

export let currentConfig: FirebaseRuntimeConfig = resolveFirebaseConfig();

// Initialize or retrieve Firebase App instance
export function initFirebaseInstances(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  currentConfig = resolveFirebaseConfig();

  let existingApp: FirebaseApp | null = null;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    existingApp = existingApps[0];
  }

  const appInstance = existingApp || initializeApp({
    apiKey: currentConfig.apiKey,
    authDomain: currentConfig.authDomain,
    projectId: currentConfig.projectId,
    storageBucket: currentConfig.storageBucket,
    messagingSenderId: currentConfig.messagingSenderId,
    appId: currentConfig.appId,
  });

  const dbInstance = getFirestore(appInstance, currentConfig.firestoreDatabaseId || '(default)');
  const authInstance = getAuth(appInstance);

  return { app: appInstance, db: dbInstance, auth: authInstance };
}

const instances = initFirebaseInstances();
export let app: FirebaseApp = instances.app;
export let db: Firestore = instances.db;
export let auth: Auth = instances.auth;

// Log diagnosis on startup
console.info('🩺 [Firebase Runtime Config Diagnosis]:', {
  projectId: currentConfig.projectId,
  authDomain: currentConfig.authDomain,
  apiKeyPreview: currentConfig.apiKey
    ? `${currentConfig.apiKey.substring(0, 8)}...${currentConfig.apiKey.slice(-4)}`
    : 'NO_API_KEY_CONFIGURED',
  appId: currentConfig.appId || 'NO_APP_ID_CONFIGURED',
  firestoreDatabaseId: currentConfig.firestoreDatabaseId,
  appName: app.name,
  authTenantId: auth.tenantId,
});

/**
 * Returns snapshot of active Firebase configuration for diagnostics and UI inspection
 */
export function getFirebaseDiagnosticInfo() {
  return {
    projectId: currentConfig.projectId,
    authDomain: currentConfig.authDomain,
    appId: currentConfig.appId,
    apiKey: currentConfig.apiKey,
    apiKeyPreview: currentConfig.apiKey
      ? `${currentConfig.apiKey.substring(0, 8)}...${currentConfig.apiKey.slice(-4)}`
      : 'NO_API_KEY',
    storageBucket: currentConfig.storageBucket,
    firestoreDatabaseId: currentConfig.firestoreDatabaseId,
    appName: app.name,
  };
}

/**
 * Save new Firebase credentials to localStorage and sync to server
 */
export async function saveCustomFirebaseConfig(
  newConfig: Partial<FirebaseRuntimeConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const merged = { ...currentConfig, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    }

    // Sync to server so it updates firebase-applet-config.json
    try {
      await fetch('/api/firebase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
    } catch (e) {
      console.warn('Failed to sync updated Firebase config to backend:', e);
    }

    // Reinitialize in-memory instances
    const currentApps = getApps();
    for (const a of currentApps) {
      await deleteApp(a).catch(() => {});
    }

    const reinitialized = initFirebaseInstances();
    app = reinitialized.app;
    db = reinitialized.db;
    auth = reinitialized.auth;
    currentConfig = resolveFirebaseConfig();

    return { success: true };
  } catch (err: any) {
    console.error('Error updating Firebase config:', err);
    return { success: false, error: err.message || 'Error al guardar configuración' };
  }
}

/**
 * Clear custom overrides and revert to base configuration
 */
export async function resetCustomFirebaseConfig(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  const currentApps = getApps();
  for (const a of currentApps) {
    await deleteApp(a).catch(() => {});
  }
  const reinitialized = initFirebaseInstances();
  app = reinitialized.app;
  db = reinitialized.db;
  auth = reinitialized.auth;
  currentConfig = resolveFirebaseConfig();
}

// Official clinic team email mapping
export const TEAM_EMAILS: Record<string, string> = {
  'user-rodrigo': 'rodrigo@clinicachutro.com',
  'user-nicolas': 'nicolas.96.adc@gmail.com',
  'user-noemi': 'noemi@clinicachutro.com',
  'user-laura': 'laura@clinicachutro.com',
  'user-gabriela': 'gabriela@clinicachutro.com',
  'user-sebastian': 'sebastian@clinicachutro.com',
  'user-lora': 'lora@clinicachutro.com',
  'user-yasku': 'yasku@clinicachutro.com',
};

/**
 * Format password for Firebase Authentication (requires minimum 6 characters).
 */
export function getFirebaseAuthPassword(pin: string): string {
  const clean = pin.trim();
  if (clean.length < 6) {
    return `Chutro#${clean}`;
  }
  return clean;
}

export interface FirebaseAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  rawMessage?: string;
  uid?: string;
  email: string;
  diagnostic: {
    projectId: string;
    authDomain: string;
    appId: string;
    apiKeyPreview: string;
  };
}

/**
 * Authenticates a team member against Firebase Authentication.
 * Never hides the exact error code from Firebase.
 */
export async function authenticateTeamMemberWithFirebase(
  userId: string,
  pin: string,
  explicitPassword?: string
): Promise<FirebaseAuthResult> {
  const email = TEAM_EMAILS[userId] || `${userId}@clinicachutro.com`;
  const diag = getFirebaseDiagnosticInfo();
  const cleanPin = pin.trim();

  // Passwords candidates to attempt
  const passwordCandidates: string[] = [];
  if (explicitPassword && explicitPassword.trim()) {
    passwordCandidates.push(explicitPassword.trim());
  }
  if (cleanPin.length >= 6) {
    passwordCandidates.push(cleanPin);
  }
  passwordCandidates.push(getFirebaseAuthPassword(cleanPin)); // e.g. Chutro#3808
  if (cleanPin.length === 4) {
    passwordCandidates.push(`${cleanPin}${cleanPin}`); // e.g. 38083808
  }

  // Remove duplicates
  const uniqueCandidates = Array.from(new Set(passwordCandidates));

  let lastError: any = null;

  for (const password of uniqueCandidates) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      console.info(`✅ [Firebase Auth] Sesión iniciada exitosamente para ${email} (Proyecto: ${currentConfig.projectId})`);
      return {
        success: true,
        uid: credential.user.uid,
        email,
        diagnostic: diag,
      };
    } catch (err: any) {
      lastError = err;
      // If error is operation-not-allowed or api-key-invalid, no need to retry with other passwords
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key'
      ) {
        break;
      }
    }
  }

  // If we reach here, authentication failed.
  const errorCode = lastError?.code || 'auth/unknown';
  const rawMessage = lastError?.message || 'Error desconocido';

  console.warn('[Firebase Auth Info]', {
    errorCode,
    rawMessage,
    email,
    projectId: diag.projectId,
    authDomain: diag.authDomain,
    apiKeyPreview: diag.apiKeyPreview,
    appId: diag.appId,
  });

  // Build human-friendly diagnostic explanation while PRESERVING the exact code
  let diagnosticExplanation = `Error en Firebase Auth [${errorCode}]: ${rawMessage}`;

  if (errorCode === 'auth/operation-not-allowed') {
    diagnosticExplanation =
      `Firebase Auth devolvió el código exacto "${errorCode}" (PASSWORD_LOGIN_DISABLED). ` +
      `Esto ocurre cuando la API Key activa (${diag.apiKeyPreview}) pertenece a un proyecto donde el método "Correo electrónico/contraseña" no está habilitado, ` +
      `o cuando la API Key pertenece a otro proyecto de Google Cloud (p. ej. el sandbox inicial) en lugar del proyecto "${diag.projectId}". ` +
      `Verificá o actualizá la API Key y App ID en la configuración de Firebase de la app.`;
  } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
    diagnosticExplanation =
      `Firebase Auth devolvió el código exacto "${errorCode}". ` +
      `El usuario "${email}" se encontró en Firebase Auth, pero la credencial ingresada no coincide con la contraseña configurada en la consola de Firebase. ` +
      `Podés usar el campo de contraseña directa si tenés una contraseña personalizada en Firebase.`;
  } else if (errorCode === 'auth/user-not-found') {
    diagnosticExplanation =
      `Firebase Auth devolvió el código exacto "${errorCode}". ` +
      `No se encontró el usuario "${email}" en el proyecto de Firebase Auth (${diag.projectId}). ` +
      `Verificá que el usuario esté creado en Firebase Console > Authentication > Users.`;
  } else if (errorCode === 'auth/api-key-not-valid' || errorCode === 'auth/invalid-api-key') {
    diagnosticExplanation =
      `Firebase Auth devolvió el código exacto "${errorCode}". ` +
      `La API Key (${diag.apiKeyPreview}) no es válida o está restringida para el servicio Identity Toolkit en Google Cloud.`;
  }

  return {
    success: false,
    error: diagnosticExplanation,
    errorCode,
    rawMessage,
    email,
    diagnostic: diag,
  };
}


/**
 * Sends Firebase's password-reset email for the selected team member.
 * The browser never handles administrator credentials or a replacement password.
 */
export async function sendTeamPasswordResetEmail(
  userId: string
): Promise<{ success: boolean; email: string; error?: string; errorCode?: string; rawMessage?: string }> {
  const email = TEAM_EMAILS[userId] || `${userId}@clinicachutro.com`;
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, email };
  } catch (err: any) {
    return {
      success: false,
      email,
      errorCode: err?.code || 'auth/unknown',
      rawMessage: err?.message || 'Error desconocido',
      error: `Firebase Auth [${err?.code || 'auth/unknown'}]: ${err?.message || 'Error desconocido'}`,
    };
  }
}

/**
 * Sign out of Firebase Authentication
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Error signing out of Firebase Auth:', err);
  }
}

/**
 * Listen to Firebase Auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Test connectivity to Google Identity Toolkit REST API with an API key
 */
export async function testApiKeyWithIdentityToolkit(
  apiKey: string,
  email = 'nicolas@clinicachutro.com'
): Promise<{ success: boolean; code?: string; message: string; isPasswordProviderEnabled?: boolean }> {
  try {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, message: 'La API Key está vacía' };
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cleanKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'test_probe_password', returnSecureToken: true }),
      }
    );

    const data = await res.json();

    if (data.error) {
      const errCode = data.error.message;
      if (errCode === 'PASSWORD_LOGIN_DISABLED') {
        return {
          success: false,
          code: 'PASSWORD_LOGIN_DISABLED',
          message: 'La API Key es válida pero el proyecto tiene PASSWORD_LOGIN_DISABLED (Correo/contraseña deshabilitado o API Key de otro proyecto).',
          isPasswordProviderEnabled: false,
        };
      }
      if (errCode.includes('API key not valid') || data.error.status === 'INVALID_ARGUMENT') {
        return {
          success: false,
          code: 'API_KEY_INVALID',
          message: 'La API Key no es válida según Google Cloud Identity Toolkit.',
        };
      }
      if (
        errCode === 'INVALID_LOGIN_CREDENTIALS' ||
        errCode === 'INVALID_PASSWORD' ||
        errCode === 'EMAIL_NOT_FOUND'
      ) {
        return {
          success: true,
          code: errCode,
          message: `¡API Key verificada con éxito! El servicio Identity Toolkit respondió correctamente (${errCode}) y el proveedor de contraseña está activo.`,
          isPasswordProviderEnabled: true,
        };
      }
      return {
        success: false,
        code: errCode,
        message: `Identity Toolkit respondió: ${errCode}`,
      };
    }

    return {
      success: true,
      message: 'Autenticación exitosa en Identity Toolkit.',
      isPasswordProviderEnabled: true,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Error de red al consultar Identity Toolkit: ${e?.message || e}`,
    };
  }
}

// Test connection only when authenticated, compliant with request.auth != null
export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) {
    return false;
  }
  try {
    const testDoc = doc(db, 'test', 'connection');
    await setDoc(testDoc, { ping: true, timestamp: Date.now(), uid: auth.currentUser.uid }, { merge: true });
    await getDocFromServer(testDoc);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline. Verify network/configuration.');
    } else {
      console.warn('Firestore connection check:', error);
    }
    return false;
  }
}
