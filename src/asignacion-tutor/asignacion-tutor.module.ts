import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionTutor } from './asignacion-tutor.entity';
import { AsignacionTutorService } from './asignacion-tutor.service';
import { AsignacionTutorController } from './asignacion-tutor.controller';
import { AuthModule } from '../compartido/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AsignacionTutor]), AuthModule],
  providers: [AsignacionTutorService],
  controllers: [AsignacionTutorController],
  exports: [AsignacionTutorService],
})
export class AsignacionTutorModule {}
