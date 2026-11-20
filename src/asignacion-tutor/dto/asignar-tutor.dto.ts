import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO de entrada para asignar o actualizar el tutor/supervisor empresarial de un estudiante (CU-03).
 */
export class AsignarTutorDto {
  @IsString({ message: 'El documento del estudiante debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El documento del estudiante es obligatorio' })
  estudianteId!: string;

  @IsString({ message: 'El correo del supervisor debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El correo del supervisor es obligatorio' })
  @IsEmail({}, { message: 'El correo del supervisor debe tener un formato de correo electrónico válido' })
  correoSupervisor!: string;

  @IsOptional()
  @IsString({ message: 'El nombre del supervisor debe ser una cadena de texto' })
  nombreSupervisor?: string;
}
