import { Module } from '@nestjs/common';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { HorasModule } from '../horas/horas.module';
import { AuthModule } from '../compartido/auth/auth.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/**
 * Módulo Administración (ADR-001, Vista de Desarrollo 03-desarrollo.md).
 * Encapsula la consulta de reportes e indicadores de las prácticas en curso (CU-08).
 * Cumple literalmente la regla estricta de modularidad: importa únicamente
 * PostulacionModule, HorasModule y AuthModule para consumir sus servicios exportados,
 * sin registrar ni acceder a ningún repositorio TypeORM.
 */
@Module({
  imports: [PostulacionModule, HorasModule, AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class AdministracionModule {}
