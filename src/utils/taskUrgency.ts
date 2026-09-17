import { Task, Priority } from '../types';
import { getTodayDateString, formatHumanDeadline } from './dateUtils';
import { designTokens } from '../theme/tokens';

export type CardColorTheme = 'red' | 'amber' | 'blue' | 'green' | 'slate';
export type CardVisualRole = 'primary' | 'secondary' | 'standard';

export interface TaskUrgencyVisuals {
  score: number;
  colorTheme: CardColorTheme;
  isOverdueAndBlocked: boolean;
  isOverdue: boolean;
  isBlocked: boolean;
  isCritical: boolean;
  isDueToday: boolean;
  badgeLabel: string;
  badgeIconType: 'ban' | 'alert' | 'calendar' | 'clock' | 'check';
  badgeClass: string;
  leftBarClass: string;
  bgTintClass: string;
  borderClass: string;
  bottomLeftIcon: 'ban' | 'alert' | 'clock' | 'check';
  bottomLeftText: string;
  bottomLeftClass: string;
}

/**
 * Calculates a realistic importance score for tasks based on:
 * - tarea vencida (dueDate < today)
 * - bloqueada (status === 'BLOQUEADA')
 * - vence hoy (dueDate === today)
 * - prioridad (CRITICA > ALTA > NORMAL > BAJA)
 * - falta de avance (status === 'PENDIENTE')
 *
 * Mandatory rule: "Una tarea vencida y bloqueada debe ser siempre la más visible."
 */
export function calculateTaskUrgencyScore(task: Task, todayStr: string = getTodayDateString()): number {
  if (task.status === 'RESUELTA') {
    return -100;
  }

  let score = 0;
  const isBlocked = task.status === 'BLOQUEADA';
  const isOverdue = !!(task.dueDate && task.dueDate < todayStr);
  const isDueToday = task.dueDate === todayStr;
  const isCritical = task.priority === 'CRITICA';
  const isAlta = task.priority === 'ALTA';
  const isPending = task.status === 'PENDIENTE';

  // Overdue AND Blocked = Absolute highest priority
  if (isOverdue && isBlocked) {
    score += 1500;
  } else if (isBlocked) {
    score += 700;
  } else if (isOverdue) {
    score += 600;
  }

  // Priority weight
  if (isCritical) {
    score += 350;
  } else if (isAlta) {
    score += 180;
  } else if (task.priority === 'NORMAL') {
    score += 80;
  } else {
    score += 20;
  }

  // Due today weight
  if (isDueToday) {
    score += 160;
    // Morning/earlier deadlines get a slight edge for actionability
    if (task.dueTime) {
      const [hours] = task.dueTime.split(':').map(Number);
      if (!isNaN(hours)) {
        score += Math.max(0, (24 - hours) * 2);
      }
    }
  }

  // Falta de avance: pending tasks that haven't been started yet
  if (isPending) {
    score += 40;
  }

  return score;
}

/**
 * Derives visual styling attributes using centralized semantic tokens.
 * Balances contrast and tone: not all critical tasks should compete in identical deep red.
 */
