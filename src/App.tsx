/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TaskProvider, useTasks } from './context/TaskContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FocoDelDia } from './components/FocoDelDia';
import { PizarraView } from './components/PizarraView';
import { BloqueosView } from './components/BloqueosView';
import { VencimientosView } from './components/VencimientosView';
import { HistorialView } from './components/HistorialView';
import { EquipoView } from './components/EquipoView';
import { TaskModal } from './components/TaskModal';
import { LoginView } from './components/LoginView';
import { X } from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'chutro_sidebar_collapsed';

const DashboardLayout: React.FC = () => {
  const { activeView } = useTasks();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const mainScrollRef = useRef<HTMLElement>(null);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Al cambiar de vista, el contenido siempre debe abrir arriba
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeView]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-800 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Desktop Sidebar: Dinámica, contraíble y con transición suave */}
      <div
        className={`hidden md:flex shrink-0 h-screen overflow-hidden z-30 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[70px]' : 'w-64'
        }`}
      >
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full flex flex-col bg-[#142136]" role="dialog" aria-modal="true" aria-label="Menú principal">
            <Sidebar
              isCollapsed={false}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 min-w-11 min-h-11 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-slate-800/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Encabezado fijo y sólo scroll vertical en main */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />

        <main
          ref={mainScrollRef}
          id="main-scroll-container"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6"
        >
          {activeView === 'inicio' && <FocoDelDia />}
          {activeView === 'pizarra' && <PizarraView />}
          {activeView === 'bloqueos' && <BloqueosView />}
          {activeView === 'vencimientos' && <VencimientosView />}
          {activeView === 'historial' && <HistorialView />}
          {activeView === 'equipo' && <EquipoView />}
        </main>
      </div>

      {/* Global Task Modal */}
      <TaskModal />
    </div>
  );
};

const MainContent: React.FC = () => {
  const { isLoggedIn } = useTasks();
  return isLoggedIn ? <DashboardLayout /> : <LoginView />;
};

export default function App() {
  return (
    <TaskProvider>
      <MainContent />
    </TaskProvider>
  );
}
