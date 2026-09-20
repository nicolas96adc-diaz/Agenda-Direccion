import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  LockKeyhole,
  LogIn,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import {
  authenticateTeamMemberWithFirebase,
  TEAM_EMAILS,
  sendTeamPasswordResetEmail,
  signOutFirebase,
} from '../lib/firebase';
import { getUserProfileByUid } from '../services/firestoreSync';

export const LoginView: React.FC = () => {
  const { users, login } = useTasks();
  const allowedUsers = useMemo(() => users.filter(user => user.active !== false), [users]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedUser = allowedUsers.find(user => user.id === selectedId) ?? null;
  const userFirebaseEmail = selectedUser
    ? TEAM_EMAILS[selectedUser.id] || `${selectedUser.id}@clinicachutro.com`
    : '';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResetMessage('');

    console.info('[LOGIN_TRACE] LOGIN_SUBMIT', {
      selectedAppUserId: selectedUser?.id ?? null,
      selectedUserEmail: userFirebaseEmail || null,
    });

    if (!selectedUser) {
      console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: no_selected_user');
      setError('Elegí tu nombre para continuar.');
      return;
    }
    if (!password.trim()) {
      console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: empty_password');
      setError('Ingresá tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const authResult = await authenticateTeamMemberWithFirebase(selectedUser.id, password);
      console.info('[LOGIN_TRACE] LOGIN_AUTH_RESULT', {
        authSuccess: authResult.success,
        authUid: authResult.uid ?? null,
        authEmail: authResult.email ?? null,
        selectedAppUserId: selectedUser.id,
        expectedEmail: userFirebaseEmail,
      });
      if (!authResult.success || !authResult.uid) {
        console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: firebase_auth_unsuccessful', {
          authSuccess: authResult.success,
          hasUid: Boolean(authResult.uid),
          error: authResult.error ?? null,
        });
        setPassword('');
        setError(authResult.error || 'No se pudo iniciar sesión con Firebase.');
        return;
      }

      const profile = await getUserProfileByUid(authResult.uid);
      const emailMatches = profile?.email?.toLowerCase() === authResult.email.toLowerCase();
      const profileExists = Boolean(profile);
      const appUserIdMatches = profile?.appUserId === selectedUser.id;
      const profileIsActive = profile?.active === true;
      console.info('[LOGIN_TRACE] LOGIN_PROFILE_VALIDATIONS', {
        authUid: authResult.uid,
        authEmail: authResult.email,
        selectedAppUserId: selectedUser.id,
        profileExists,
        emailMatches,
        appUserIdMatches,
        profileIsActive,
        profile: profile ?? null,
      });
      if (!profile || !emailMatches || !appUserIdMatches || !profileIsActive) {
        console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: login_view_profile_validation', {
          profileExists,
          emailMatches,
          appUserIdMatches,
          profileIsActive,
        });
        await signOutFirebase();
        setError(
          'La cuenta inició sesión, pero su perfil de Clínica Chutro no está activo o no coincide. Revisá /users/{uid} en Firestore.'
        );
        return;
      }

      console.info('[LOGIN_TRACE] LOGIN_COMPONENT_CALLING_CONTEXT_LOGIN', {
        profileUid: profile.uid,
        profileAppUserId: profile.appUserId,
      });
      login(profile);
    } catch (loginError: any) {
      console.error('[LOGIN_TRACE] LOGIN_FAIL_REASON: login_exception', {
        name: loginError?.name ?? null,
        code: loginError?.code ?? null,
        message: loginError?.message || String(loginError),
      });
      await signOutFirebase();
      setError('No se pudo verificar la identidad: ' + (loginError?.message || loginError));
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
        setResetMessage(`Se solicitó el correo de recuperación para ${result.email}. Revisá Recibidos y Spam.`);
      } else {
        setError(result.error || 'No se pudo solicitar el correo de recuperación.');
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
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Clínica Chutro</p>
            <h1 className="text-3xl font-black tracking-tight text-[#10213d]">Ingresar al equipo</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Elegí tu perfil e ingresá la contraseña configurada en Firebase.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><UserRound size={16} aria-hidden="true" /> Tu nombre</span>
              <select id="login-user-select" value={selectedId} onChange={event => { setSelectedId(event.target.value); setPassword(''); setError(''); setResetMessage(''); }} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-800 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100">
                <option value="">Seleccioná tu nombre</option>
                {allowedUsers.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
              </select>
            </label>

            {userFirebaseEmail && <div className="rounded-lg bg-sky-50/70 px-3 py-2 text-xs text-sky-800">Cuenta: <strong className="font-semibold">{userFirebaseEmail}</strong></div>}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><LockKeyhole size={16} aria-hidden="true" /> Contraseña</span>
              <input id="login-password-input" type="password" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError(''); }} placeholder="Ingresá tu contraseña" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100" aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} />
            </label>

            <button id="forgot-password-btn" type="button" onClick={handlePasswordReset} disabled={isLoading || !selectedUser} className="text-left text-xs font-semibold text-sky-700 transition hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50">¿Olvidaste tu contraseña? Enviar correo de recuperación</button>
            {resetMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-sm font-medium text-emerald-900">{resetMessage}</div>}
            {error && <div id="login-error" role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-medium text-rose-900 shadow-xs"><AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} aria-hidden="true" /><span>{error}</span></div>}
            <button id="login-submit-btn" type="submit" disabled={isLoading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-5 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#193258] focus:outline-none focus:ring-4 focus:ring-sky-200 active:scale-[0.99] disabled:opacity-70 cursor-pointer">
              {isLoading ? <><RefreshCw size={18} className="animate-spin" /> Verificando...</> : <>Ingresar <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};
