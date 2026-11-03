import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { SupervisorTokenGuard } from '../compartido/auth/supervisor-token.guard';

@Controller('evaluaciones')
@UseGuards(SupervisorTokenGuard)
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  @Post()
  registrar(@Req() req: any, @Body() body: { calificacion: number; comentarios?: string }) {
    return this.evaluacionService.registrar({
      estudianteId: req.user.estudianteId,
      supervisorEmail: req.user.id,
      ...body,
    });
  }
}
