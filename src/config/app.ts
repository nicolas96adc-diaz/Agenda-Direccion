/**
 * Actualizar este valor en cada publicación de Clínica Planner.
 * Se mantiene aquí para que la versión visible no quede duplicada en la interfaz.
 */
export const APP_VERSION = '1.0.4';

/**
 * Única fuente de verdad para el aviso posterior a cada publicación.
 * Para una versión futura, actualizar APP_VERSION y este contenido.
 */
export const APP_RELEASE = {
  version: APP_VERSION,
  title: 'Novedades de esta versión',
  changes: [
    'La asignación y derivación de tareas fue corregida.',
    'Rodrigo, Nicolás y Noemí pueden derivar tareas según los permisos de su perfil.',
    'Las prioridades se simplificaron: Normal es amarillo y Crítica es rojo.',
  ],
  fixes: [
    '“✓ Listo” funciona correctamente en tareas viejas y nuevas, sin eliminarlas.',
  ],
  improvements: [
    'Las tareas y notas antiguas mantienen compatibilidad con la nueva lógica.',
    'La confirmación de lectura queda guardada por usuario y por versión.',
  ],
} as const;
