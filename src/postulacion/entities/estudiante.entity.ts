import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Postulacion } from './postulacion.entity';

/**
 * Entidad Estudiante (Vista Lógica, Glosario).
 * Representa al estudiante que se postula y realiza la práctica empresarial.
 */
@Entity('estudiante')
export class Estudiante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  documento: string;

  @Column({ type: 'varchar', length: 150 })
  programaAcademico: string;

  @OneToMany(() => Postulacion, (postulacion) => postulacion.estudiante)
  postulaciones: Postulacion[];

  @CreateDateColumn({ type: 'timestamp' })
  creadoEn: Date;
}
