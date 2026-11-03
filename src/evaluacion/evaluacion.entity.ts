import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('evaluacion')
export class Evaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  estudianteId: string;

  @Column()
  supervisorEmail: string;

  @Column('int')
  calificacion: number;

  @Column({ nullable: true })
  comentarios?: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha: Date;
}
