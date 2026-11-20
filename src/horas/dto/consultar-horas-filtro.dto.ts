import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoHoras } from '../enums/estado-horas.enum';

/**
 * DTO de consulta para filtrar registros de horas por estado y/o estudianteId (CU-05).
 */
export class ConsultarHorasFiltroDto {
  @IsOptional()
  @IsEnum(EstadoHoras, {
    message: 'El filtro de estado debe ser REGISTRADA o VERIFICADA',
  })
  estado?: EstadoHoras;

  @IsOptional()
  @IsString({
    message: 'El filtro estudianteId debe ser una cadena de texto',
  })
  estudianteId?: string;
}
