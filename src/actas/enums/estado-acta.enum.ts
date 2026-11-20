/**
 * Enumeración EstadoActa (Vista Lógica, Glosario, ADR-005, ADR-006).
 * Estados posibles del acta final de práctica:
 * - GENERADA: PDF renderizado en memoria, guardado en almacenamiento institucional local y consolidado exitosamente.
 * - FALLIDA: Fallo técnico durante la generación o almacenamiento del PDF; requiere reintento manual sin automatización (RN-01).
 */
export enum EstadoActa {
  GENERADA = 'GENERADA',
  FALLIDA = 'FALLIDA',
}
