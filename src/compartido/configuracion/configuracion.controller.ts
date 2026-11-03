import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { SsoAuthGuard } from '../auth/sso.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Pantalla de administracion de ADR-007: solo el personal administrativo
// cambia los requisitos por programa, sin pasar por el equipo tecnico.
@Controller('configuracion/requisitos')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @Roles('administrativo')
  listar() {
    return this.configuracionService.listar();
  }

  @Post()
  @Roles('administrativo')
  crear(@Body() datos: any) {
    return this.configuracionService.crear(datos);
  }
}
