import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supervisor } from './entities/supervisor.entity';
import { AsignacionTutor } from './entities/asignacion-tutor.entity';
import { AsignarTutorDto } from './dto/asignar-tutor.dto';
import { AuditoriaService } from '../compartido/auditoria/auditoria.service';

/**
 * Servicio del Módulo AsignaciónTutor (CU-03, ADR-001, ADR-002, PA-04).
 * Gestiona la creación y actualización de la relación entre un estudiante
 * y su supervisor/tutor empresarial, respetando la modularidad estricta (ADR-001).
 */
@Injectable()
export class AsignacionTutorService {
  constructor(
    @InjectRepository(Supervisor)
    private readonly supervisorRepo: Repository<Supervisor>,
    @InjectRepository(AsignacionTutor)
    private readonly asignacionRepo: Repository<AsignacionTutor>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Asigna o actualiza el tutor/supervisor empresarial asociado a un estudiante (CU-03)
   * y registra el evento en la bitácora de auditoría (PA-04).
   */
  async asignarTutor(
    dto: AsignarTutorDto,
    actorId: string,
  ): Promise<AsignacionTutor> {
    const estudianteId = dto.estudianteId?.trim();
    const correo = dto.correoSupervisor?.trim().toLowerCase();

    if (!estudianteId) {
      throw new BadRequestException('El documento del estudiante es obligatorio');
    }

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new BadRequestException(
        'El correo del supervisor debe tener un formato de correo electrónico válido',
      );
    }

    let supervisor = await this.supervisorRepo.findOne({
      where: { correo },
    });

    if (!supervisor) {
      supervisor = this.supervisorRepo.create({
        correo,
        nombre: dto.nombreSupervisor?.trim() || null,
      });
      supervisor = await this.supervisorRepo.save(supervisor);
    } else if (dto.nombreSupervisor !== undefined && dto.nombreSupervisor.trim()) {
      supervisor.nombre = dto.nombreSupervisor.trim();
      supervisor = await this.supervisorRepo.save(supervisor);
    }

    let asignacion = await this.asignacionRepo.findOne({
      where: { estudianteId },
    });

    if (!asignacion) {
      asignacion = this.asignacionRepo.create({
        estudianteId,
        supervisor,
      });
    } else {
      asignacion.supervisor = supervisor;
      asignacion.asignadaEn = new Date();
    }

    const guardada = await this.asignacionRepo.save(asignacion);

    await this.auditoriaService.registrarEvento(
      'ASIGNACION_TUTOR',
      'EXITOSO',
      actorId,
      JSON.stringify({
        asignacionId: guardada.id,
        estudianteId: guardada.estudianteId,
        correoSupervisor: supervisor.correo,
      }),
    );

    return guardada;
  }
}
