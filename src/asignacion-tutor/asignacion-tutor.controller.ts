import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AsignacionTutorService } from './asignacion-tutor.service';
import { SsoAuthGuard } from '../compartido/auth/sso.guard';
import { RolesGuard } from '../compartido/auth/roles.guard';
import { Roles } from '../compartido/auth/roles.decorator';

@Controller('asignaciones-tutor')
@UseGuards(SsoAuthGuard, RolesGuard)
export class AsignacionTutorController {
  constructor(private readonly asignacionService: AsignacionTutorService) {}

  @Post()
  @Roles('administrativo')
  asignar(@Body() body: { estudianteId: string; tutorId: string }) {
    return this.asignacionService.asignar(body.estudianteId, body.tutorId);
  }

  @Get(':estudianteId')
  @Roles('administrativo', 'estudiante')
  obtener(@Param('estudianteId') estudianteId: string) {
    return this.asignacionService.obtenerPorEstudiante(estudianteId);
  }
}
