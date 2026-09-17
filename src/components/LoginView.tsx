import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  KeyRound,
  LockKeyhole,
  LogIn,
  RefreshCw,
  Settings,
  UserRound,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { apiLogin } from '../utils/api';
import {
  authenticateTeamMemberWithFirebase,
  getFirebaseDiagnosticInfo,
  TEAM_EMAILS,
  sendTeamPasswordResetEmail,
  signOutFirebase,
} from '../lib/firebase';
import { getUserProfileByUid } from '../services/firestoreSync';
import { FirebaseConfigModal } from './FirebaseConfigModal';

export const LoginView: React.FC = () => {
  const { users, login } = useTasks();
  const allowedUsers = useMemo(() => users.filter((u) => u.active !== false), [users]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Diagnostic modal state
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const diagInfo = getFirebaseDiagnosticInfo();

  const selectedUser = allowedUsers.find((user) => user.id === selectedId) ?? null;
  const userFirebaseEmail = selectedUser
    ? TEAM_EMAILS[selectedUser.id] || `${selectedUser.id}@clinicachutro.com`
    : '';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!selectedUser) { setError('Elegí tu nombre para continuar.'); return; }
    if (!pin || !pin.trim()) { setError('Ingresá tu PIN personal.'); return; }

    setIsLoading(true);
    try {
      const fbResult = await authenticateTeamMemberWithFirebase(selectedUser.id, pin, customPassword.trim() || undefined);
      if (!fbResult.success || !fbResult.uid) {
        setPin('');
        setError(fbResult.error || 'No se pudo iniciar sesión con Firebase.');
        return;
      }

      const profile = await getUserProfileByUid(fbResult.uid);
      const emailMatches = profile?.email?.toLowerCase() === (fbResult.email || '').toLowerCase();
      if (!profile || !emailMatches || profile.appUserId !== selectedUser.id || !profile.active) {
        await signOutFirebase();
        setError('Tu cuenta Firebase no tiene un perfil activo y coincidente en Firestore. Pedí a un administrador que configure /users/{uid}.');
        return;
      }

      login(profile);
    } catch (err: any) {
      await signOutFirebase();
      setError('No se pudo verificar tu identidad Firebase: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
    }
  };
  const handlePasswordReset = async () => {
    setError('');
    setResetMessage('');
    if (!selectedUser) {
      setError('Elegí tu nombre para recibir el correo de recuperación.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendTeamPasswordResetEmail(selectedUser.id);
      if (result.success) {
        setResetMessage('Firebase solicitó el correo de recuperación para ' + result.email + '. Revisá Recibidos y Spam.');
      } else {
        setError(result.error || ('Firebase Auth [' + (result.errorCode || 'auth/unknown') + ']: ' + (result.rawMessage || 'Error desconocido')));
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_#f8fafc_46%,_#eff6ff)] px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_64px_rgba(15,35,61,0.13)] backdrop-blur-xs sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10213d] text-white shadow-lg shadow-slate-900/15">
              <LogIn size={26} aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
              Clínica Chutro
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#10213d]">
              Ingresar al equipo
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Elegí tu perfil e ingresá tu PIN personal para acceder al tablero de gestión.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <UserRound size={16} aria-hidden="true" /> Tu nombre
              </span>
              <select
                id="login-user-select"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setError('');
                }}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-800 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                aria-invalid={Boolean(error)}
              >
                <option value="">Seleccioná tu nombre</option>
                {allowedUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </label>

            {userFirebaseEmail && (
              <div className="rounded-lg bg-sky-50/70 px-3 py-2 text-xs text-sky-800 flex items-center justify-between">
                <span>
                  Cuenta Firebase: <strong className="font-semibold">{userFirebaseEmail}</strong>
                </span>
                <span className="font-mono text-[10px] text-sky-600 bg-sky-100/80 px-1.5 py-0.5 rounded">
                  {diagInfo.projectId}
                </span>
              </div>
            )}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <LockKeyhole size={16} aria-hidden="true" /> PIN personal
              </span>
              <input
                id="login-pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={12}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value);
                  setError('');
                }}
                placeholder="••••"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold tracking-[0.4em] text-slate-800 outline-none transition placeholder:tracking-normal focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </label>

            {/* Optional custom password if different from PIN */}
            <div>
              <button
                type="button"
                id="toggle-custom-password-btn"
                onClick={() => setShowCustomPassword(!showCustomPassword)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-700 transition cursor-pointer"
              >
                <KeyRound size={13} />
                {showCustomPassword
                  ? 'Ocultar contraseña alternativa'
                  : '¿Tu contraseña de Firebase es distinta a tu PIN?'}
                {showCustomPassword ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showCustomPassword && (
                <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contraseña configurada en Firebase Console (opcional)
                  </label>
                  <input
                    id="login-custom-password-input"
                    type="password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Ingresá tu contraseña de Firebase si difiere del PIN"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Si en la consola de Firebase definiste una contraseña personalizada, ingresala aquí.
                  </p>
                </div>
              )}
            </div>


            <button
              id="forgot-password-btn"
              type="button"
              onClick={handlePasswordReset}
              disabled={isLoading || !selectedUser}
              className="text-left text-xs font-semibold text-sky-700 transition hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ¿Olvidaste tu contraseña? Enviar correo de recuperación
            </button>

            {resetMessage && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-sm font-medium text-emerald-900">
                {resetMessage}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                id="login-error"
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-medium text-rose-900 shadow-xs"
              >
                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-5 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#193258] focus:outline-none focus:ring-4 focus:ring-sky-200 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  Ingresar <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Diagnostic & Firebase status footer */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Proyecto: <strong className="font-semibold text-slate-700">{diagInfo.projectId}</strong>
            </span>
            <button
              type="button"
              id="open-firebase-diag-btn"
              onClick={() => setShowDiagnosticModal(true)}
              className="flex items-center gap-1 text-sky-700 hover:text-sky-900 font-semibold transition cursor-pointer"
            >
              <Settings size={13} /> Credenciales Firebase
            </button>
          </div>
        </div>
      </section>

      {/* REUSABLE FIREBASE CONFIG MODAL */}
      <FirebaseConfigModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </main>
  );
};
