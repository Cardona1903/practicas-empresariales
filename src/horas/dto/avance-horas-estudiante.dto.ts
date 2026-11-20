import { RegistroHoras } from '../entities/registro-horas.entity';

/**
 * DTO de salida para el avance de horas de práctica del estudiante autenticado (CU-10).
 */
export class AvanceHorasEstudianteDto {
  estudianteId!: string;
  totalHorasVerificadas!: number;
  totalHorasRegistradas!: number;
  totalHorasReportadas!: number;
  registros!: RegistroHoras[];
}
