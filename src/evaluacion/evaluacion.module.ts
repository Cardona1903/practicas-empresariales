import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluacion } from './evaluacion.entity';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';
import { AuthModule } from '../compartido/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluacion]), AuthModule],
  providers: [EvaluacionService],
  controllers: [EvaluacionController],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
