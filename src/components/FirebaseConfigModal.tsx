import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Info,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import {
  getFirebaseDiagnosticInfo,
  saveCustomFirebaseConfig,
  testApiKeyWithIdentityToolkit,
  resetCustomFirebaseConfig,
} from '../lib/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [diagInfo, setDiagInfo] = useState(getFirebaseDiagnosticInfo());

  // Edit config state inside modal
  const [editApiKey, setEditApiKey] = useState(diagInfo.apiKey);
  const [editAppId, setEditAppId] = useState(diagInfo.appId);
  const [editProjectId, setEditProjectId] = useState(diagInfo.projectId);
  const [editAuthDomain, setEditAuthDomain] = useState(diagInfo.authDomain);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    code?: string;
  } | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Refresh diagnostic info when opening modal
  useEffect(() => {
    if (isOpen) {
      const fresh = getFirebaseDiagnosticInfo();
      setDiagInfo(fresh);
      setEditApiKey(fresh.apiKey);
      setEditAppId(fresh.appId);
      setEditProjectId(fresh.projectId);
      setEditAuthDomain(fresh.authDomain);
      setTestResult(null);
      setSaveSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    setErrorMessage('');
    try {
      const res = await testApiKeyWithIdentityToolkit(editApiKey, 'nicolas@clinicachutro.com');
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Error al conectar con Identity Toolkit',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setSaveSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await saveCustomFirebaseConfig({
        apiKey: editApiKey.trim(),
        appId: editAppId.trim(),
        projectId: editProjectId.trim(),
        authDomain: editAuthDomain.trim(),
      });
      if (res.success) {
        const fresh = getFirebaseDiagnosticInfo();
        setDiagInfo(fresh);
        setSaveSuccessMessage('¡Configuración de Firebase guardada y aplicada con éxito!');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'No se pudo guardar la configuración');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error al guardar la configuración');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetConfig = async () => {
    await resetCustomFirebaseConfig();
    const fresh = getFirebaseDiagnosticInfo();
    setDiagInfo(fresh);
    setEditApiKey(fresh.apiKey);
    setEditAppId(fresh.appId);
    setEditProjectId(fresh.projectId);
    setEditAuthDomain(fresh.authDomain);
    setSaveSuccessMessage('Valores restaurados a la configuración inicial');
  };

  const handlePasteConfig = (text: string) => {
    try {
      const apiKeyMatch = text.match(/apiKey:\s*["']([^"']+)["']/i);
      const authDomainMatch = text.match(/authDomain:\s*["']([^"']+)["']/i);
      const projectIdMatch = text.match(/projectId:\s*["']([^"']+)["']/i);
      const appIdMatch = text.match(/appId:\s*["']([^"']+)["']/i);

      if (apiKeyMatch) setEditApiKey(apiKeyMatch[1]);
      if (authDomainMatch) setEditAuthDomain(authDomainMatch[1]);
      if (projectIdMatch) setEditProjectId(projectIdMatch[1]);
      if (appIdMatch) setEditAppId(appIdMatch[1]);
    } catch {
      // ignore parse errors
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diag-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Database size={20} />
            </div>
            <div>
              <h2 id="diag-modal-title" className="text-lg font-bold text-slate-900">
                Configuración de Firebase
              </h2>
              <p className="text-xs text-slate-500">Proyecto objetivo: clinica-chutro</p>
            </div>
          </div>
          <button
            type="button"
            id="close-firebase-modal-btn"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {saveSuccessMessage && (
          <div className="my-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            {saveSuccessMessage}
          </div>
        )}

        {errorMessage && (
          <div className="my-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Current Active Values summary */}
        <div className="my-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Valores en tiempo de ejecución
            </p>
            <a
              href="https://console.firebase.google.com/project/clinica-chutro/settings/general"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
            >
              Abrir Firebase Console <ExternalLink size={12} />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="font-medium text-slate-500">Project ID:</span>
              <div className="font-mono font-bold text-slate-800 truncate">{diagInfo.projectId}</div>
            </div>
            <div>
              <span className="font-medium text-slate-500">Auth Domain:</span>
              <div className="font-mono font-bold text-slate-800 truncate">{diagInfo.authDomain}</div>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-slate-500">API Key activa:</span>
              <div className="font-mono font-bold text-slate-800 truncate">{diagInfo.apiKeyPreview}</div>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-slate-500">App ID:</span>
              <div className="font-mono text-slate-700 truncate">{diagInfo.appId || 'No asignado'}</div>
            </div>
          </div>
        </div>

        {/* Quick Paste Snippet Box */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Pegar objeto de configuración de Firebase (opcional)
          </label>
          <textarea
            id="paste-config-textarea"
            rows={2}
            placeholder='Pegá aquí const firebaseConfig = { apiKey: "...", appId: "..." }'
            onChange={(e) => handlePasteConfig(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs outline-none focus:border-sky-500 focus:bg-white"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Extrae automáticamente apiKey, appId, projectId y authDomain desde tu app web de Firebase.
          </p>
        </div>

        {/* Field adjustments */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              API Key de clinica-chutro
            </label>
            <input
              id="diag-input-apikey"
              type="text"
              value={editApiKey}
              onChange={(e) => {
                setEditApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              App ID (de tu app web en Firebase)
            </label>
            <input
              id="diag-input-appid"
              type="text"
              value={editAppId}
              onChange={(e) => setEditAppId(e.target.value)}
              placeholder="1:560920042423:web:..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Project ID</label>
              <input
                id="diag-input-projectid"
                type="text"
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Auth Domain</label>
              <input
                id="diag-input-authdomain"
                type="text"
                value={editAuthDomain}
                onChange={(e) => setEditAuthDomain(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
        </div>

        {/* Test Key Results */}
        {testResult && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-medium border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                {testResult.code && (
                  <span className="font-mono font-bold block mb-1">
                    Respuesta: {testResult.code}
                  </span>
                )}
                <span>{testResult.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            id="test-apikey-modal-btn"
            disabled={isTestingKey || !editApiKey.trim()}
            onClick={handleTestKey}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-600 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-50 transition disabled:opacity-50 cursor-pointer"
          >
            {isTestingKey ? <RefreshCw size={14} className="animate-spin" /> : <Info size={14} />}
            Probar API Key en Identity Toolkit
          </button>

          <button
            type="button"
            id="save-firebase-config-modal-btn"
            disabled={isSavingConfig}
            onClick={handleSaveConfig}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-800 shadow-md shadow-sky-900/10 transition disabled:opacity-50 cursor-pointer"
          >
            {isSavingConfig ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Guardar y Aplicar
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            id="reset-firebase-config-modal-btn"
            onClick={handleResetConfig}
            className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
          >
            Restaurar valores predeterminados
          </button>
        </div>
      </div>
    </div>
  );
};
