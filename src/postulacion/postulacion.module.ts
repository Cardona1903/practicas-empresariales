import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './postulacion.entity';
import { PostulacionService } from './postulacion.service';
import { PostulacionController } from './postulacion.controller';
import { ConfiguracionModule } from '../compartido/configuracion/configuracion.module';
import { AuthModule } from '../compartido/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Postulacion]), ConfiguracionModule, AuthModule],
  providers: [PostulacionService],
  controllers: [PostulacionController],
  // Exportado para que actas.module.ts lo use (ADR-005).
  exports: [PostulacionService],
})
export class PostulacionModule {}
