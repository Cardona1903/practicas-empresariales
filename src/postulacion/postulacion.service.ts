import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Estudiante } from './entities/estudiante.entity';
import { EstadoPostulacion } from './enums/estado-postulacion.enum';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';
import { ConfiguracionService } from '../compartido/configuracion/configuracion.service';
import {
  DocumentoIncompletoError,
  DocumentoCorruptoError,
  PostulacionActivaExistenteError,
} from '../compartido/errores/dominio.error';
import { UsuarioAutenticado } from '../compartido/auth/decorators/usuario-actual.decorator';

/**
 * Servicio del Módulo Postulación (CU-09, ADR-001, ADR-003, ADR-006, ADR-007).
 * Orquesta la lógica del caso de uso de postularse y respeta la modularidad estricta.
 */
@Injectable()
export class PostulacionService {
  private readonly logger = new Logger(PostulacionService.name);

  constructor(
    @InjectRepository(Postulacion)
    private readonly postulacionRepo: Repository<Postulacion>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  /**
   * Crea una nueva postulación a la práctica (CU-09).
   * Valida postulación previa, consulta requisitos vigentes, valida completitud e integridad
   * y fija el estado inicial en RECIBIDA (ADR-001, ADR-003, ADR-006, ADR-007).
   */
  async crearPostulacion(
    usuario: UsuarioAutenticado,
    dto: CrearPostulacionDto,
  ): Promise<Postulacion> {
    const { documento, programaAcademico } = usuario;

    // 1. Verificar si el estudiante ya tiene una postulación activa en curso
    let estudiante = await this.estudianteRepo.findOne({
      where: { documento },
      relations: ['postulaciones'],
    });

    if (estudiante && estudiante.postulaciones) {
      const tienePostulacionActiva = estudiante.postulaciones.some(
        (p) =>
          p.estado === EstadoPostulacion.RECIBIDA ||
          p.estado === EstadoPostulacion.EN_REVISION,
      );

      if (tienePostulacionActiva) {
        this.logger.warn(
          `Estudiante [${documento}] intentó postularse teniendo ya un trámite activo`,
        );
        throw new PostulacionActivaExistenteError();
      }
    }

    // 2. Consultar requisitos vigentes para el programa académico vía servicio exportado (ADR-001, ADR-007)
    const requisitos = await this.configuracionService.obtenerRequisitosVigentes(
      programaAcademico,
    );

    // 3. Validar completitud de documentos requeridos
    const nombresAdjuntos = dto.documentos.map((d) => d.nombreArchivo.toLowerCase().trim());
    const documentosFaltantes = requisitos.documentosRequeridos.filter(
      (docReq) => !nombresAdjuntos.includes(docReq.toLowerCase().trim()),
    );

    if (documentosFaltantes.length > 0) {
      this.logger.warn(
        `Postulación rechazada para estudiante [${documento}]. Documentos faltantes: ${documentosFaltantes.join(', ')}`,
      );
      throw new DocumentoIncompletoError(
        `La documentación adjunta está incompleta. Faltan los siguientes documentos requeridos: ${documentosFaltantes.join(', ')}`,
      );
    }

    // 4. Validar integridad de cada archivo adjunto (no corrupto / formato PDF válido)
    for (const doc of dto.documentos) {
      this.validarIntegridadArchivo(doc.nombreArchivo, doc.contenidoBase64);
    }

    // 5. Garantizar persistencia del estudiante
    if (!estudiante) {
      estudiante = this.estudianteRepo.create({
        documento,
        programaAcademico,
      });
      estudiante = await this.estudianteRepo.save(estudiante);
    }

    // 6. Persistir la postulación en estado RECIBIDA sin transiciones automáticas (ADR-003, RN-01)
    const nuevaPostulacion = this.postulacionRepo.create({
      estado: EstadoPostulacion.RECIBIDA,
      documentosAdjuntos: dto.documentos.map((d) => d.nombreArchivo),
      estudiante,
    });

    const guardada = await this.postulacionRepo.save(nuevaPostulacion);
    this.logger.log(
      `Postulación creada exitosamente [ID: ${guardada.id}] para estudiante [${documento}] en estado RECIBIDA`,
    );

    return guardada;
  }

  /**
   * Valida que el contenido base64 corresponda a un archivo PDF no corrupto ni vacío (ADR-006).
   */
  private validarIntegridadArchivo(nombreArchivo: string, contenidoBase64: string): void {
    try {
      const buffer = Buffer.from(contenidoBase64, 'base64');
      if (buffer.length === 0) {
        throw new Error('Archivo vacío');
      }

      // Verificación de firma mágica de archivo PDF (%PDF-)
      const encabezado = buffer.subarray(0, 5).toString('ascii');
      if (!encabezado.startsWith('%PDF-')) {
        throw new Error('Cabecera de archivo PDF inválida');
      }
    } catch (error) {
      this.logger.warn(
        `Archivo corrupto o ilegible detectado: [${nombreArchivo}]. Error: ${error instanceof Error ? error.message : error}`,
      );
      throw new DocumentoCorruptoError(
        `El archivo adjunto "${nombreArchivo}" está corrupto, vacío o no corresponde a un documento PDF válido`,
      );
    }
  }

  /**
   * Servicio exportado: consulta si una postulación ya fue validada (usado por Actas/CU-07).
   */
  async estaValidada(postulacionId: string): Promise<boolean> {
    const postulacion = await this.postulacionRepo.findOne({
      where: { id: postulacionId },
    });
    return postulacion?.estado === EstadoPostulacion.VALIDADA;
  }

  /**
   * Servicio exportado: obtiene la postulación más reciente de un estudiante.
   */
  async obtenerPorEstudiante(documento: string): Promise<Postulacion | null> {
    return this.postulacionRepo.findOne({
      where: { estudiante: { documento } },
      order: { creadaEn: 'DESC' },
    });
  }
}
