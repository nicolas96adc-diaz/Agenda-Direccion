import React from 'react';
import { Users, Shield, CheckCircle2, UserCheck, UserX, AlertCircle, Briefcase, ArrowRight } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { AccessLevel, UserProfile } from '../types';

export const EquipoView: React.FC = () => {
  const { users, currentUser, toggleUserActive, tasks, setActiveView } = useTasks();

  const isRodrigo = currentUser.id === 'user-rodrigo';

  // Count active/total tasks per user
  const getUserTaskCounts = (user: UserProfile) => {
    const userTasks = tasks.filter(
      t =>
        (t.assigneeId && t.assigneeId === user.id) ||
        t.assignee.toLowerCase() === user.name.toLowerCase() ||
        t.assignee.toLowerCase() === user.shortName.toLowerCase() ||
        (user.id === 'user-noemi' && t.assignee.toLowerCase() === 'noelia') ||
        (user.id === 'user-lora' && t.assignee.toLowerCase().includes('lora')) ||
        (user.id === 'user-yasku' && t.assignee.toLowerCase().includes('yasku'))
    );
    const activeTasks = userTasks.filter(t => t.status !== 'RESUELTA');
    const resolvedTasks = userTasks.filter(t => t.status === 'RESUELTA');
    return {
      total: userTasks.length,
      active: activeTasks.length,
      resolved: resolvedTasks.length,
    };
  };

  const getAccessBadgeClass = (level: AccessLevel) => {
    switch (level) {
      case 'Administración total':
        return 'bg-[#142136] text-white border-[#142136]';
      case 'Dirección':
        return 'bg-blue-100/90 text-blue-900 border-blue-200';
      case 'Coordinación':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Colaborador de Dirección':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Colaborador médico':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Responsable de Sistemas':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto pb-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Equipo de Dirección
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                {users.length} integrantes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Estructura de perfiles, cargos y roles operativos en Clínica Chutro.
            </p>
          </div>
        </div>

        {/* Status Banner regarding permissions */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <Shield className={`w-4 h-4 shrink-0 ${isRodrigo ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className="text-slate-600">
            {isRodrigo ? (
              <span className="font-semibold text-slate-800">
                Sesión: Rodrigo Bustos (CEO) • Permiso para administrar usuarios
              </span>
            ) : (
              <span>
                Sesión: <strong className="text-slate-800">{currentUser.name}</strong> • Solo Rodrigo puede modificar estados
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Users Table / Compact Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 sm:px-6">Miembro</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Nivel de Acceso</th>
                <th className="py-3 px-4 text-center">Tareas Asignadas</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right sm:pr-6">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {users.map(user => {
                const isCurrent = user.id === currentUser.id;
                const counts = getUserTaskCounts(user);

                return (
                  <tr
                    key={user.id}
                    id={`team-row-${user.id}`}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isCurrent ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Member Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {user.name}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                SESIÓN ACTIVA
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-normal">
                            Alias: {user.shortName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {user.role}
                    </td>

                    {/* Nivel de Acceso */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getAccessBadgeClass(
                          user.accessLevel
                        )}`}
                      >
                        {user.accessLevel}
                      </span>
                    </td>

                    {/* Tareas Asignadas */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="text-sm">{counts.active}</span>
                        <span className="text-xs text-slate-400 font-normal">activas</span>
                        {counts.resolved > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            ({counts.resolved} cerradas)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estado Activo / Inactivo */}
                    <td className="py-3.5 px-4 text-center">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>

                    {/* Gestión (Rodrigo can toggle active; others see static label) */}
                    <td className="py-3.5 px-4 text-right sm:pr-6">
                      {isRodrigo ? (
                        user.id === 'user-rodrigo' ? (
                          <span className="text-xs font-semibold text-slate-400">
                            Titular CEO
                          </span>
                        ) : (
                          <button
                            id={`btn-toggle-user-${user.id}`}
                            onClick={() => toggleUserActive(user.id)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              user.active
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {user.active ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Desactivar</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activar</span>
                              </>
                            )}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Solo lectura
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-900" />
          <span>Esquema de Permisos Operativos</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">
              1. Rodrigo (CEO)
            </span>
            <p className="text-slate-600 leading-relaxed">
              Administración total. Crea, edita, reasigna, resuelve, reabre, elimina y gestiona los perfiles del equipo.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">
              2. Nicolás y Noemi (Dirección)
            </span>
            <p className="text-slate-600 leading-relaxed">
              Gestión operativa completa de tareas: creación, edición de todas las tareas, reasignación, bloqueos y cierres.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">
              3. Laura, Gabriela y Sebastián
            </span>
            <p className="text-slate-600 leading-relaxed">
              Coordinación: ven todo, crean tareas, actualizan sus tareas asignadas, informan bloqueos y agregan observaciones.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">
              4. Dr. Lora y Yasku
            </span>
            <p className="text-slate-600 leading-relaxed">
              Colaborador médico / Sistemas: ven el tablero general, crean tareas y actualizan únicamente tareas propias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
