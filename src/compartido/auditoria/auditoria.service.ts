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

  /**
   * Consulta los eventos de auditoría asociados a un trámite o estudiante postulante (CU-04, PA-04, ADR-001).
   * Permite a otros módulos obtener la trazabilidad sin acceder directamente al repositorio de RegistroAuditoria.
   */
  async consultarPorTramite(
    postulacionId: string,
    documentoEstudiante: string,
  ): Promise<Array<{ evento: string; resultado: string; fecha: Date }>> {
    const registros = await this.auditoriaRepo.find({
      order: { fecha: 'ASC' },
    });

    return registros
      .filter(
        (r) =>
          r.actorId === documentoEstudiante ||
          (r.detalles &&
            (r.detalles.includes(postulacionId) ||
              r.detalles.includes(documentoEstudiante))),
      )
      .map((r) => ({
        evento: r.evento,
        resultado: r.resultado,
        fecha: r.fecha,
      }));
  }
}
