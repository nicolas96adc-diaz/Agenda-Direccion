import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Wrench, X } from 'lucide-react';
import { APP_RELEASE } from '../config/app';
import { useTasks } from '../context/TaskContext';
import { acknowledgeRelease, hasAcknowledgedRelease } from '../services/firestoreSync';

type ReleaseSectionProps = {
  title: string;
  items: readonly string[];
  icon: React.ReactNode;
  tone: 'cyan' | 'indigo' | 'emerald';
};

const toneClasses: Record<ReleaseSectionProps['tone'], string> = {
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const ReleaseSection: React.FC<ReleaseSectionProps> = ({ title, items, icon, tone }) => {
  if (!items.length) return null;

  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className={`grid size-7 place-items-center rounded-lg ring-1 ${toneClasses[tone]}`}>{icon}</span>
        {title}
      </h3>
      <ul className="space-y-2 pl-1">
        {items.map(item => (
          <li key={item} className="flex gap-2.5 text-sm leading-5 text-slate-600">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const ReleaseNotesModal: React.FC = () => {
  const { currentUser, isLoggedIn } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = currentUser.uid;

  useEffect(() => {
    let cancelled = false;

    if (!isLoggedIn || !uid) {
      setIsOpen(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setError(null);
    void hasAcknowledgedRelease(uid, APP_RELEASE.version)
      .then(alreadySeen => {
        if (!cancelled) setIsOpen(!alreadySeen);
      })
      .catch(() => {
        if (!cancelled) {
          setIsOpen(true);
          setError('No pudimos verificar este aviso. Intentá confirmarlo nuevamente.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, uid]);

  useEffect(() => {
    if (!isOpen || isSaving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void handleAcknowledge();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleAcknowledge = async () => {
    if (!uid || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await acknowledgeRelease(uid, APP_RELEASE.version);
      setIsOpen(false);
    } catch {
      setError('No pudimos guardar la confirmación. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || isChecking) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-xs sm:items-center sm:p-5"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        aria-describedby="release-notes-description"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#142136] text-cyan-300 shadow-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Clínica Planner · v{APP_RELEASE.version}</p>
              <h2 id="release-notes-title" className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {APP_RELEASE.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleAcknowledge()}
            disabled={isSaving}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-wait disabled:opacity-60"
            aria-label="Cerrar y confirmar novedades"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div id="release-notes-description" className="max-h-[58vh] space-y-5 overflow-y-auto px-5 py-5 sm:max-h-[60vh] sm:px-6 sm:py-6">
          <ReleaseSection title="Cambios realizados" items={APP_RELEASE.changes} icon={<Sparkles className="size-4" />} tone="cyan" />
          <ReleaseSection title="Errores y arreglos corregidos" items={APP_RELEASE.fixes} icon={<Wrench className="size-4" />} tone="indigo" />
          <ReleaseSection title="Mejoras implementadas" items={APP_RELEASE.improvements} icon={<CheckCircle2 className="size-4" />} tone="emerald" />
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">{error}</p>}
        </div>

        <footer className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => void handleAcknowledge()}
            disabled={isSaving}
            className="release-accept-pulse flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#142136] px-5 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#1e2f4a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 active:scale-[0.98] disabled:cursor-wait disabled:animate-none disabled:opacity-70"
          >
            <CheckCircle2 className="size-5" aria-hidden="true" />
            {isSaving ? 'Guardando confirmación…' : 'ACEPTAR'}
          </button>
        </footer>
      </div>
    </div>
  );
};
