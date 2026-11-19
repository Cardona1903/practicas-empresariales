import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoPostulacion } from '../enums/estado-postulacion.enum';

/**
 * DTO de entrada para revisar y cambiar el estado de una postulación (CU-02, ADR-003).
 * Valida que el nuevo estado solicitado pertenezca a EstadoPostulacion y permite enviar
 * el motivo cuando el estado es RECHAZADA.
 */
export class RevisarPostulacionDto {
  @IsEnum(EstadoPostulacion, {
    message:
      'El estado solicitado no pertenece a la máquina de estados válida (RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA)',
  })
  estado: EstadoPostulacion;

  @IsOptional()
  @IsString({
    message: 'El motivo del rechazo debe ser una cadena de texto',
  })
  motivo?: string;
}
