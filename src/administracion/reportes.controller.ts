import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { SsoAuthGuard } from '../compartido/auth/sso.guard';
import { RolesGuard } from '../compartido/auth/roles.guard';
import { Roles } from '../compartido/auth/roles.decorator';

@Controller('administracion/indicadores')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get(':estudianteId')
  @Roles('administrativo')
  indicadores(@Param('estudianteId') estudianteId: string) {
    return this.reportesService.indicadoresEstudiante(estudianteId);
  }
}
