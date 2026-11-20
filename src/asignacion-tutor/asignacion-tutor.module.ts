import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supervisor } from './entities/supervisor.entity';
import { AsignacionTutor } from './entities/asignacion-tutor.entity';
import { AsignacionTutorController } from './asignacion-tutor.controller';
import { AsignacionTutorService } from './asignacion-tutor.service';
import { AuthModule } from '../compartido/auth/auth.module';
import { AuditoriaModule } from '../compartido/auditoria/auditoria.module';

/**
 * Módulo AsignaciónTutor (ADR-001, Vista de Desarrollo, PA-01).
 * Encapsula la asignación de tutor/supervisor empresarial al estudiante (CU-03)
 * y exporta AsignacionTutorService.
 * Respeta la regla estricta de modularidad: solo depende de Compartido/Auth,
 * Compartido/Auditoria y PostgreSQL.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Supervisor, AsignacionTutor]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [AsignacionTutorController],
  providers: [AsignacionTutorService],
  exports: [AsignacionTutorService],
})
export class AsignacionTutorModule {}
