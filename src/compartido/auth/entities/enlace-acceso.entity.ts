import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entidad EnlaceAcceso (Vista Lógica, Glosario, ADR-004, RN-02).
 * Token temporal firmado de un solo uso que habilita a un Supervisor externo
 * sin cuenta institucional para registrar horas (CU-12) o evaluar desempeño (CU-13).
 */
@Entity('enlace_acceso_supervisor')
export class EnlaceAcceso {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ name: 'estudiante_id', type: 'varchar', length: 100 })
  estudianteId!: string;

  @Column({ name: 'supervisor_id', type: 'varchar', length: 100, nullable: true })
  supervisorId!: string | null;

  @Column({ name: 'expira_en', type: 'timestamp' })
  expiraEn!: Date;

  @Column({ type: 'boolean', default: false })
  usado!: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn!: Date;
}
