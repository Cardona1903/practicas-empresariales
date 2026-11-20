import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HorasService } from './horas.service';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { SupervisorTokenGuard } from '../compartido/auth/guards/supervisor-token.guard';
import {
  EnlaceActual,
  EnlaceSupervisorAutenticado,
} from '../compartido/auth/decorators/enlace-actual.decorator';
import { RegistroHoras } from './entities/registro-horas.entity';

/**
 * Controlador HTTP del Módulo Horas (CU-12, ADR-004, RN-02, EAC-03).
 * Expone el endpoint POST /horas protegido mediante SupervisorTokenGuard
 * para que el supervisor externo ingrese horas con un enlace de un solo uso.
 */
@Controller('horas')
export class HorasController {
  constructor(private readonly horasService: HorasService) {}

  /**
   * POST /horas
   * Registra una entrada de horas de práctica del estudiante usando el enlace-token del supervisor.
   * Responde HTTP 201 Created con el RegistroHoras en estado REGISTRADA (RN-01).
   */
  @Post()
  @UseGuards(SupervisorTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async registrarHoras(
    @EnlaceActual() enlace: EnlaceSupervisorAutenticado,
    @Body() dto: RegistrarHorasDto,
  ): Promise<RegistroHoras> {
    return this.horasService.registrarHoras(
      enlace.estudianteId,
      enlace.supervisorId,
      enlace.token,
      dto,
    );
  }
}
