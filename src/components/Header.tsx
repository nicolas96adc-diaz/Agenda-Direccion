import React from 'react';
import { Plus, Menu, LogOut } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { ViewType } from '../types';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

const VIEW_CONFIG: Record<ViewType, { title: string; subtitle: string }> = {
  inicio: { title: 'HOY', subtitle: 'Prioridades del día' },
  pizarra: { title: 'Pizarra', subtitle: 'Compromisos y tareas disponibles' },
  bloqueos: { title: 'Bloqueos', subtitle: 'Tareas impedidas' },
  vencimientos: { title: 'Vencimientos', subtitle: 'Plazos de entrega' },
  historial: { title: 'Historial', subtitle: 'Tareas resueltas' },
  equipo: { title: 'Equipo', subtitle: 'Integrantes de Dirección' },
};

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { activeView, openCreateModal, currentUser, logout, syncStatus, syncError, isLoadingData } = useTasks();
  const currentInfo = VIEW_CONFIG[activeView] || VIEW_CONFIG.inicio;
  const isHoy = currentInfo.title === 'HOY';
  const syncMessage = isLoadingData
    ? 'Cargando tareas…'
    : syncStatus === 'syncing'
    ? 'Guardando cambios…'
    : syncStatus === 'error'
    ? syncError || 'No se pudieron sincronizar los cambios.'
    : syncStatus === 'offline'
    ? 'Sin conexión'
    : 'Todo actualizado';

  return (
    <header className="bg-slate-100/90 backdrop-blur-xs px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200/80 shrink-0 z-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-200/80 focus:outline-none shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1
              id="view-main-title"
              className={
                isHoy
                  ? 'text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none uppercase select-none text-[#1e3a5f]'
                  : 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none'
              }
            >
              {currentInfo.title}
            </h1>
            {currentInfo.subtitle && (
              <span className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:inline">
                · {currentInfo.subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-end sm:self-center flex-wrap">
          <div
            id="session-user-identity"
            className="flex items-center gap-2 bg-white pl-2 pr-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs max-w-[280px] sm:max-w-[340px]"
            title={`Conectado como ${currentUser.name} (${currentUser.role})`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#142136] text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.shortName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                {currentUser.name}
              </span>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] text-slate-500 font-medium truncate">
                  {currentUser.role}
                </span>
                <span className="inline-flex items-center gap-1" title={syncMessage}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      syncStatus === 'syncing'
                        ? 'bg-amber-500 animate-pulse'
                        : syncStatus === 'error'
                        ? 'bg-rose-500'
                        : syncStatus === 'offline'
                        ? 'bg-slate-400'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className={`text-[10px] font-semibold ${syncStatus === 'error' ? 'text-rose-700' : syncStatus === 'offline' ? 'text-slate-600' : 'text-slate-500'}`}>
                    {syncStatus === 'error' ? 'Revisar sincronización' : isLoadingData || syncStatus === 'syncing' ? syncMessage : ''}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-logout-header"
            onClick={logout}
            title="Cerrar sesión"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer border border-slate-200/60"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>

          <button
            type="button"
            id="btn-new-task-header"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 bg-[#142136] hover:bg-[#1e2f4a] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva tarea</span>
          </button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{syncMessage}</p>
    </header>
  );
};
