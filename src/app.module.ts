import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';

import { ConfiguracionModule } from './compartido/configuracion/configuracion.module';
import { AuthModule } from './compartido/auth/auth.module';

import { PostulacionModule } from './postulacion/postulacion.module';
import { AsignacionTutorModule } from './asignacion-tutor/asignacion-tutor.module';
import { HorasModule } from './horas/horas.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';
import { ActasModule } from './actas/actas.module';
import { AdministracionModule } from './administracion/administracion.module';

// ADR-001: raiz del monolito modular. Cada modulo de negocio se registra
// aqui una sola vez; las dependencias ENTRE modulos de negocio se declaran
// dentro de cada modulo importando el modulo del que necesitan un servicio
// exportado (ver actas.module.ts para el ejemplo mas claro).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    AuthModule,
    ConfiguracionModule,
    PostulacionModule,
    AsignacionTutorModule,
    HorasModule,
    EvaluacionModule,
    ActasModule,
    AdministracionModule,
  ],
})
export class AppModule {}
