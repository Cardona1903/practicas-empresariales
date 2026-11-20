import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule } from './compartido/auditoria/auditoria.module';
import { ConfiguracionModule } from './compartido/configuracion/configuracion.module';
import { AuthModule } from './compartido/auth/auth.module';
import { PostulacionModule } from './postulacion/postulacion.module';
import { HorasModule } from './horas/horas.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';
import { RegistroAuditoria } from './compartido/auditoria/entities/registro-auditoria.entity';
import { RequisitoPrograma } from './compartido/configuracion/entities/requisito-programa.entity';
import { EnlaceAcceso } from './compartido/auth/entities/enlace-acceso.entity';
import { Postulacion } from './postulacion/entities/postulacion.entity';
import { Estudiante } from './postulacion/entities/estudiante.entity';
import { RegistroHoras } from './horas/entities/registro-horas.entity';
import { Evaluacion } from './evaluacion/entities/evaluacion.entity';

/**
 * Módulo raíz de la aplicación (ADR-001, ADR-002).
 * Integra los módulos del monolito modular y la conexión a PostgreSQL institucional.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'practicas_app'),
        password: config.get<string>('DB_PASSWORD', 'cambiar_esta_clave'),
        database: config.get<string>('DB_NAME', 'practicas_empresariales'),
        entities: [
          RegistroAuditoria,
          RequisitoPrograma,
          EnlaceAcceso,
          Postulacion,
          Estudiante,
          RegistroHoras,
          Evaluacion,
        ],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    AuditoriaModule,
    ConfiguracionModule,
    AuthModule,
    PostulacionModule,
    HorasModule,
    EvaluacionModule,
  ],
})
export class AppModule {}
