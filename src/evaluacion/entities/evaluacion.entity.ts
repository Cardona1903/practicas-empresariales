import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entidad Evaluacion (Vista Lógica, Glosario, ADR-002).
 * Calificación y concepto valorativo final emitido por el supervisor empresarial (CU-13).
 * Multiplicidad 0..1 por Estudiante en la Vista Lógica.
 */
@Entity('evaluacion')
export class Evaluacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'estudiante_id', type: 'varchar', length: 100, unique: true })
  estudianteId!: string;

  @Column({ name: 'supervisor_id', type: 'varchar', length: 100, nullable: true })
  supervisorId!: string | null;

  @Column({ type: 'float' })
  calificacion!: number;

  @Column({ type: 'text', nullable: true })
  comentarios!: string | null;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamp' })
  creadaEn!: Date;
}
