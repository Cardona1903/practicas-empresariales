import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Acta, EstadoActa } from './acta.entity';
import { GeneradorPdfService } from './generador-pdf.service';
import { PostulacionService } from '../postulacion/postulacion.service';
import { HorasService } from '../horas/horas.service';
import { DominioError } from '../compartido/errores/dominio-error';

// ADR-005: generacion sincrona, consolidacion transaccional, bitacora de
// auditoria. CU-07, "la razon de ser del sistema".
// ADR-001 en accion: este servicio NO importa los repositorios de
// Postulacion ni de Horas, solo sus servicios exportados.
@Injectable()
export class ActasService {
  constructor(
    @InjectRepository(Acta) private readonly actas: Repository<Acta>,
    private readonly generadorPdf: GeneradorPdfService,
    private readonly postulacionService: PostulacionService,
    private readonly horasService: HorasService,
  ) {}

  // CU-07, con EAC-01 (debe responder en <5s, 95% de las solicitudes) y
  // PA-04 (cada intento queda en la bitacora, exitoso o fallido).
  async generar(estudianteId: string, adminId: string): Promise<Acta> {
    try {
      const validada = await this.postulacionService.estaValidada(estudianteId);
      if (!validada) {
        throw new DominioError(
          'La postulacion del estudiante aun no esta validada (ver ADR-003).',
          'POSTULACION_NO_VALIDADA',
        );
      }

      const totalHoras = await this.horasService.totalHorasValidadas(estudianteId);
      const generadaEn = new Date();
      const pdfBuffer = await this.generadorPdf.generar({ estudianteId, totalHoras, fecha: generadaEn });

      const rutaPdf = path.join('actas-generadas', `${estudianteId}-${generadaEn.getTime()}.pdf`);
      await fs.mkdir(path.dirname(rutaPdf), { recursive: true });
      await fs.writeFile(rutaPdf, pdfBuffer);

      return this.actas.save(
        this.actas.create({
          estudianteId,
          totalHoras,
          estado: EstadoActa.GENERADA,
          rutaPdf,
          generadaEn,
          generadaPorAdminId: adminId,
        }),
      );
    } catch (error) {
      // ADR-006: se deja registrada la falla; NO se reintenta sola.
      const detalle = error instanceof Error ? error.message : 'Error desconocido';
      await this.actas.save(
        this.actas.create({
          estudianteId,
          estado: EstadoActa.FALLIDA,
          detalleError: detalle,
          generadaPorAdminId: adminId,
        }),
      );
      throw error;
    }
  }
}
