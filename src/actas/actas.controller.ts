import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ActasService } from './actas.service';
import { SsoAuthGuard } from '../compartido/auth/sso.guard';
import { RolesGuard } from '../compartido/auth/roles.guard';
import { Roles } from '../compartido/auth/roles.decorator';

@Controller('actas')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ActasController {
  constructor(private readonly actasService: ActasService) {}

  // CU-07. Si falla, el cliente recibe el error en la misma interaccion
  // (ADR-005: sin cola asincrona ni notificacion posterior).
  @Post(':estudianteId/generar')
  @Roles('administrativo')
  generar(@Req() req: any, @Param('estudianteId') estudianteId: string) {
    return this.actasService.generar(estudianteId, req.user.id);
  }
}
