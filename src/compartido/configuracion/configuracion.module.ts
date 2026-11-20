import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequisitoPrograma } from './entities/requisito-programa.entity';
import { ConfiguracionService } from './configuracion.service';

/**
 * Módulo de Configuración (ADR-001, ADR-007, EAC-02).
 * Encapsula la gestión de parámetros por programa académico y exporta ConfiguracionService.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RequisitoPrograma])],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
