import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Search, Calendar, User, History, ChevronDown, ChevronUp, Clock, ShieldCheck } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { formatResponsibleLabel, formatAuditDateTime } from '../utils/dateUtils';

export const HistorialView: React.FC = () => {
  const { resolvedTasks, toggleTaskResolved, openEditModal, getUserPermissions } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const filteredTasks = resolvedTasks.filter(
    t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.closedBy && t.closedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.createdBy && t.createdBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto pb-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Historial de Tareas Resueltas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                {resolvedTasks.length} completadas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Registro auditable y trazabilidad completa: creador, modificaciones, resoluciones y fechas.
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-historial-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, responsable o quién cerró..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
          />
        </div>
      </div>

      {/* List of Resolved Tasks with Full Traceability */}
      {filteredTasks.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 overflow-hidden">
          {filteredTasks.map(task => {
            const isExpanded = expandedTaskId === task.id;
            const perms = getUserPermissions(task);

            return (
              <div
                key={task.id}
                id={`history-task-${task.id}`}
                className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Task Info & Title */}
                  <div
                    onClick={() => openEditModal(task)}
                    className="flex items-start gap-3.5 min-w-0 flex-1 cursor-pointer group"
                  >
                    <div className="mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base line-through group-hover:text-blue-950 transition-colors break-words">
                          {task.title}
                        </h3>
                        {task.priority === 'CRITICA' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Crítica
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-normal">
                          {task.description}
                        </p>
                      )}

                      {/* Clean Traceability Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        {/* Responsable */}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            Responsable
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {formatResponsibleLabel(task.assignee)}
                          </span>
                        </div>

                        {/* Cerrado por */}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                            Cerrado por
                          </span>
                          <span className="font-semibold text-emerald-900 truncate">
                            {task.closedBy || task.assignee}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {formatAuditDateTime(task.resolvedAt || task.updatedAt)}
                          </span>
                        </div>

                        {/* Creado por */}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            Creado por
                          </span>
                          <span className="font-medium text-slate-800 truncate">
                            {task.createdBy || 'Rodrigo Bustos'}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {formatAuditDateTime(task.createdAt)}
                          </span>
                        </div>

                        {/* Última modificación */}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            Última modif.
                          </span>
                          <span className="font-medium text-slate-800 truncate">
                            {task.lastModifiedBy || task.assignee}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {formatAuditDateTime(task.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-1">
                    {/* Toggle audit trail logs */}
                    {task.auditLog && task.auditLog.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedTaskId(prev => (prev === task.id ? null : task.id))
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                          isExpanded
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                        title="Ver bitácora de cambios"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Trazabilidad ({task.auditLog.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}

                    {/* Reabrir Tarea */}
                    <button
                      onClick={() => toggleTaskResolved(task.id)}
                      disabled={!perms.canResolveTask}
                      title={
                        perms.canResolveTask
                          ? 'Reabrir tarea y devolver a En Proceso'
                          : perms.restrictionReason || 'Permiso restringido'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
                        perms.canResolveTask
                          ? 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 cursor-pointer'
                          : 'text-slate-300 bg-slate-50 border border-slate-200/50 cursor-not-allowed'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Detailed Audit Trail */}
                {isExpanded && task.auditLog && task.auditLog.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 bg-slate-50/70 p-3.5 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Línea de tiempo de cambios y auditoría</span>
                    </div>

                    <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-3">
                      {task.auditLog.map((log, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-slate-400" />
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">
                              {log.byUserName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-white text-slate-600 border border-slate-200">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium">
                              {formatAuditDateTime(log.timestamp)}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-slate-600 text-xs mt-0.5 font-normal">
                              {log.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 sm:p-12 text-center shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            {searchTerm
              ? 'No se encontraron tareas resueltas que coincidan con la búsqueda.'
              : 'Aún no hay tareas marcadas como resueltas.'}
          </p>
        </div>
      )}
    </div>
  );
};
