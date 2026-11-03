import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroHoras } from './horas.entity';
import { HorasService } from './horas.service';
import { HorasController } from './horas.controller';
import { AuthModule } from '../compartido/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RegistroHoras]), AuthModule],
  providers: [HorasService],
  controllers: [HorasController],
  // Exportado para que actas.module.ts lo use (ADR-005).
  exports: [HorasService],
})
export class HorasModule {}
