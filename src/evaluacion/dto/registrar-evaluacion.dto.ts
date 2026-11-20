import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO de entrada para el registro de la evaluación de desempeño por el supervisor externo (CU-13).
 * Valida que la calificación sea un número entre 0.0 y 5.0 y que los comentarios sean opcionales.
 */
export class RegistrarEvaluacionDto {
  @IsNumber({}, { message: 'La calificación debe ser un número' })
  @Min(0, { message: 'La calificación debe estar entre 0.0 y 5.0' })
  @Max(5, { message: 'La calificación debe estar entre 0.0 y 5.0' })
  calificacion!: number;

  @IsOptional()
  @IsString({ message: 'Los comentarios deben ser una cadena de texto' })
  comentarios?: string;
}
