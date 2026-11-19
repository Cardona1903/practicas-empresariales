import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAuditoria } from './entities/registro-auditoria.entity';

/**
 * Servicio de Auditoría (PA-04, EAC-03).
 * Registra el 100% de los accesos no autorizados y transiciones críticas en <= 1 segundo.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(RegistroAuditoria)
    private readonly auditoriaRepo: Repository<RegistroAuditoria>,
  ) {}

  /**
   * Registra un evento de auditoría en la base de datos institucional.
   */
  async registrarEvento(
    evento: string,
    resultado: string,
    actorId?: string | null,
    detalles?: string | null,
  ): Promise<RegistroAuditoria> {
    const registro = this.auditoriaRepo.create({
      evento,
      resultado,
      actorId: actorId ?? null,
      detalles: detalles ?? null,
    });
    const guardado = await this.auditoriaRepo.save(registro);
    this.logger.log(`Auditoría [${evento}] Resultado: ${resultado} Actor: ${actorId ?? 'ANONIMO'}`);
    return guardado;
  }

  /**
   * Registra accesos no autorizados o denegados por Guards/filtros (EAC-03).
   */
  async registrarAccesoDenegado(
    evento: string,
    actorId?: string | null,
    detalles?: string | null,
  ): Promise<RegistroAuditoria> {
    return this.registrarEvento(evento, 'DENEGADO', actorId, detalles);
  }
}
