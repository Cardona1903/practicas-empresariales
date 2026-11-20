import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportePracticasDto } from './dto/reporte-practicas.dto';
import { SsoAuthGuard } from '../compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../compartido/auth/guards/roles.guard';
import { Roles } from '../compartido/auth/decorators/roles.decorator';

/**
 * Controlador HTTP del Módulo Administración (CU-08, ADR-004, EAC-03).
 * Expone el endpoint GET /administracion/reportes protegido con SsoAuthGuard
 * y RolesGuard exigiendo el rol ADMINISTRATIVO.
 */
@Controller('administracion/reportes')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /**
   * GET /administracion/reportes
   * Consulta el reporte consolidado de indicadores y estado de las prácticas en curso (CU-08).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03).
   */
  @Get()
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  async obtenerReportePracticas(): Promise<ReportePracticasDto> {
    return this.reportesService.consultarReporteEstadoPracticas();
  }
}
