import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluacion } from './entities/evaluacion.entity';
import { EvaluacionController } from './evaluacion.controller';
import { EvaluacionService } from './evaluacion.service';
import { AuthModule } from '../compartido/auth/auth.module';

/**
 * Módulo Evaluación (ADR-001, Vista de Desarrollo).
 * Encapsula la evaluación de desempeño del estudiante (CU-13) y exporta EvaluacionService.
 * Respeta la regla estricta de modularidad: importa AuthModule para usar
 * SupervisorTokenGuard y EnlaceAccesoService sin acceder a repositorios ajenos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Evaluacion]), AuthModule],
  controllers: [EvaluacionController],
  providers: [EvaluacionService],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
