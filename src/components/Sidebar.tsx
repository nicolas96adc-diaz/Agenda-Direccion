import React from 'react';
import {
  Target,
  LayoutGrid,
  AlertTriangle,
  Calendar,
  RotateCcw,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { ViewType } from '../types';

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { activeView, setActiveView, stats, resetTasks, currentUser, logout } = useTasks();

  const navItems: {
    id: ViewType;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'inicio', label: 'Foco de hoy', icon: Target },
    { id: 'pizarra', label: 'Pizarra', icon: LayoutGrid },
    {
      id: 'bloqueos',
      label: 'Bloqueos',
      icon: AlertTriangle,
      badge: stats.bloqueadas > 0 ? stats.bloqueadas : undefined,
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'vencimientos',
      label: 'Vencimientos',
      icon: Calendar,
      badge: stats.vencimientos > 0 ? stats.vencimientos : undefined,
      badgeColor: 'bg-amber-600 text-white',
    },
    { id: 'historial', label: 'Historial', icon: RotateCcw },
    { id: 'equipo', label: 'Equipo', icon: Users },
  ];

  const handleSelectView = (view: ViewType) => {
    setActiveView(view);
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleResetData = () => {
    if (window.confirm('¿Desea restaurar las tareas de ejemplo iniciales de la clínica?')) {
      resetTasks();
    }
  };

  return (
    <aside
      id="app-sidebar"
      className={`bg-[#142136] text-white flex flex-col shrink-0 h-full select-none z-20 border-r border-slate-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[70px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="p-3 py-4 flex flex-col items-center gap-3 border-b border-slate-800/80">
          <button
            type="button"
            className="relative w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            onClick={onToggleCollapse}
            title="Expandir menú"
            aria-label="Expandir menú"
          >
            <div className="absolute top-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
            <div className="absolute bottom-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
            <div className="absolute left-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
            <div className="absolute right-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
            <div className="w-1.5 h-1.5 bg-[#142136] rounded-full z-10" />
          </button>

          {onToggleCollapse && (
            <button
              id="btn-sidebar-toggle-expand"
              onClick={onToggleCollapse}
              title="Expandir menú"
              className="min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              aria-label="Expandir menú"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-4.5 pb-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            {/* Clínica Chutro Logo Icon */}
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center" aria-hidden="true">
              <div className="absolute top-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
              <div className="absolute bottom-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
              <div className="absolute left-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
              <div className="absolute right-0 w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-xs" />
              <div className="w-1.5 h-1.5 bg-[#142136] rounded-full z-10" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-white font-bold text-base tracking-tight leading-tight truncate">
                Clínica Chutro
              </span>
              <span className="text-slate-400 text-xs font-normal">
                Dirección
              </span>
            </div>
          </div>

          {onToggleCollapse && (
            <button
              id="btn-sidebar-toggle-collapse"
              onClick={onToggleCollapse}
              title="Contraer menú"
              className="min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Contraer menú"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav
        className={`flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden ${
          isCollapsed ? 'p-2' : 'px-3 py-3'
        }`}
        aria-label="Navegación principal"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          if (isCollapsed) {
            return (
              <div key={item.id} className="relative group flex justify-center">
                <button
                  id={`nav-${item.id}`}
                  onClick={() => handleSelectView(item.id)}
                  title={`${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}`}
                  aria-label={item.label}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer relative ${
                    isActive
                      ? 'bg-slate-700/80 text-cyan-300 font-semibold shadow-xs ring-1 ring-slate-600/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.badge !== undefined && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 text-[10px] font-black rounded-full flex items-center justify-center shadow-xs border border-slate-900 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip with zero delay */}
                <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 whitespace-nowrap z-50 flex items-center gap-2 border border-slate-700">
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => handleSelectView(item.id)}
              className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                isActive
                  ? 'bg-slate-700/60 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] font-bold rounded-full ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer: User Profile & Session */}
      {isCollapsed ? (
        <div className="p-2 py-3 border-t border-slate-800/80 flex flex-col items-center gap-2">
          <div className="relative group">
            <div
              className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-300 font-bold text-xs flex items-center justify-center cursor-default border border-slate-700/80"
              aria-label={`Usuario: ${currentUser.name}`}
            >
              {currentUser.shortName.substring(0, 2).toUpperCase()}
            </div>
            <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 border border-slate-700">
              {currentUser.name} ({currentUser.role})
            </div>
          </div>

          <div className="relative group">
            <button
              type="button"
              id="btn-logout-sidebar-collapsed"
              onClick={logout}
              className="min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 border border-slate-700">
              Cerrar sesión
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700/80">
              {currentUser.shortName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-200 truncate leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10.5px] text-slate-400 truncate leading-tight">
                {currentUser.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-logout-sidebar"
            onClick={logout}
            className="min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
