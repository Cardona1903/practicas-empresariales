import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoActa {
  GENERADA = 'GENERADA',
  FALLIDA = 'FALLIDA', // ADR-006: no se reintenta sola, queda visible para reintento manual.
}

@Entity('acta')
export class Acta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  estudianteId: string;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  totalHoras?: number;

  @Column({ type: 'enum', enum: EstadoActa })
  estado: EstadoActa;

  @Column({ nullable: true })
  rutaPdf?: string;

  @Column({ nullable: true })
  detalleError?: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  generadaEn: Date;

  @Column()
  generadaPorAdminId: string;
}
