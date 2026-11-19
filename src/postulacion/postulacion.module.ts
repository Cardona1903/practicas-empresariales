import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Estudiante } from './entities/estudiante.entity';
import { PostulacionController } from './postulacion.controller';
import { PostulacionService } from './postulacion.service';
import { ConfiguracionModule } from '../compartido/configuracion/configuracion.module';
import { AuthModule } from '../compartido/auth/auth.module';
import { AuditoriaModule } from '../compartido/auditoria/auditoria.module';

/**
 * Módulo de Postulación (ADR-001, Vista de Desarrollo).
 * Encapsula la gestión de postulaciones y exporta PostulacionService.
 * Respeta la modularidad estricta sin exponer repositorios a otros módulos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Postulacion, Estudiante]),
    ConfiguracionModule,
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [PostulacionController],
  providers: [PostulacionService],
  exports: [PostulacionService],
})
export class PostulacionModule {}
