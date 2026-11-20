/**
 * Enumeración EstadoHoras (Vista Lógica, Glosario, RN-01).
 * Estados posibles de un registro de horas de práctica:
 * - REGISTRADA: reportada por el supervisor externo (CU-12), sin verificación automática.
 * - VERIFICADA: aprobada manualmente por el personal administrativo (CU-05).
 */
export enum EstadoHoras {
  REGISTRADA = 'REGISTRADA',
  VERIFICADA = 'VERIFICADA',
}
