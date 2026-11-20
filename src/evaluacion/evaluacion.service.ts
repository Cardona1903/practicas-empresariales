import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluacion } from './entities/evaluacion.entity';
import { RegistrarEvaluacionDto } from './dto/registrar-evaluacion.dto';
import { EnlaceAccesoService } from '../compartido/auth/enlace-acceso.service';
import { EvaluacionYaRegistradaError } from '../compartido/errores/dominio.error';

/**
 * Servicio del Módulo Evaluación (CU-13, ADR-001, ADR-004, ADR-006).
 * Registra la evaluación de desempeño del estudiante emitida por el supervisor externo
 * y consume el enlace temporal mediante el servicio exportado EnlaceAccesoService,
 * sin inyectar nunca Repository<EnlaceAcceso>.
 */
@Injectable()
export class EvaluacionService {
  constructor(
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    private readonly enlaceAccesoService: EnlaceAccesoService,
  ) {}

  /**
   * Registra la calificación y comentarios opcionales de desempeño del estudiante
   * y marca el enlace de un solo uso como utilizado (CU-13).
   */
  async registrarEvaluacion(
    estudianteId: string,
    supervisorId: string | null,
    token: string,
    dto: RegistrarEvaluacionDto,
  ): Promise<Evaluacion> {
    if (
      typeof dto.calificacion !== 'number' ||
      Number.isNaN(dto.calificacion) ||
      dto.calificacion < 0 ||
      dto.calificacion > 5
    ) {
      throw new BadRequestException('La calificación debe estar entre 0.0 y 5.0');
    }

    const existente = await this.evaluacionRepo.findOne({
      where: { estudianteId },
    });

    if (existente) {
      throw new EvaluacionYaRegistradaError(
        `El estudiante con documento "${estudianteId}" ya tiene una evaluación de desempeño registrada`,
      );
    }

    const nuevaEvaluacion = this.evaluacionRepo.create({
      estudianteId,
      supervisorId: supervisorId ?? null,
      calificacion: dto.calificacion,
      comentarios: dto.comentarios !== undefined ? dto.comentarios : null,
    });

    const guardada = await this.evaluacionRepo.save(nuevaEvaluacion);

    await this.enlaceAccesoService.consumirEnlace(token);

    return guardada;
  }
}
