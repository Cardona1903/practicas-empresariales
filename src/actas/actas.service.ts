import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Acta } from './entities/acta.entity';
import { EstadoActa } from './enums/estado-acta.enum';
import { PostulacionService } from '../postulacion/postulacion.service';
import { HorasService } from '../horas/horas.service';
import { ConfiguracionService } from '../compartido/configuracion/configuracion.service';
import { AuditoriaService } from '../compartido/auditoria/auditoria.service';
import {
  ActaNoEncontradaError,
  ActaYaExisteError,
  FalloGeneracionActaError,
  HorasInsuficientesError,
  PostulacionNoValidadaError,
  TransicionEstadoActaInvalidaError,
} from '../compartido/errores/dominio.error';

/**
 * Servicio del Módulo Actas (CU-07, ADR-001, ADR-003, ADR-005, ADR-006, ADR-007, PA-04, EAC-01).
 * - Orquesta la expedición síncrona del acta final de práctica en PDF.
 * - Respeta la regla estricta de modularidad (ADR-001): interactúa exclusivamente con
 *   PostulacionService, HorasService, ConfiguracionService y AuditoriaService exportados,
 *   sin inyectar ni importar repositorios de otros módulos.
 * - Si ocurre un fallo técnico al generar o almacenar el PDF, registra el acta en estado
 *   FALLIDA con detalleError y lanza FalloGeneracionActaError (HTTP 500) sin reintentos automáticos (RN-01, ADR-006).
 */
@Injectable()
export class ActasService {
  private directorioAlmacenamiento = path.resolve(process.cwd(), 'uploads', 'actas');

