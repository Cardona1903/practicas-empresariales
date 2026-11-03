import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { RequisitoPrograma } from './configuracion.entity';
import { DominioError } from '../errores/dominio-error';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(RequisitoPrograma)
    private readonly requisitos: Repository<RequisitoPrograma>,
  ) {}

  // ADR-007: PostulacionService llama esto en vez de tener las reglas
  // de validacion escritas en su propio codigo (CU-09).
  async obtenerVigente(programaAcademico: string): Promise<RequisitoPrograma> {
    const requisito = await this.requisitos.findOne({
      where: { programaAcademico, vigenteDesde: LessThanOrEqual(new Date()) },
      order: { vigenteDesde: 'DESC' },
    });
    if (!requisito) {
      throw new DominioError(
        `No hay requisitos configurados para el programa "${programaAcademico}".`,
        'CONFIGURACION_FALTANTE',
      );
    }
    return requisito;
  }

  crear(datos: Partial<RequisitoPrograma>) {
    return this.requisitos.save(this.requisitos.create(datos));
  }

  listar() {
    return this.requisitos.find();
  }
}
