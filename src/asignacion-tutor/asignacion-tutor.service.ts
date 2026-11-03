import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignacionTutor } from './asignacion-tutor.entity';

@Injectable()
export class AsignacionTutorService {
  constructor(
    @InjectRepository(AsignacionTutor) private readonly asignaciones: Repository<AsignacionTutor>,
  ) {}

  asignar(estudianteId: string, tutorId: string) {
    return this.asignaciones.save(this.asignaciones.create({ estudianteId, tutorId }));
  }

  obtenerPorEstudiante(estudianteId: string) {
    return this.asignaciones.findOne({ where: { estudianteId }, order: { asignadaEn: 'DESC' } });
  }
}
