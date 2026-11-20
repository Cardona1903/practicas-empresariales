/**
 * Enumeración EstadoActa (Vista Lógica, Glosario, ADR-005, ADR-006, RN-01).
 * Estados posibles del acta final de práctica:
 * - SOLICITADA: Petición formal de acta final radicada por el estudiante (CU-11), pendiente de confirmación y expedición manual administrativa (RN-01).
 * - GENERADA: PDF renderizado en memoria, guardado en almacenamiento institucional local y consolidado exitosamente (CU-07).
 * - FALLIDA: Fallo técnico durante la generación o almacenamiento del PDF; requiere reintento manual sin automatización (RN-01).
 */
export enum EstadoActa {
  SOLICITADA = 'SOLICITADA',
  GENERADA = 'GENERADA',
  FALLIDA = 'FALLIDA',
}
