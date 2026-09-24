import { Task, Priority } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatHeaderDate(date: Date = new Date()): string {
  // Format: "Miércoles, 9 de septiembre"
  const formatted = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function getInitials(name: string): string {
  if (!name) return '';
  if (name.toLowerCase().startsWith('dr.')) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `D${parts[1].charAt(0).toUpperCase()}`;
    }
    return 'DL';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function formatHumanDeadline(
  dueDate?: string,
  dueTime?: string,
  todayStr: string = getTodayDateString()
): { text: string; isOverdue: boolean; isToday: boolean; isTomorrow: boolean } {
  if (!dueDate) {
    return { text: 'Sin vencimiento', isOverdue: false, isToday: false, isTomorrow: false };
  }

  const [y1, m1, d1] = dueDate.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);

  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) {
    return { text: dueDate, isOverdue: false, isToday: false, isTomorrow: false };
  }

  const targetDate = new Date(y1, m1 - 1, d1);
  const baseDate = new Date(y2, m2 - 1, d2);
  const diffDays = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const timeSuffix = dueTime ? ` · ${dueTime}` : '';

  if (diffDays < 0) {
    if (diffDays === -1) {
      return { text: `Venció ayer${timeSuffix}`, isOverdue: true, isToday: false, isTomorrow: false };
    }
    if (diffDays >= -3) {
      return { text: `Venció hace ${Math.abs(diffDays)} días`, isOverdue: true, isToday: false, isTomorrow: false };
    }
    return { text: `Venció el ${formatShortDate(dueDate)}`, isOverdue: true, isToday: false, isTomorrow: false };
  }

  if (diffDays === 0) {
    // Check if time has already passed today
    let isPastTime = false;
    if (dueTime) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      if (dueTime < currentTime) {
        isPastTime = true;
      }
    }

    if (isPastTime) {
      return { text: `Venció hoy${timeSuffix}`, isOverdue: true, isToday: true, isTomorrow: false };
    }

    return { text: `Vence hoy${timeSuffix}`, isOverdue: false, isToday: true, isTomorrow: false };
  }

  if (diffDays === 1) {
    return { text: `Vence mañana${timeSuffix}`, isOverdue: false, isToday: false, isTomorrow: true };
  }

  if (diffDays <= 4) {
    return { text: `Vence en ${diffDays} días${timeSuffix}`, isOverdue: false, isToday: false, isTomorrow: false };
  }

  return { text: `Vence el ${formatShortDate(dueDate)}`, isOverdue: false, isToday: false, isTomorrow: false };
}

/**
 * Group meetings are scheduled events, never deadlines. Keep their date and
 * time literal so the card and the editor describe the same appointment.
 */
export function formatMeetingDateTime(dueDate?: string, dueTime?: string): string {
  if (!dueDate) return 'Fecha a confirmar';

  const [year, month, day] = dueDate.split('-').map(Number);
  if (!year || !month || !day) return dueTime ? `${dueDate} · ${dueTime}` : dueDate;

  const date = new Date(year, month - 1, day);
  const formattedDate = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  return dueTime ? `${capitalizedDate} · ${dueTime}` : capitalizedDate;
}

export function formatResponsibleLabel(name?: string): string {
  if (!name || !name.trim() || name === 'Sin asignar' || name === 'Disponible') {
    return 'Disponible';
  }
  return `A cargo de: ${name.trim()}`;
}

export function getTaskDueCategory(task: Task, todayStr: string = getTodayDateString()): 'vencida' | 'hoy' | 'proxima' {
  if (!task.dueDate) return 'proxima';
  if (task.dueDate < todayStr) return 'vencida';
  if (task.dueDate === todayStr) {
    // If due today, check if time has passed and not resolved
    if (task.dueTime && task.status !== 'RESUELTA') {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      if (task.dueTime < currentTime) {
        return 'vencida';
      }
    }
    return 'hoy';
  }
  return 'proxima';
}

const PRIORITY_ORDER: Record<Priority, number> = {
  CRITICA: 4,
  ALTA: 3,
  NORMAL: 2,
  BAJA: 1,
};

export function sortTasksByPriorityAndTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary: Priority descending
    const pDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
    if (pDiff !== 0) return pDiff;

    // Secondary: Due date ascending
    if (a.dueDate !== b.dueDate) {
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    }

    // Tertiary: Due time ascending
    const timeA = a.dueTime || '23:59';
    const timeB = b.dueTime || '23:59';
    return timeA.localeCompare(timeB);
  });
}

export function formatAuditDateTime(isoStr?: string): string {
  if (!isoStr) return 'Fecha no registrada';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} · ${hours}:${minutes} hs`;
  } catch (e) {
    return isoStr;
  }
}


