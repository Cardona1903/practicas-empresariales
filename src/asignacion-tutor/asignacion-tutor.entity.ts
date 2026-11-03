import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// CU-03: no es un driver primario (ver drivers.md), pero el modulo existe
// porque PA-01 (Estructura general) lo nombra como una de las areas de
// negocio del sistema.
@Entity('asignacion_tutor')
export class AsignacionTutor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  estudianteId: string;

  @Column()
  tutorId: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  asignadaEn: Date;
}