export function getTaskVisuals(task: Task, todayStr: string = getTodayDateString()): TaskUrgencyVisuals {
  const isBlocked = task.status === 'BLOQUEADA';
  const isResolved = task.status === 'RESUELTA';
  const isOverdue = !!(task.dueDate && task.dueDate < todayStr);
  const isDueToday = task.dueDate === todayStr;
  const isCritical = task.priority === 'CRITICA';
  const isAlta = task.priority === 'ALTA';
  const isOverdueAndBlocked = isOverdue && isBlocked;

  const score = calculateTaskUrgencyScore(task, todayStr);
  const deadline = formatHumanDeadline(task.dueDate, task.dueTime, todayStr);

  let colorTheme: CardColorTheme = 'blue';
  let badgeLabel = '';
  let badgeIconType: TaskUrgencyVisuals['badgeIconType'] = 'clock';
  let badgeClass = '';
  let leftBarClass = '';
  let bgTintClass = '';
  let borderClass = '';
  let bottomLeftIcon: TaskUrgencyVisuals['bottomLeftIcon'] = 'clock';
  let bottomLeftText = '';
  let bottomLeftClass = '';

  if (isResolved) {
    colorTheme = 'green';
    badgeLabel = 'RESUELTA';
    badgeIconType = 'check';
    badgeClass = designTokens.state.success.badge;
    leftBarClass = designTokens.state.success.leftBar;
    bgTintClass = designTokens.state.success.bg;
    borderClass = designTokens.state.success.border;
    bottomLeftIcon = 'check';
    bottomLeftText = 'Completada';
    bottomLeftClass = designTokens.state.success.bottomText;
  } else if (isOverdueAndBlocked) {
    // HIGHEST VISUAL ALERT: Single clear, unified badge
    colorTheme = 'red';
    badgeLabel = 'BLOQUEADA · VENCIDA';
    badgeIconType = 'ban';
    badgeClass = designTokens.state.blocked.badge;
    leftBarClass = designTokens.state.blocked.leftBar;
    bgTintClass = designTokens.state.blocked.bg;
    borderClass = designTokens.state.blocked.border;
    bottomLeftIcon = 'ban';
    bottomLeftText = task.blockReason ? `${deadline.text} · ${task.blockReason}` : `${deadline.text} · Bloqueo crítico`;
    bottomLeftClass = designTokens.state.blocked.bottomText;
  } else if (isBlocked) {
    colorTheme = 'red';
    badgeLabel = 'BLOQUEADA';
    badgeIconType = 'ban';
    badgeClass = designTokens.state.blocked.badge;
    leftBarClass = designTokens.state.blocked.leftBar;
    bgTintClass = designTokens.state.blocked.bg;
    borderClass = designTokens.state.blocked.border;
    bottomLeftIcon = 'ban';
    bottomLeftText = task.blockReason || 'Esperando validación';
    bottomLeftClass = designTokens.state.blocked.bottomText;
  } else if (isOverdue) {
    colorTheme = 'red';
    badgeLabel = isCritical ? 'CRÍTICA · VENCIDA' : 'VENCIDA';
    badgeIconType = 'alert';
    badgeClass = designTokens.state.critical.badge;
    leftBarClass = designTokens.state.critical.leftBar;
    bgTintClass = designTokens.state.critical.bg;
    borderClass = designTokens.state.critical.border;
    bottomLeftIcon = 'alert';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.critical.bottomText;
  } else if (isCritical) {
    // Critical priority requiring prompt attention
    colorTheme = 'red';
    badgeLabel = 'CRÍTICA';
    badgeIconType = 'alert';
    badgeClass = designTokens.state.critical.badge;
    leftBarClass = designTokens.state.critical.leftBar;
    bgTintClass = designTokens.state.critical.bg;
    borderClass = designTokens.state.critical.border;
    bottomLeftIcon = task.dueTime ? 'clock' : 'alert';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.critical.bottomText;
  } else if (isDueToday && isAlta) {
    // Risk / Follow-up today (warm amber theme)
    colorTheme = 'amber';
    badgeLabel = 'HOY';
    badgeIconType = 'calendar';
    badgeClass = designTokens.state.warning.badge;
    leftBarClass = designTokens.state.warning.leftBar;
    bgTintClass = designTokens.state.warning.bg;
    borderClass = designTokens.state.warning.border;
    bottomLeftIcon = 'clock';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.warning.bottomText;
  } else if (isAlta) {
    // High priority without immediate due today
    colorTheme = 'amber';
    badgeLabel = 'ALTA';
    badgeIconType = 'alert';
    badgeClass = designTokens.state.warning.badge;
    leftBarClass = designTokens.state.warning.leftBar;
    bgTintClass = designTokens.state.warning.bg;
    borderClass = designTokens.state.warning.border;
    bottomLeftIcon = 'clock';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.warning.bottomText;
  } else if (isDueToday) {
    // Normal task due today (sky blue theme)
    colorTheme = 'blue';
    badgeLabel = 'HOY';
    badgeIconType = 'calendar';
    badgeClass = designTokens.state.info.badge;
    leftBarClass = designTokens.state.info.leftBar;
    bgTintClass = designTokens.state.info.bg;
    borderClass = designTokens.state.info.border;
    bottomLeftIcon = 'clock';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.info.bottomText;
  } else {
    // Standard normal or low priority
    colorTheme = 'slate';
    badgeLabel = task.priority;
    badgeIconType = 'clock';
    badgeClass = designTokens.state.neutral.badge;
    leftBarClass = designTokens.state.neutral.leftBar;
    bgTintClass = designTokens.state.neutral.bg;
    borderClass = designTokens.state.neutral.border;
    bottomLeftIcon = 'clock';
    bottomLeftText = deadline.text;
    bottomLeftClass = designTokens.state.neutral.bottomText;
  }

  return {
    score,
    colorTheme,
    isOverdueAndBlocked,
    isOverdue,
    isBlocked,
    isCritical,
    isDueToday,
    badgeLabel,
    badgeIconType,
    badgeClass,
    leftBarClass,
    bgTintClass,
    borderClass,
    bottomLeftIcon,
    bottomLeftText,
    bottomLeftClass,
  };
}

