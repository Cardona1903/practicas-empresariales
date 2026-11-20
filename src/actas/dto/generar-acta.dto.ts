import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO de entrada para la generación síncrona del acta final de práctica (CU-07).
 */
export class GenerarActaDto {
  @IsString({ message: 'El identificador del estudiante debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El identificador del estudiante (estudianteId) es obligatorio' })
  estudianteId!: string;
}
