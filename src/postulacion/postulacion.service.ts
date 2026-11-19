import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Estudiante } from './entities/estudiante.entity';
import { EstadoPostulacion } from './enums/estado-postulacion.enum';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';
import { RevisarPostulacionDto } from './dto/revisar-postulacion.dto';
import { ConfiguracionService } from '../compartido/configuracion/configuracion.service';
import { AuditoriaService } from '../compartido/auditoria/auditoria.service';
import {
  DocumentoIncompletoError,
  DocumentoCorruptoError,
  PostulacionActivaExistenteError,
  PostulacionNoEncontradaError,
  TransicionEstadoInvalidaError,
  MotivoRechazoObligatorioError,
} from '../compartido/errores/dominio.error';
import { UsuarioAutenticado } from '../compartido/auth/decorators/usuario-actual.decorator';

/**
 * Tabla explícita de transiciones permitidas en la máquina de estados de postulación (ADR-003, RN-01).
 * Toda transición debe ser disparada manualmente por un actor administrativo autenticado.
 */
export const TRANSICIONES_VALIDAS: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  [EstadoPostulacion.RECIBIDA]: [EstadoPostulacion.EN_REVISION],
  [EstadoPostulacion.EN_REVISION]: [
    EstadoPostulacion.VALIDADA,
    EstadoPostulacion.RECHAZADA,
  ],
  [EstadoPostulacion.VALIDADA]: [],
  [EstadoPostulacion.RECHAZADA]: [],
};

/**
 * Servicio del Módulo Postulación (CU-01, CU-02, CU-09, ADR-001, ADR-003, ADR-006, ADR-007).
 * Orquesta la lógica de postulación, consulta y revisión manual respetando la modularidad estricta.
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
    private readonly auditoriaService: AuditoriaService,
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

  /**
   * Consulta el listado general de peticiones de postulación con filtrado opcional por estado (CU-01).
   * Entrega las postulaciones ordenadas cronológicamente en forma descendente por fecha de radicación.
   */
  async listarPostulaciones(estado?: EstadoPostulacion): Promise<Postulacion[]> {
    const where = estado ? { estado } : {};
    return this.postulacionRepo.find({
      where,
      order: { creadaEn: 'DESC' },
    });
  }

  /**
   * Revisa y cambia manualmente el estado de una postulación (CU-02, ADR-003, RN-01, PA-04).
   * Verifica existencia (404), transición válida en TRANSICIONES_VALIDAS (409),
   * motivo obligatorio en caso de rechazo (400) y registra el cambio en RegistroAuditoria.
   */
  async revisarPostulacion(
    id: string,
    dto: RevisarPostulacionDto,
    actorId: string,
  ): Promise<Postulacion> {
    // 1. Verificar que la postulación exista
    const postulacion = await this.postulacionRepo.findOne({
      where: { id },
    });

    if (!postulacion) {
      this.logger.warn(`Intento de revisar postulación inexistente [ID: ${id}]`);
      throw new PostulacionNoEncontradaError(
        `La postulación con identificador "${id}" no existe`,
      );
    }

    // 2. Validar que la transición esté permitida en la máquina de estados (ADR-003, RN-01)
    const estadoAnterior = postulacion.estado;
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoAnterior] ?? [];

    if (!transicionesPermitidas.includes(dto.estado)) {
      this.logger.warn(
        `Transición de estado inválida en postulación [${id}]: ${estadoAnterior} -> ${dto.estado}`,
      );
      throw new TransicionEstadoInvalidaError(
        `Transición de estado inválida: no se permite pasar de "${estadoAnterior}" a "${dto.estado}"`,
      );
    }

    // 3. Si el estado destino es RECHAZADA, exigir motivo obligatorio
    if (dto.estado === EstadoPostulacion.RECHAZADA) {
      const motivoLimpio = dto.motivo?.trim();
      if (!motivoLimpio) {
        this.logger.warn(
          `Rechazo denegado en postulación [${id}]: no se proporcionó motivo de rechazo`,
        );
        throw new MotivoRechazoObligatorioError(
          'El motivo del rechazo es obligatorio cuando se rechaza una postulación',
        );
      }
      postulacion.motivoRechazo = motivoLimpio;
    }

    // 4. Actualizar estado de la postulación
    postulacion.estado = dto.estado;
    const actualizada = await this.postulacionRepo.save(postulacion);

    // 5. Registrar cambio de estado crítico en bitácora de auditoría vía servicio exportado (PA-04, ADR-001)
    if (this.auditoriaService) {
      await this.auditoriaService.registrarEvento(
        'CAMBIO_ESTADO_POSTULACION',
        'EXITOSO',
        actorId,
        `Postulación [${actualizada.id}]: estado anterior "${estadoAnterior}" -> nuevo estado "${dto.estado}"${
          dto.estado === EstadoPostulacion.RECHAZADA
            ? ` | Motivo: "${actualizada.motivoRechazo}"`
            : ''
        }`,
      );
    }

    this.logger.log(
      `Postulación [${actualizada.id}] actualizada manualmente por [${actorId}]: ${estadoAnterior} -> ${dto.estado}`,
    );

    return actualizada;
  }
}
