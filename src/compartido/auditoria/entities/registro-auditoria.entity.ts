import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Entidad RegistroAuditoria (Vista Lógica, EAC-03, PA-04).
 * Almacena de forma persistente e inmutable eventos de seguridad,
 * accesos no autorizados y cambios de estado críticos.
 */
@Entity('registro_auditoria')
export class RegistroAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  evento: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 50 })
  resultado: string;

  @Column({ type: 'text', nullable: true })
  detalles: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
