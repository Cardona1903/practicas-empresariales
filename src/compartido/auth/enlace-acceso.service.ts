import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnlaceAcceso } from './entities/enlace-acceso.entity';

/**
 * Servicio exportado para gestión de enlaces de acceso de un solo uso (ADR-001, ADR-004, RN-02).
 * Permite a otros módulos validar y consumir enlaces temporales de supervisores
 * sin acceder directamente al Repository<EnlaceAcceso>.
 */
@Injectable()
export class EnlaceAccesoService {
  constructor(
    @InjectRepository(EnlaceAcceso)
    private readonly enlaceRepo: Repository<EnlaceAcceso>,
  ) {}

  /**
   * Busca un enlace por token y verifica que exista, no haya sido usado y no esté vencido.
   * Retorna la entidad EnlaceAcceso si es válido, o null en caso contrario.
   */
  async validarEnlace(token: string): Promise<EnlaceAcceso | null> {
    if (!token || !token.trim()) {
      return null;
    }

    const enlace = await this.enlaceRepo.findOne({
      where: { token: token.trim() },
    });

    if (!enlace) {
      return null;
    }

    if (enlace.usado) {
      return null;
    }

    const ahora = new Date();
    if (enlace.expiraEn.getTime() <= ahora.getTime()) {
      return null;
    }

    return enlace;
  }

  /**
   * Marca un enlace de acceso como usado para impedir su reutilización (ADR-004).
   */
  async consumirEnlace(token: string): Promise<EnlaceAcceso | null> {
    const enlace = await this.enlaceRepo.findOne({
      where: { token: token.trim() },
    });

    if (!enlace) {
      return null;
    }

    enlace.usado = true;
    return this.enlaceRepo.save(enlace);
  }
}
