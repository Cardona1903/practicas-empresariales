import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroHoras } from './entities/registro-horas.entity';
import { EstadoHoras } from './enums/estado-horas.enum';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { ConsultarHorasFiltroDto } from './dto/consultar-horas-filtro.dto';
import { EnlaceAccesoService } from '../compartido/auth/enlace-acceso.service';
import { AuditoriaService } from '../compartido/auditoria/auditoria.service';
import {
  RegistroHorasNoEncontradoError,
  RegistroHorasYaVerificadoError,
} from '../compartido/errores/dominio.error';

/**
 * Servicio del Módulo Horas (CU-12, CU-05, ADR-001, ADR-004, ADR-005, RN-01, PA-04).
 * - Registra las horas reportadas por el supervisor externo en estado REGISTRADA (CU-12).
 * - Lista registros, verifica manualmente pasando a VERIFICADA con auditoría
 *   y consolida totalHorasValidadas por estudiante (CU-05).
 * Respeta la regla estricta de modularidad: solo inyecta Repository<RegistroHoras>.
 */
@Injectable()
export class HorasService {
  constructor(
    @InjectRepository(RegistroHoras)
    private readonly registroHorasRepo: Repository<RegistroHoras>,
    private readonly enlaceAccesoService: EnlaceAccesoService,
    @Optional()
    private readonly auditoriaService?: AuditoriaService,
  ) {}

  /**
   * Registra una entrada de horas de práctica asociada al estudiante del enlace
   * y marca el enlace de un solo uso como utilizado (CU-12).
   */
  async registrarHoras(
    estudianteId: string,
    supervisorId: string | null,
    token: string,
    dto: RegistrarHorasDto,
  ): Promise<RegistroHoras> {
    if (typeof dto.horas !== 'number' || Number.isNaN(dto.horas) || dto.horas <= 0) {
      throw new BadRequestException('La cantidad de horas debe ser mayor a 0');
    }

    if (!dto.fecha || Number.isNaN(Date.parse(dto.fecha)) || !/^\d{4}-\d{2}-\d{2}/.test(dto.fecha)) {
      throw new BadRequestException('La fecha debe tener un formato ISO válido (YYYY-MM-DD)');
    }

    const nuevoRegistro = this.registroHorasRepo.create({
      estudianteId,
      supervisorId: supervisorId ?? null,
      fecha: dto.fecha,
      horas: dto.horas,
      descripcion: dto.descripcion !== undefined ? dto.descripcion : null,
      estado: EstadoHoras.REGISTRADA,
    });

    const guardado = await this.registroHorasRepo.save(nuevoRegistro);

    await this.enlaceAccesoService.consumirEnlace(token);

    return guardado;
  }

  /**
   * Consulta el listado de registros de horas con filtros opcionales de estado y estudianteId (CU-05).
   */
  async listarRegistrosHoras(filtro?: ConsultarHorasFiltroDto): Promise<RegistroHoras[]> {
    const where: Partial<Pick<RegistroHoras, 'estado' | 'estudianteId'>> = {};

    if (filtro?.estado) {
      where.estado = filtro.estado;
    }

    if (filtro?.estudianteId && filtro.estudianteId.trim()) {
      where.estudianteId = filtro.estudianteId.trim();
    }

    return this.registroHorasRepo.find({
      where,
      order: { creadoEn: 'DESC' },
    });
  }

  /**
   * Verifica manualmente un registro de horas pendiente cambiando su estado
   * de REGISTRADA a VERIFICADA y registrando la transición en auditoría (CU-05, RN-01, PA-04).
   */
  async verificarRegistroHoras(id: string, actorId: string): Promise<RegistroHoras> {
    const registro = await this.registroHorasRepo.findOne({
      where: { id },
    });

    if (!registro) {
      throw new RegistroHorasNoEncontradoError(
        `No existe ningún registro de horas con el identificador "${id}"`,
      );
    }

    if (registro.estado === EstadoHoras.VERIFICADA) {
      throw new RegistroHorasYaVerificadoError(
        `El registro de horas "${id}" ya fue verificado previamente`,
      );
    }

    const estadoAnterior = registro.estado;
    registro.estado = EstadoHoras.VERIFICADA;

    const actualizado = await this.registroHorasRepo.save(registro);

    if (this.auditoriaService) {
      await this.auditoriaService.registrarEvento(
        'VERIFICACION_HORAS',
        'EXITOSO',
        actorId,
        JSON.stringify({
          registroHorasId: actualizado.id,
          estudianteId: actualizado.estudianteId,
          horas: actualizado.horas,
          estadoAnterior,
          nuevoEstado: actualizado.estado,
        }),
      );
    }

    return actualizado;
  }

  /**
   * Consolida y retorna la suma total de horas en estado VERIFICADA de un estudiante (CU-05, CU-07, ADR-005).
   * Método exportado para ser consumido por otros módulos sin acceder a Repository<RegistroHoras> (ADR-001).
   */
  async totalHorasValidadas(estudianteId: string): Promise<number> {
    const registrosVerificados = await this.registroHorasRepo.find({
      where: {
        estudianteId,
        estado: EstadoHoras.VERIFICADA,
      },
    });

    return registrosVerificados.reduce((acum, reg) => acum + reg.horas, 0);
  }
}
