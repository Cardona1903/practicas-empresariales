import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroAuditoria } from './entities/registro-auditoria.entity';
import { AuditoriaService } from './auditoria.service';

/**
 * Módulo transversal de auditoría.
 * Exporta AuditoriaService para que los guards y servicios registren eventos (ADR-001, EAC-03).
 */
@Module({
  imports: [TypeOrmModule.forFeature([RegistroAuditoria])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
