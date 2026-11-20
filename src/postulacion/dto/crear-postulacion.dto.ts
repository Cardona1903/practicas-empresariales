import { IsArray, IsNotEmpty, IsString, ValidateNested, ArrayNotEmpty, Matches } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO que representa un archivo adjunto enviado en la postulación.
 */
export class ArchivoAdjuntoDto {
  @IsString({ message: 'El nombre del archivo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del archivo es requerido' })
  @Matches(/\.pdf$/i, { message: 'Solo se admiten documentos en formato PDF (.pdf)' })
  nombreArchivo: string;

  @IsString({ message: 'El contenido del archivo en base64 es requerido' })
  @IsNotEmpty({ message: 'El contenido del archivo no puede estar vacío' })
  contenidoBase64: string;

  @IsString({ message: 'El tipo MIME debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo MIME es requerido' })
  mimetype: string;
}

/**
 * DTO de entrada para la creación de una postulación (CU-09).
 * Valida los documentos adjuntos según las convenciones de AGENTS.md.
 */
export class CrearPostulacionDto {
  @IsArray({ message: 'Los documentos adjuntos deben proporcionarse como un arreglo' })
  @ArrayNotEmpty({ message: 'Debe adjuntar los documentos exigidos por su programa académico' })
  @ValidateNested({ each: true })
  @Type(() => ArchivoAdjuntoDto)
  documentos: ArchivoAdjuntoDto[];
}
