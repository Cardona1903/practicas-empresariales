import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { EstadoPostulacion } from './postulacion.entity';
import { SsoAuthGuard } from '../compartido/auth/sso.guard';
import { RolesGuard } from '../compartido/auth/roles.guard';
import { Roles } from '../compartido/auth/roles.decorator';

@Controller('postulaciones')
@UseGuards(SsoAuthGuard, RolesGuard)
export class PostulacionController {
  constructor(private readonly postulacionService: PostulacionService) {}

  // CU-09
  @Post()
  @Roles('estudiante')
  postular(@Req() req: any, @Body() body: { programaAcademico: string; documentosAdjuntos: string[] }) {
    return this.postulacionService.postular({ estudianteId: req.user.id, ...body });
  }

  // CU-02
  @Patch(':id/revisar')
  @Roles('administrativo')
  revisar(@Req() req: any, @Param('id') id: string, @Body('estado') estado: EstadoPostulacion) {
    return this.postulacionService.revisar(id, estado, req.user.id);
  }
}
