import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { EstadoActa } from '../enums/estado-acta.enum';

/**
 * Entidad Acta (Vista Lógica, Glosario, ADR-002, ADR-005, ADR-006).
 * Representa el documento oficial de finalización de la práctica empresarial.
 * Solo se expide si la Postulación está VALIDADA y las horas VERIFICADA cumplen el mínimo del programa.
 */
@Entity('acta')
export class Acta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'estudiante_id', type: 'varchar', length: 100 })
  estudianteId!: string;

  @Column({ name: 'total_horas', type: 'int' })
  totalHoras!: number;

  @Column({ name: 'ruta_pdf', type: 'varchar', length: 500, nullable: true })
  rutaPdf!: string | null;

  @Column({
    type: 'enum',
    enum: EstadoActa,
  })
  estado!: EstadoActa;

  @Column({ name: 'detalle_error', type: 'text', nullable: true })
  detalleError!: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn!: Date;
}
