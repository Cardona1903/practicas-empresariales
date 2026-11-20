import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entidad Supervisor (Vista Lógica, Glosario, ADR-002, RN-02).
 * Supervisor o tutor empresarial externo asignado por la empresa para acompañar la práctica.
 */
@Entity('supervisor')
export class Supervisor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  correo!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre!: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn!: Date;
}
