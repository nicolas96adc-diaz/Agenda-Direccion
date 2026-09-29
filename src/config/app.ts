/**
 * Actualizar este valor en cada publicación de Clínica Planner.
 * Se mantiene aquí para que la versión visible no quede duplicada en la interfaz.
 */
export const APP_VERSION = '1.0.3';

/**
 * Única fuente de verdad para el aviso posterior a cada publicación.
 * Para una versión futura, actualizar APP_VERSION y este contenido.
 */
export const APP_RELEASE = {
  version: APP_VERSION,
  title: 'Novedades de esta versión',
  changes: [
    'Ahora cada integrante ve un resumen claro de los cambios al ingresar.',
    'Nicolás, Noemí y Rodrigo pueden editar y eliminar tareas y anotaciones del equipo.',
  ],
  fixes: [
    'Corregido el flujo para tomar tareas que figuraban como disponibles.',
  ],
  improvements: [
    'La confirmación de lectura queda guardada por usuario y por versión.',
  ],
} as const;
