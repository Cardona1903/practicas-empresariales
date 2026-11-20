import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { EstadoHoras } from '../enums/estado-horas.enum';

/**
 * Entidad RegistroHoras (Vista Lógica, Glosario, ADR-002, RN-01).
 * Entrada periódica de horas practicadas reportada por el Supervisor empresarial.
 * Inicia siempre en estado REGISTRADA sin verificarse automáticamente.
 */
@Entity('registro_horas')
export class RegistroHoras {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'estudiante_id', type: 'varchar', length: 100 })
  estudianteId!: string;

  @Column({ name: 'supervisor_id', type: 'varchar', length: 100, nullable: true })
  supervisorId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  fecha!: string;

  @Column({ type: 'int' })
  horas!: number;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({
    type: 'enum',
    enum: EstadoHoras,
    default: EstadoHoras.REGISTRADA,
  })
  estado!: EstadoHoras;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn!: Date;
}
