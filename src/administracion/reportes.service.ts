import { Injectable } from '@nestjs/common';
import { PostulacionService } from '../postulacion/postulacion.service';
import { HorasService } from '../horas/horas.service';
import { EstadoPostulacion } from '../postulacion/enums/estado-postulacion.enum';
import {
  IndicadorPracticaEstudianteDto,
  ReportePracticasDto,
} from './dto/reporte-practicas.dto';

/**
 * Servicio del Módulo Administración (CU-08, ADR-001, Vista de Desarrollo 03-desarrollo.md).
 * Consolida los indicadores y reportes del estado de las prácticas en curso
 * consumiendo exclusivamente los servicios exportados PostulacionService y HorasService,
 * sin importar ni inyectar nunca Repository<Postulacion> ni Repository<RegistroHoras>.
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly postulacionService: PostulacionService,
    private readonly horasService: HorasService,
  ) {}

  /**
   * Genera el reporte consolidado del estado de las prácticas en curso (CU-08).
   */
  async consultarReporteEstadoPracticas(): Promise<ReportePracticasDto> {
    const postulaciones = await this.postulacionService.listarPostulaciones();

    let recibidas = 0;
    let enRevision = 0;
    let validadas = 0;
    let rechazadas = 0;

    const practicas: IndicadorPracticaEstudianteDto[] = [];

    for (const post of postulaciones) {
      if (post.estado === EstadoPostulacion.RECIBIDA) {
        recibidas++;
      } else if (post.estado === EstadoPostulacion.EN_REVISION) {
        enRevision++;
      } else if (post.estado === EstadoPostulacion.VALIDADA) {
        validadas++;
      } else if (post.estado === EstadoPostulacion.RECHAZADA) {
        rechazadas++;
      }

      const estudianteId = post.estudiante.documento;
      const postulacionValidada = await this.postulacionService.estaValidada(
        estudianteId,
      );
      const totalHorasValidadas = await this.horasService.totalHorasValidadas(
        estudianteId,
      );

      practicas.push({
        postulacionId: post.id,
        estudianteId,
        programaAcademico: post.estudiante.programaAcademico,
        estadoPostulacion: post.estado,
        postulacionValidada,
        totalHorasValidadas,
      });
    }

    return {
      resumenPostulaciones: {
        totalPostulaciones: postulaciones.length,
        recibidas,
        enRevision,
        validadas,
        rechazadas,
      },
      practicas,
    };
  }
}
