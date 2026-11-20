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
import { EvaluacionService } from './evaluacion.service';
import { RegistrarEvaluacionDto } from './dto/registrar-evaluacion.dto';
import { SupervisorTokenGuard } from '../compartido/auth/guards/supervisor-token.guard';
import {
  EnlaceActual,
  EnlaceSupervisorAutenticado,
} from '../compartido/auth/decorators/enlace-actual.decorator';
import { Evaluacion } from './entities/evaluacion.entity';

/**
 * Controlador HTTP del Módulo Evaluación (CU-13, ADR-004, RN-02, EAC-03).
 * Expone el endpoint POST /evaluaciones protegido mediante SupervisorTokenGuard
 * para que el supervisor externo evalúe al estudiante con un enlace de un solo uso.
 */
@Controller('evaluaciones')
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  /**
   * POST /evaluaciones
   * Registra la evaluación de desempeño del estudiante usando el enlace-token del supervisor.
   * Responde HTTP 201 Created con la entidad Evaluacion creada.
   */
  @Post()
  @UseGuards(SupervisorTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async registrarEvaluacion(
    @EnlaceActual() enlace: EnlaceSupervisorAutenticado,
    @Body() dto: RegistrarEvaluacionDto,
  ): Promise<Evaluacion> {
    return this.evaluacionService.registrarEvaluacion(
      enlace.estudianteId,
      enlace.supervisorId,
      enlace.token,
      dto,
    );
  }
}