/**
 * Calculates responsive column spans for Foco del Día.
 * Ensures:
 * - Exactly ONE dominant card taking maximum visual prominence (e.g. 7 or 8 columns on lg)
 * - One or two secondary cards (e.g. 5 or 4 columns)
 * - Rest of the cards scale down cleanly (e.g. 4 columns)
 * - Zero horizontal overflow, optimized for 1366 × 768 laptop screens.
 */
export function calculateCardColumnSpans(tasks: Task[]): {
  spans: Record<string, string>;
  roles: Record<string, CardVisualRole>;
} {
  const spans: Record<string, string> = {};
  const roles: Record<string, CardVisualRole> = {};
  const total = tasks.length;

  if (total === 0) return { spans, roles };

  if (total === 1) {
    spans[tasks[0].id] = 'col-span-1 md:col-span-2 lg:col-span-8 lg:col-start-3';
    roles[tasks[0].id] = 'primary';
    return { spans, roles };
  }

  if (total === 2) {
    spans[tasks[0].id] = 'col-span-1 md:col-span-1 lg:col-span-7';
    roles[tasks[0].id] = 'primary';
    spans[tasks[1].id] = 'col-span-1 md:col-span-1 lg:col-span-5';
    roles[tasks[1].id] = 'secondary';
    return { spans, roles };
  }

  if (total === 3) {
    spans[tasks[0].id] = 'col-span-1 md:col-span-2 lg:col-span-6';
    roles[tasks[0].id] = 'primary';
    spans[tasks[1].id] = 'col-span-1 md:col-span-1 lg:col-span-3';
    roles[tasks[1].id] = 'secondary';
    spans[tasks[2].id] = 'col-span-1 md:col-span-1 lg:col-span-3';
    roles[tasks[2].id] = 'secondary';
    return { spans, roles };
  }

  if (total === 4) {
    // Row 1: Dominant (7) + Secondary (5)
    // Row 2: Standard (6) + Standard (6)
    spans[tasks[0].id] = 'col-span-1 md:col-span-1 lg:col-span-7';
    roles[tasks[0].id] = 'primary';
    spans[tasks[1].id] = 'col-span-1 md:col-span-1 lg:col-span-5';
    roles[tasks[1].id] = 'secondary';
    spans[tasks[2].id] = 'col-span-1 md:col-span-1 lg:col-span-6';
    roles[tasks[2].id] = 'standard';
    spans[tasks[3].id] = 'col-span-1 md:col-span-1 lg:col-span-6';
    roles[tasks[3].id] = 'standard';
    return { spans, roles };
  }

  // 5 or more tasks (the standard Foco del Día layout)
  // Row 1: Dominant Hero (7) + Secondary (5)
  // Row 2: Secondary 2 (4) + Standard (4) + Standard (4)
  tasks.forEach((t, index) => {
    if (index === 0) {
      spans[t.id] = 'col-span-1 md:col-span-1 lg:col-span-7';
      roles[t.id] = 'primary';
    } else if (index === 1) {
      spans[t.id] = 'col-span-1 md:col-span-1 lg:col-span-5';
      roles[t.id] = 'secondary';
    } else {
      spans[t.id] = 'col-span-1 md:col-span-1 lg:col-span-4';
      roles[t.id] = index === 2 ? 'secondary' : 'standard';
    }
  });

  return { spans, roles };
}
