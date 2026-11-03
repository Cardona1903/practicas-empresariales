import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// ADR-003: la postulacion es una maquina de estados. Las transiciones solo
// las dispara una accion humana explicita (RN-01) - ver postulacion.service.ts.
export enum EstadoPostulacion {
  RECIBIDA = 'RECIBIDA',
  EN_REVISION = 'EN_REVISION',
  VALIDADA = 'VALIDADA',
  RECHAZADA = 'RECHAZADA',
}

@Entity('postulacion')
export class Postulacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  estudianteId: string;

  @Column()
  programaAcademico: string;

  @Column('simple-array')
  documentosAdjuntos: string[];

  @Column({ type: 'enum', enum: EstadoPostulacion, default: EstadoPostulacion.RECIBIDA })
  estado: EstadoPostulacion;

  @Column({ nullable: true })
  revisadaPorAdminId?: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadaEn: Date;
}
