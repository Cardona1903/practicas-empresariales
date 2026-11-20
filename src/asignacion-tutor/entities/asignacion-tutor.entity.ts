import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supervisor } from './supervisor.entity';

/**
 * Entidad AsignacionTutor (Vista Lógica, Glosario, ADR-002).
 * Vínculo formal entre el estudiante en práctica y su supervisor/tutor empresarial.
 */
@Entity('asignacion_tutor')
export class AsignacionTutor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'estudiante_id', type: 'varchar', length: 100, unique: true })
  estudianteId!: string;

  @ManyToOne(() => Supervisor, { eager: true })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor!: Supervisor;

  @UpdateDateColumn({ name: 'asignada_en', type: 'timestamp' })
  asignadaEn!: Date;
}
