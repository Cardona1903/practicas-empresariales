import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entidad RequisitoPrograma (ADR-007, PA-05, EAC-02).
 * Modela los requisitos documentales y horas mínimas configuradas por programa académico en base de datos.
 */
@Entity('requisito_programa')
export class RequisitoPrograma {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  programaAcademico: string;

  @Column({ type: 'int', default: 0 })
  horasMinimas: number;

  @Column({ type: 'simple-array' })
  documentosRequeridos: string[];

  @CreateDateColumn({ type: 'timestamp' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizadoEn: Date;
}
