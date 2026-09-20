/**
 * Sistema de Diseño Semántico - Clínica Chutro
 * Tokens centralizados para colores, superficies, estados, tipografía, espaciado y radios.
 * Prohibido hardcodear colores o estilos en JSX fuera de estos tokens.
 */

export const designTokens = {
  // Superficies y Fondos
  surface: {
    appBackground: 'bg-slate-100/70',
    card: 'bg-white',
    cardElevated: 'bg-white shadow-xs hover:shadow-md transition-shadow duration-150',
    sidebar: 'bg-[#142136]',
    sidebarActive: 'bg-slate-700/60 text-white font-semibold',
    sidebarHover: 'hover:bg-slate-800/60 hover:text-white',
    panelHeader: 'bg-white',
    input: 'bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800',
    pill: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
    emptyState: 'bg-slate-50/70 border-dashed border-slate-200',
  },

  // Textos y Jerarquía
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    muted: 'text-slate-400',
    brand: 'text-[#142136]',
    onDark: 'text-white',
    onDarkMuted: 'text-slate-300',
  },

  // Escala Tipográfica Semántica
  typography: {
    pageTitle: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none',
    pageSubtitle: 'text-xs sm:text-sm text-slate-500 font-medium',
    breadcrumb: 'text-[11px] font-bold uppercase tracking-wider text-slate-600',
    sectionHeader: 'text-sm font-extrabold uppercase tracking-wider text-slate-700',
    cardTitlePrimary: 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug',
    cardTitleSecondary: 'text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug',
    cardTitleStandard: 'text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug',
    metricValue: 'text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none',
    metricLabel: 'text-[11px] font-bold uppercase tracking-wide text-slate-600 mt-1',
    badge: 'text-[11px] font-bold tracking-wide uppercase',
    responsibleTag: 'text-[11px] font-semibold text-slate-700 whitespace-nowrap',
    footerText: 'text-xs text-slate-500',
  },

  // Bordes
  border: {
    subtle: 'border-slate-100',
    default: 'border-slate-200/90',
    strong: 'border-slate-300',
    sidebar: 'border-slate-800',
    focus: 'focus:ring-2 focus:ring-slate-900 focus:border-transparent',
  },

  // Radios de Borde
  radius: {
    card: 'rounded-2xl',
    panel: 'rounded-2xl',
    cardLarge: 'rounded-2xl',
    subcard: 'rounded-xl',
    pill: 'rounded-md',
    badge: 'rounded-md',
    button: 'rounded-lg',
    full: 'rounded-full',
  },

  // Sombras
  shadow: {
    subtle: 'shadow-2xs',
    card: 'shadow-xs hover:shadow-md transition-shadow duration-150',
    cardActive: 'shadow-md ring-1 ring-slate-900/10',
    modal: 'shadow-2xl',
  },

  // Espaciados
  spacing: {
    pageContainer: 'max-w-[1400px] mx-auto',
    sectionGap: 'space-y-4 sm:space-y-5',
    gridGap: 'gap-3.5 sm:gap-4',
    cardPaddingPrimary: 'p-4 sm:p-5',
    cardPaddingStandard: 'p-3.5 sm:p-4',
    panelPadding: 'p-4 sm:p-5',
  },

  // Estados Semánticos (Superficie neutra + Icono + Texto + Color como señal)
  // Cumpliendo la regla: sin fondos fucsias/rosados en todas las tarjetas
  state: {
    // Crítico / Urgente
    critical: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-rose-300',
      leftBar: 'border-l-4 border-rose-500',
      badge: 'text-rose-700 bg-rose-50 border-rose-200/80 font-bold',
      bottomText: 'text-rose-700 font-semibold',
      accent: 'text-rose-600',
      metricBg: 'bg-rose-50/80 border-rose-100',
      metricText: 'text-rose-700',
    },

    // Bloqueado (Máxima señal operativa)
    blocked: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-rose-300',
      leftBar: 'border-l-4 border-rose-600',
      badge: 'text-rose-800 bg-rose-100/80 border-rose-300/80 font-black',
      bottomText: 'text-rose-800 font-bold',
      accent: 'text-rose-600',
      metricBg: 'bg-rose-50/80 border-rose-100',
      metricText: 'text-rose-700',
    },

    // Advertencia / Seguimiento / Riesgo
    warning: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-amber-300',
      leftBar: 'border-l-4 border-amber-500',
      badge: 'text-amber-800 bg-amber-50 border-amber-200 font-bold',
      bottomText: 'text-amber-800 font-semibold',
      accent: 'text-amber-600',
      metricBg: 'bg-amber-50/80 border-amber-100',
      metricText: 'text-amber-700',
    },

    // Informativo / Hoy / En proceso
    info: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-sky-300',
      leftBar: 'border-l-4 border-sky-500',
      badge: 'text-sky-800 bg-sky-50 border-sky-200 font-bold',
      bottomText: 'text-sky-700 font-semibold',
      accent: 'text-sky-600',
      metricBg: 'bg-sky-50/80 border-sky-100',
      metricText: 'text-sky-700',
    },

    // Éxito / Resuelta
    success: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-emerald-300',
      leftBar: 'border-l-4 border-emerald-500',
      badge: 'text-emerald-800 bg-emerald-50 border-emerald-200 font-bold',
      bottomText: 'text-emerald-700 font-semibold',
      accent: 'text-emerald-600',
      metricBg: 'bg-emerald-50/80 border-emerald-100',
      metricText: 'text-emerald-700',
    },

    // Neutro / Estándar
    neutral: {
      bg: 'bg-white',
      border: 'border-slate-200/90 hover:border-slate-300',
      leftBar: 'border-l-4 border-slate-300',
      badge: 'text-slate-700 bg-slate-100 border-slate-200 font-bold',
      bottomText: 'text-slate-600 font-medium',
      accent: 'text-slate-500',
      metricBg: 'bg-slate-50 border-slate-100',
      metricText: 'text-slate-700',
    },
  },
} as const;
