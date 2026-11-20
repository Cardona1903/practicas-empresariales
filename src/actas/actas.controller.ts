import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ActasService } from './actas.service';
import { GenerarActaDto } from './dto/generar-acta.dto';
import { Acta } from './entities/acta.entity';
import { SsoAuthGuard } from '../compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../compartido/auth/guards/roles.guard';
import { Roles } from '../compartido/auth/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioAutenticado,
} from '../compartido/auth/decorators/usuario-actual.decorator';

/**
 * Controlador HTTP del Módulo Actas (CU-07).
 * Expone el endpoint POST /actas protegido por SSO institucional y RBAC administrativo (ADR-004, EAC-03).
 */
@Controller('actas')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ActasController {
  constructor(private readonly actasService: ActasService) {}

  /**
   * POST /actas
   * Confirma la finalización de la práctica y genera síncronamente el acta oficial en PDF (CU-07, ADR-005).
   * Requiere rol 'ADMINISTRATIVO'. Responde HTTP 201 Created con los datos del acta en estado GENERADA.
   */
  @Post()
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async generarActa(
    @Body() dto: GenerarActaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Acta> {
    return this.actasService.generarActa(dto.estudianteId, usuario.documento);
  }
}
