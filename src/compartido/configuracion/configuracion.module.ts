import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequisitoPrograma } from './configuracion.entity';
import { ConfiguracionService } from './configuracion.service';
import { ConfiguracionController } from './configuracion.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RequisitoPrograma]), AuthModule],
  providers: [ConfiguracionService],
  controllers: [ConfiguracionController],
  // Exportado para que postulacion.module.ts lo use (ADR-001: solo via
  // servicio exportado, nunca importando el Repository directamente).
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
