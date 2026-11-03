import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoRegistroHoras {
  REGISTRADA = 'REGISTRADA',
  VERIFICADA = 'VERIFICADA',
}

@Entity('registro_horas')
export class RegistroHoras {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  estudianteId: string;

  @Column()
  supervisorEmail: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column('decimal', { precision: 5, scale: 2 })
  horas: number;

  @Column({ type: 'enum', enum: EstadoRegistroHoras, default: EstadoRegistroHoras.REGISTRADA })
  estado: EstadoRegistroHoras;

  @Column({ nullable: true })
  verificadoPorAdminId?: string;
}
