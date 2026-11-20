import { IsEnum, IsOptional } from 'class-validator';
import { EstadoPostulacion } from '../enums/estado-postulacion.enum';

/**
 * DTO para la consulta y filtrado opcional de peticiones de postulación (CU-01).
 * Permite filtrar por estado válido de la máquina de estados (ADR-003).
 */
export class ConsultarPostulacionesFiltroDto {
  @IsOptional()
  @IsEnum(EstadoPostulacion, {
    message:
      'El estado proporcionado no es un estado válido de postulación (RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA)',
  })
  estado?: EstadoPostulacion;
}
