import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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

export function resolveFirebaseConfig(): FirebaseRuntimeConfig {
  const projectId =
    (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID ||
    baseAppletConfig.projectId ||
    'clinica-chutro';

  return {
    projectId,
    authDomain:
      (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
      baseAppletConfig.authDomain ||
      `${projectId}.firebaseapp.com`,
    apiKey:
      (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
      baseAppletConfig.apiKey ||
      '',
    appId:
      (import.meta as any).env?.VITE_FIREBASE_APP_ID ||
      baseAppletConfig.appId ||
      '',
    storageBucket:
      (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
      baseAppletConfig.storageBucket ||
      `${projectId}.firebasestorage.app`,
    messagingSenderId:
      (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      baseAppletConfig.messagingSenderId ||
      '',
    firestoreDatabaseId:
      (import.meta as any).env?.VITE_FIRESTORE_DATABASE_ID ||
      baseAppletConfig.firestoreDatabaseId ||
      '(default)',
  };
}

export const currentConfig = resolveFirebaseConfig();

function initFirebaseInstances(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  const appInstance = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: currentConfig.apiKey,
        authDomain: currentConfig.authDomain,
        projectId: currentConfig.projectId,
        storageBucket: currentConfig.storageBucket,
        messagingSenderId: currentConfig.messagingSenderId,
        appId: currentConfig.appId,
      });

  return {
    app: appInstance,
    db: getFirestore(appInstance, currentConfig.firestoreDatabaseId || '(default)'),
    auth: getAuth(appInstance),
  };
}

const instances = initFirebaseInstances();
export const app = instances.app;
export const db = instances.db;
export const auth = instances.auth;

export function getFirebaseDiagnosticInfo() {
  return {
    projectId: currentConfig.projectId,
    authDomain: currentConfig.authDomain,
    appId: currentConfig.appId,
    apiKeyPreview: currentConfig.apiKey
      ? `${currentConfig.apiKey.substring(0, 8)}...${currentConfig.apiKey.slice(-4)}`
      : 'NO_API_KEY',
    firestoreDatabaseId: currentConfig.firestoreDatabaseId,
  };
}

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

export interface FirebaseAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  rawMessage?: string;
  uid?: string;
  email: string;
}

/** Authenticate with exactly the password configured in Firebase Authentication. */
export async function authenticateTeamMemberWithFirebase(
  userId: string,
  password: string
): Promise<FirebaseAuthResult> {
  const email = TEAM_EMAILS[userId] || `${userId}@clinicachutro.com`;
  const cleanPassword = password.trim();

  if (!cleanPassword) {
    return {
      success: false,
      error: 'Ingresá tu contraseña.',
      errorCode: 'auth/missing-password',
      email,
    };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, cleanPassword);
    return {
      success: true,
      uid: credential.user.uid,
      email,
    };
  } catch (error: any) {
    const errorCode = error?.code || 'auth/unknown';
    const rawMessage = error?.message || 'Error desconocido';

    let message = `Firebase Auth [${errorCode}]: ${rawMessage}`;
    if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
      message = 'La contraseña no coincide con la configurada para esta cuenta.';
    } else if (errorCode === 'auth/user-not-found') {
      message = `No existe la cuenta ${email} en Firebase Authentication.`;
    } else if (errorCode === 'auth/too-many-requests') {
      message = 'Hubo demasiados intentos. Esperá unos minutos y volvé a intentar.';
    } else if (errorCode === 'auth/network-request-failed') {
      message = 'No se pudo conectar con Firebase. Revisá la conexión a internet.';
    }

    return {
      success: false,
      error: message,
      errorCode,
      rawMessage,
      email,
    };
  }
}

export async function sendTeamPasswordResetEmail(
  userId: string
): Promise<{
  success: boolean;
  email: string;
  error?: string;
  errorCode?: string;
  rawMessage?: string;
}> {
  const email = TEAM_EMAILS[userId] || `${userId}@clinicachutro.com`;
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, email };
  } catch (error: any) {
    return {
      success: false,
      email,
      errorCode: error?.code || 'auth/unknown',
      rawMessage: error?.message || 'Error desconocido',
      error: `Firebase Auth [${error?.code || 'auth/unknown'}]: ${error?.message || 'Error desconocido'}`,
    };
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Error signing out of Firebase Auth:', error);
  }
}

export function onFirebaseAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) return false;

  try {
    const testDoc = doc(db, 'test', 'connection');
    await setDoc(
      testDoc,
      { ping: true, timestamp: Date.now(), uid: auth.currentUser.uid },
      { merge: true }
    );
    await getDocFromServer(testDoc);
    return true;
  } catch (error) {
    console.warn('Firestore connection check:', error);
    return false;
  }
}
