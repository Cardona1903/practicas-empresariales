import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoPostulacion } from '../enums/estado-postulacion.enum';
import { Estudiante } from './estudiante.entity';

/**
 * Entidad Postulacion (Vista Lógica, Glosario, ADR-003).
 * Trámite de solicitud de ingreso a práctica. Inicia en RECIBIDA sin transiciones automáticas (RN-01).
 */
@Entity('postulacion')
export class Postulacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EstadoPostulacion,
    default: EstadoPostulacion.RECIBIDA,
  })
  estado: EstadoPostulacion;

  @Column({ type: 'simple-array' })
  documentosAdjuntos: string[];

  @ManyToOne(() => Estudiante, (estudiante) => estudiante.postulaciones, {
    eager: true,
    cascade: ['insert'],
  })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @CreateDateColumn({ type: 'timestamp' })
  creadaEn: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizadaEn: Date;
}
