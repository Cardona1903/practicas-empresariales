import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Acta } from './acta.entity';
import { ActasService } from './actas.service';
import { ActasController } from './actas.controller';
import { GeneradorPdfService } from './generador-pdf.service';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { HorasModule } from '../horas/horas.module';
import { AuthModule } from '../compartido/auth/auth.module';

// ADR-001, ejemplo concreto de la regla: Actas depende de Postulacion y de
// Horas SOLO a traves de los modulos que exportan sus servicios
// (PostulacionModule exporta PostulacionService, HorasModule exporta
// HorasService). Nunca se importa un Repository<Postulacion> ni
// Repository<RegistroHoras> aqui.
@Module({
  imports: [TypeOrmModule.forFeature([Acta]), PostulacionModule, HorasModule, AuthModule],
  providers: [ActasService, GeneradorPdfService],
  controllers: [ActasController],
  exports: [ActasService],
})
export class ActasModule {}