  constructor(
    @InjectRepository(Acta)
    private readonly actaRepo: Repository<Acta>,
    private readonly postulacionService: PostulacionService,
    private readonly horasService: HorasService,
    private readonly configuracionService: ConfiguracionService,
    private readonly auditoriaService: AuditoriaService,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  /**
   * Permite configurar el directorio local on-premise donde se almacenan los PDFs de las actas (RT-01).
   */
  configurarDirectorioAlmacenamiento(directorio: string): void {
    this.directorioAlmacenamiento = directorio;
  }

  /**
   * Radica la petición formal del acta final de práctica por parte del estudiante (CU-11).
   * - Verifica que no exista ya una petición en estado SOLICITADA ni un acta en estado GENERADA.
   * - Verifica que la postulación esté en estado VALIDADA (ADR-003).
   * - Verifica que las horas en estado VERIFICADA cumplan con el mínimo del programa académico (CU-05, ADR-007).
   * - Registra la entidad Acta en estado SOLICITADA con rutaPdf = null, sin generar el PDF automáticamente (RN-01).
   * - Registra el evento en la bitácora de auditoría con el documento del estudiante como actor (PA-04).
   */
  async solicitarActa(estudianteId: string): Promise<Acta> {
    // 1. Verificar que no exista ya una petición activa (SOLICITADA) o un acta expedida (GENERADA)
    const solicitudExistente = await this.actaRepo.findOne({
      where: {
        estudianteId,
        estado: EstadoActa.SOLICITADA,
      },
    });

    if (solicitudExistente) {
      throw new ActaYaExisteError(
        'El estudiante ya cuenta con una petición de acta final registrada o con un acta oficial generada',
      );
    }

    const actaGeneradaExistente = await this.actaRepo.findOne({
      where: {
        estudianteId,
        estado: EstadoActa.GENERADA,
      },
    });

    if (actaGeneradaExistente) {
      throw new ActaYaExisteError(
        'El estudiante ya cuenta con una petición de acta final registrada o con un acta oficial generada',
      );
    }

    // 2. Verificar que la postulación del estudiante exista y esté en estado VALIDADA (ADR-001, ADR-003)
    const estaValidada = await this.postulacionService.estaValidada(estudianteId);
    if (!estaValidada) {
      throw new PostulacionNoValidadaError('la postulación aún no está validada');
    }

    const postulacion = await this.postulacionService.obtenerPorEstudiante(estudianteId);
    if (!postulacion || postulacion.estado !== 'VALIDADA') {
      throw new PostulacionNoValidadaError('la postulación aún no está validada');
    }

    // 3. Consultar requisitos vigentes del programa académico (ADR-007) y total de horas verificadas (CU-05)
    const programaAcademico = postulacion.estudiante.programaAcademico;
    const requisito = await this.configuracionService.obtenerRequisitosVigentes(programaAcademico);
    const totalHoras = await this.horasService.totalHorasValidadas(estudianteId);

    if (totalHoras < requisito.horasMinimas) {
      throw new HorasInsuficientesError(
        'El estudiante no cumple con las horas mínimas verificadas requeridas por su programa académico',
      );
    }

    // 4. Crear y guardar el registro de Acta en estado SOLICITADA sin generar el archivo PDF (RN-01)
    const peticionActa = this.actaRepo.create({
      estudianteId,
      totalHoras,
      rutaPdf: null,
      estado: EstadoActa.SOLICITADA,
      detalleError: null,
    });

    const peticionGuardada = await this.actaRepo.save(peticionActa);

    // 5. Registrar el evento de solicitud de acta en la bitácora de auditoría (PA-04)
    await this.auditoriaService.registrarEvento(
      'SOLICITUD_ACTA',
      'EXITOSO',
      estudianteId,
      JSON.stringify({
        actaId: peticionGuardada.id,
        estudianteId,
        programaAcademico,
        totalHoras,
        estado: EstadoActa.SOLICITADA,
      }),
    );

    return peticionGuardada;
  }

  /**
   * Confirma manualmente una petición de acta final cambiando su estado
   * de SOLICITADA a CONFIRMADA y registrando la aprobación en auditoría (CU-06, RN-01, PA-04).
   * No genera el archivo PDF automáticamente (eso corresponde a CU-07).
   */
  async confirmarActa(id: string, actorId: string): Promise<Acta> {
    const acta = await this.actaRepo.findOne({
      where: { id },
    });

    if (!acta) {
      throw new ActaNoEncontradaError(
        `No existe ninguna petición de acta con el identificador "${id}"`,
      );
    }

    if (acta.estado !== EstadoActa.SOLICITADA) {
      throw new TransicionEstadoActaInvalidaError(
        `El acta "${id}" solo puede confirmarse cuando está en estado SOLICITADA (estado actual: ${acta.estado})`,
      );
    }

    const estadoAnterior = acta.estado;
    acta.estado = EstadoActa.CONFIRMADA;

    const confirmada = await this.actaRepo.save(acta);

    await this.auditoriaService.registrarEvento(
      'CONFIRMACION_ACTA',
      'EXITOSO',
      actorId,
      JSON.stringify({
        actaId: confirmada.id,
        estudianteId: confirmada.estudianteId,
        totalHoras: confirmada.totalHoras,
        estadoAnterior,
        nuevoEstado: confirmada.estado,
      }),
    );

    return confirmada;
  }

  /**
   * Genera de forma síncrona y transaccional el acta final de práctica en PDF para un estudiante (CU-07).
   */
  async generarActa(estudianteId: string, actorId: string): Promise<Acta> {
    // 1. Verificar si ya existe un acta previa en estado GENERADA para evitar duplicados
    const actaExistente = await this.actaRepo.findOne({
      where: {
        estudianteId,
        estado: EstadoActa.GENERADA,
      },
    });

    if (actaExistente) {
      throw new ActaYaExisteError('Ya existe un acta oficial generada para este estudiante');
    }

    // 2. Verificar que la postulación del estudiante esté en estado VALIDADA (ADR-001, ADR-003)
    const estaValidada = await this.postulacionService.estaValidada(estudianteId);
    if (!estaValidada) {
      throw new PostulacionNoValidadaError('la postulación aún no está validada');
    }

    const postulacion = await this.postulacionService.obtenerPorEstudiante(estudianteId);
    if (!postulacion || postulacion.estado !== 'VALIDADA') {
      throw new PostulacionNoValidadaError('la postulación aún no está validada');
    }

    // 3. Consultar requisitos vigentes del programa académico (ADR-007) y total de horas verificadas (CU-05)
    const programaAcademico = postulacion.estudiante.programaAcademico;
    const requisito = await this.configuracionService.obtenerRequisitosVigentes(programaAcademico);
    const totalHoras = await this.horasService.totalHorasValidadas(estudianteId);

    if (totalHoras < requisito.horasMinimas) {
      throw new HorasInsuficientesError(
        'El estudiante no cumple con las horas mínimas requeridas por su programa académico',
      );
    }

    // 4. Renderizar el PDF en memoria con PDFKit, guardarlo en almacenamiento local on-premise
    //    y persistir la entidad Acta transaccionalmente en estado GENERADA (ADR-005).
    try {
      const rutaPdf = await this.renderizarYGuardarPdf(
        estudianteId,
        programaAcademico,
        totalHoras,
        actorId,
      );

      const guardarEnTransaccion = async (repo: Repository<Acta>): Promise<Acta> => {
        const nuevaActa = repo.create({
          estudianteId,
          totalHoras,
          rutaPdf,
          estado: EstadoActa.GENERADA,
          detalleError: null,
        });
        return repo.save(nuevaActa);
      };

      const actaGuardada =
        this.dataSource && this.dataSource.isInitialized
          ? await this.dataSource.transaction(async (manager) =>
              guardarEnTransaccion(manager.getRepository(Acta)),
            )
          : await guardarEnTransaccion(this.actaRepo);

      await this.auditoriaService.registrarEvento(
        'GENERACION_ACTA',
        'EXITOSO',
        actorId,
        JSON.stringify({
          actaId: actaGuardada.id,
          estudianteId,
          programaAcademico,
          totalHoras,
          rutaPdf,
          estado: EstadoActa.GENERADA,
        }),
      );

      return actaGuardada;
    } catch (error) {
      const detalleError = error instanceof Error ? error.message : String(error);

      const actaFallida = this.actaRepo.create({
        estudianteId,
        totalHoras,
        rutaPdf: null,
        estado: EstadoActa.FALLIDA,
        detalleError,
      });

      const guardadaFallida = await this.actaRepo.save(actaFallida);

      await this.auditoriaService.registrarEvento(
        'GENERACION_ACTA',
        'FALLIDO',
        actorId,
        JSON.stringify({
          actaId: guardadaFallida.id,
          estudianteId,
          programaAcademico,
          totalHoras,
          estado: EstadoActa.FALLIDA,
          detalleError,
        }),
      );

      throw new FalloGeneracionActaError('no se pudo generar el acta, reintentar manualmente');
    }
  }

  /**
   * Renderiza el PDF oficial del acta de finalización en memoria usando PDFKit
   * y lo guarda en el almacenamiento local on-premise institucional (ADR-005, RT-01).
   */
  protected async renderizarYGuardarPdf(
    estudianteId: string,
    programaAcademico: string,
    totalHoras: number,
    actorId: string,
  ): Promise<string> {
    const bufferPdf = await this.generarBufferPdf(
      estudianteId,
      programaAcademico,
      totalHoras,
      actorId,
    );

    await fs.promises.mkdir(this.directorioAlmacenamiento, { recursive: true });
    const nombreArchivo = `acta_${estudianteId}_${Date.now()}.pdf`;
    const rutaCompleta = path.join(this.directorioAlmacenamiento, nombreArchivo);

    await fs.promises.writeFile(rutaCompleta, bufferPdf);
    return rutaCompleta;
  }

  /**
   * Construye el documento PDF en memoria mediante PDFKit sin servicios externos (ADR-005, RT-01).
   */
  protected generarBufferPdf(
    estudianteId: string,
    programaAcademico: string,
    totalHoras: number,
    actorId: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const fragmentos: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => fragmentos.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(fragmentos)));
        doc.on('error', (err: Error) => reject(err));

        doc
          .fontSize(16)
          .text('UNIVERSIDAD DE CALDAS', { align: 'center' })
          .fontSize(13)
          .text('Facultad de Inteligencia Artificial e Ingenierías', { align: 'center' })
          .moveDown()
          .fontSize(14)
          .text('ACTA OFICIAL DE FINALIZACIÓN DE PRÁCTICA EMPRESARIAL', { align: 'center' })
          .moveDown(2)
          .fontSize(11)
          .text(`Documento del estudiante: ${estudianteId}`)
          .moveDown(0.5)
          .text(`Programa académico: ${programaAcademico}`)
          .moveDown(0.5)
          .text(`Total de horas verificadas y consolidadas: ${totalHoras} horas`)
          .moveDown(0.5)
          .text(`Expedida por funcionario administrativo (documento): ${actorId}`)
          .moveDown(0.5)
          .text(`Fecha de expedición: ${new Date().toISOString()}`)
          .moveDown(2)
          .text(
            'La Coordinación de Prácticas Empresariales certifica que el estudiante cumplió con la totalidad de los requisitos y horas mínimas exigidas por su programa académico.',
            { align: 'justify' },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
