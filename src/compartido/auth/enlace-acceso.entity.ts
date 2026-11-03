import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// ADR-004: enlace de un solo uso para el Supervisor de practica (actor
// externo sin cuenta institucional, RN-02). Cubre CU-12 e CU-13.
@Entity('enlace_acceso_supervisor')
export class EnlaceAccesoSupervisor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  supervisorEmail: string;

  @Column()
  estudianteId: string;

  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  // Riesgo asumido en ADR-004: el enlace puede reenviarse antes de expirar.
  // Marcar `usado` ayuda a mitigar, pero no elimina el riesgo por completo.
  @Column({ default: false })
  usado: boolean;
}
