import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * DTO de entrada para el registro de horas de práctica por el supervisor externo (CU-12).
 * Valida que la fecha sea una fecha ISO válida, las horas sean mayores a 0
 * y la descripción sea una cadena de texto opcional.
 */
export class RegistrarHorasDto {
  @IsString({ message: 'La fecha debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  @IsDateString({}, { message: 'La fecha debe tener un formato ISO válido (YYYY-MM-DD)' })
  fecha!: string;

  @IsNumber({}, { message: 'La cantidad de horas debe ser un número' })
  @IsPositive({ message: 'La cantidad de horas debe ser mayor a 0' })
  horas!: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  descripcion?: string;
}
