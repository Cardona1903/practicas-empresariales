import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { HorasModule } from '../horas/horas.module';
import { AuthModule } from '../compartido/auth/auth.module';

@Module({
  imports: [PostulacionModule, HorasModule, AuthModule],
  providers: [ReportesService],
  controllers: [ReportesController],
})
export class AdministracionModule {}
