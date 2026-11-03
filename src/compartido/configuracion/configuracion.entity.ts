import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// ADR-007: requisitos de postulacion y horas minimas, por programa
// academico, editables sin tocar codigo ni redesplegar. Usado por CU-09.
@Entity('requisito_programa')
export class RequisitoPrograma {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  programaAcademico: string;

  @Column('int')
  horasMinimas: number;

  // Lista simple de documentos exigidos, p. ej. ["carta_aceptacion", "seguro"]
  @Column('simple-array')
  documentosRequeridos: string[];

  @Column({ type: 'timestamptz', default: () => 'now()' })
  vigenteDesde: Date;
}
