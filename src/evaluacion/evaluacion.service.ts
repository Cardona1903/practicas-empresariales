import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluacion } from './evaluacion.entity';

@Injectable()
export class EvaluacionService {
  constructor(
    @InjectRepository(Evaluacion) private readonly evaluaciones: Repository<Evaluacion>,
  ) {}

  // CU-13: el supervisor evalua el desempeno del estudiante, por el mismo
  // canal de acceso externo que CU-12 (ADR-004, SupervisorTokenGuard).
  registrar(datos: { estudianteId: string; supervisorEmail: string; calificacion: number; comentarios?: string }) {
    return this.evaluaciones.save(this.evaluaciones.create(datos));
  }
}
