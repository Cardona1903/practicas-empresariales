import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Acta } from './entities/acta.entity';
import { ActasController } from './actas.controller';
import { ActasService } from './actas.service';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { HorasModule } from '../horas/horas.module';
import { ConfiguracionModule } from '../compartido/configuracion/configuracion.module';
import { AuditoriaModule } from '../compartido/auditoria/auditoria.module';
import { AuthModule } from '../compartido/auth/auth.module';

/**
 * Módulo de Actas (ADR-001, Vista de Desarrollo).
 * Encapsula la generación síncrona del acta final de práctica en PDF (CU-07, ADR-005).
 * Cumple la regla estricta de modularidad: registra únicamente su propia entidad Acta
 * e importa PostulacionModule, HorasModule, ConfiguracionModule, AuditoriaModule y AuthModule
 * para consumir sus servicios exportados sin acceder jamás a repositorios ajenos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Acta]),
    PostulacionModule,
    HorasModule,
    ConfiguracionModule,
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [ActasController],
  providers: [ActasService],
  exports: [ActasService],
})
export class ActasModule {}
