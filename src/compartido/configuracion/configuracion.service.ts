import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequisitoPrograma } from './entities/requisito-programa.entity';
import { DominioError } from '../errores/dominio.error';

/**
 * Servicio de Configuración (ADR-007, EAC-02).
 * Consulta y administra los requisitos y horas parametrizadas por programa académico.
 * Exportado para consumo de los módulos de negocio sin exponer el Repository.
 */
@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  constructor(
    @InjectRepository(RequisitoPrograma)
    private readonly requisitoRepo: Repository<RequisitoPrograma>,
  ) {}

  /**
   * Obtiene la lista de documentos y horas mínimas vigentes para un programa académico.
   */
  async obtenerRequisitosVigentes(programaAcademico: string): Promise<RequisitoPrograma> {
    const requisito = await this.requisitoRepo.findOne({
      where: { programaAcademico },
    });

    if (!requisito) {
      this.logger.warn(`No se encontraron requisitos vigentes configurados para el programa: ${programaAcademico}`);
      throw new DominioError(
        `No existen requisitos de postulación configurados para el programa académico: ${programaAcademico}`,
      );
    }

    return requisito;
  }

  /**
   * Registra o actualiza requisitos para un programa académico en base de datos.
   * Permite modificar requisitos sin tocar código ni redesplegar (EAC-02).
   */
  async guardarRequisitos(
    programaAcademico: string,
    horasMinimas: number,
    documentosRequeridos: string[],
  ): Promise<RequisitoPrograma> {
    let requisito = await this.requisitoRepo.findOne({ where: { programaAcademico } });

    if (!requisito) {
      requisito = this.requisitoRepo.create({
        programaAcademico,
        horasMinimas,
        documentosRequeridos,
      });
    } else {
      requisito.horasMinimas = horasMinimas;
      requisito.documentosRequeridos = documentosRequeridos;
    }

    const guardado = await this.requisitoRepo.save(requisito);
    this.logger.log(`Requisitos actualizados para el programa [${programaAcademico}]: ${documentosRequeridos.join(', ')}`);
    return guardado;
  }
}
