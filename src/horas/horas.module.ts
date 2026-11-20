import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroHoras } from './entities/registro-horas.entity';
import { HorasController } from './horas.controller';
import { HorasService } from './horas.service';
import { AuthModule } from '../compartido/auth/auth.module';
import { AuditoriaModule } from '../compartido/auditoria/auditoria.module';

/**
 * Módulo Horas (ADR-001, Vista de Desarrollo).
 * Encapsula la gestión de horas de práctica (CU-12, CU-05) y exporta HorasService.
 * Respeta la regla estricta de modularidad: importa AuthModule y AuditoriaModule
 * para usar sus servicios exportados sin importar ni exponer repositorios ajenos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RegistroHoras]), AuthModule, AuditoriaModule],
  controllers: [HorasController],
  providers: [HorasService],
  exports: [HorasService],
})
export class HorasModule {}
