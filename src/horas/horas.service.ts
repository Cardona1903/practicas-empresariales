import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroHoras } from './entities/registro-horas.entity';
import { EstadoHoras } from './enums/estado-horas.enum';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { EnlaceAccesoService } from '../compartido/auth/enlace-acceso.service';

/**
 * Servicio del Módulo Horas (CU-12, ADR-001, ADR-004, RN-01).
 * Registra las horas reportadas por el supervisor externo en estado REGISTRADA
 * y consume el enlace temporal mediante el servicio exportado EnlaceAccesoService
 * sin acceder nunca al repositorio de EnlaceAcceso directamente.
 */
@Injectable()
export class HorasService {
  constructor(
    @InjectRepository(RegistroHoras)
    private readonly registroHorasRepo: Repository<RegistroHoras>,
    private readonly enlaceAccesoService: EnlaceAccesoService,
  ) {}

  /**
   * Registra una entrada de horas de práctica asociada al estudiante del enlace
   * y marca el enlace de un solo uso como utilizado.
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
}
