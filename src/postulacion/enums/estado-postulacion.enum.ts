/**
 * Estados de la máquina de estados de postulación (ADR-003, RN-01).
 * La postulación se crea en estado RECIBIDA; sus transiciones son manuales sin automatizaciones.
 */
export enum EstadoPostulacion {
  RECIBIDA = 'RECIBIDA',
  EN_REVISION = 'EN_REVISION',
  VALIDADA = 'VALIDADA',
  RECHAZADA = 'RECHAZADA',
}
