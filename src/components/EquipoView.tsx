import React from 'react';
import { Shield, Users } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { AccessLevel, UserProfile } from '../types';

export const EquipoView: React.FC = () => {
  const { users, currentUser, tasks } = useTasks();

  const getUserTaskCounts = (user: UserProfile) => {
    const userTasks = tasks.filter(task => {
      if (task.assigneeUid && user.uid && task.assigneeUid === user.uid) return true;
      if (task.assigneeId && task.assigneeId === user.id) return true;
      const assignee = (task.assignee || '').toLowerCase();
      return (
        assignee === user.name.toLowerCase() ||
        assignee === user.shortName.toLowerCase()
      );
    });

    return {
      active: userTasks.filter(task => task.status !== 'RESUELTA').length,
      resolved: userTasks.filter(task => task.status === 'RESUELTA').length,
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                {users.length} integrantes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Perfiles y responsabilidades operativas de Clínica Chutro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <Shield className="w-4 h-4 shrink-0 text-blue-700" />
          <span className="font-semibold text-slate-700">
            Rodrigo administra el sistema; Nicolás y Noemí gestionan la operación.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 sm:px-6">Miembro</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Nivel de acceso</th>
                <th className="py-3 px-4 text-center">Tareas</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right sm:pr-6">Gestión de cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {users.map(user => {
                const counts = getUserTaskCounts(user);
                const isCurrent = user.id === currentUser.id;

                return (
                  <tr
                    key={user.id}
                    id={`team-row-${user.id}`}
                    className={isCurrent ? 'bg-blue-50/20' : 'hover:bg-slate-50/70'}
                  >
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name
                            .split(' ')
                            .map(part => part[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{user.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                SESIÓN ACTIVA
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">Alias: {user.shortName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">{user.role}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getAccessBadgeClass(
                          user.accessLevel
                        )}`}
                      >
                        {user.accessLevel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800">{counts.active}</span>{' '}
                      <span className="text-slate-400">activas</span>
                      {counts.resolved > 0 && (
                        <span className="text-emerald-600 font-medium"> · {counts.resolved} resueltas</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          user.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right sm:pr-6">
                      <span className="text-xs text-slate-400 font-medium">
                        Administrado en Firebase
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {users.map(user => {
            const counts = getUserTaskCounts(user);
            const isCurrent = user.id === currentUser.id;

            return (
              <article key={user.id} className={`p-4 ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{user.name}</h3>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          SESIÓN ACTIVA
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">{user.role}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold border ${
                    user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Acceso</dt>
                    <dd className={`mt-1 inline-flex px-2 py-1 rounded-full text-[11px] font-bold border ${getAccessBadgeClass(user.accessLevel)}`}>
                      {user.accessLevel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tareas</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {counts.active} activas{counts.resolved > 0 ? ` · ${counts.resolved} resueltas` : ''}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-900" />
          Esquema de permisos operativos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">Rodrigo</span>
            <p className="text-slate-600 leading-relaxed">
              Administración total: crea, edita, libera, bloquea, resuelve, reabre y elimina tareas.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">Nicolás y Noemí</span>
            <p className="text-slate-600 leading-relaxed">
              Gestión operativa completa: crean, editan, liberan, bloquean, resuelven y reabren tareas.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">Laura, Gabriela y Sebastián</span>
            <p className="text-slate-600 leading-relaxed">
              Ven el tablero, crean tareas, toman tareas disponibles, actualizan las propias e informan bloqueos.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-900 block mb-1">Dr. Lora y Yasku</span>
            <p className="text-slate-600 leading-relaxed">
              Ven el tablero, crean tareas, toman tareas disponibles y actualizan únicamente las propias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

