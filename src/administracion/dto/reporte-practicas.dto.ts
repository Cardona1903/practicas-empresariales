import { EstadoPostulacion } from '../../postulacion/enums/estado-postulacion.enum';

/**
 * Resumen global de postulaciones desglosado por cada estado de la máquina (CU-08).
 */
export class ResumenEstadosPostulacionDto {
  totalPostulaciones!: number;
  recibidas!: number;
  enRevision!: number;
  validadas!: number;
  rechazadas!: number;
}

/**
 * Detalle del estado de la práctica y horas verificadas consolidadas de un estudiante (CU-08).
 */
export class IndicadorPracticaEstudianteDto {
  postulacionId!: string;
  estudianteId!: string;
  programaAcademico!: string;
  estadoPostulacion!: EstadoPostulacion;
  postulacionValidada!: boolean;
  totalHorasValidadas!: number;
}

/**
 * DTO de salida para el reporte consolidado del estado de las prácticas en curso (CU-08).
 */
export class ReportePracticasDto {
  resumenPostulaciones!: ResumenEstadosPostulacionDto;
  practicas!: IndicadorPracticaEstudianteDto[];
}
