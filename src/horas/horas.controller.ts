import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { HorasService } from './horas.service';
import { SupervisorTokenGuard } from '../compartido/auth/supervisor-token.guard';
import { SsoAuthGuard } from '../compartido/auth/sso.guard';
import { RolesGuard } from '../compartido/auth/roles.guard';
import { Roles } from '../compartido/auth/roles.decorator';

@Controller('horas')
export class HorasController {
  constructor(private readonly horasService: HorasService) {}

  // CU-12: supervisor externo, sin cuenta institucional (RN-02).
  @Post()
  @UseGuards(SupervisorTokenGuard)
  registrar(@Req() req: any, @Body() body: { fecha: string; horas: number }) {
    return this.horasService.registrar({
      estudianteId: req.user.estudianteId,
      supervisorEmail: req.user.id,
      ...body,
    });
  }

  // CU-05: administrativo autenticado por SSO.
  @Post(':estudianteId/verificar')
  @UseGuards(SsoAuthGuard, RolesGuard)
  @Roles('administrativo')
  verificar(@Req() req: any, @Param('estudianteId') estudianteId: string) {
    return this.horasService.verificar(estudianteId, req.user.id);
  }
}
