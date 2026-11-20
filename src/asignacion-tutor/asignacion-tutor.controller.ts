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
import { AsignacionTutorService } from './asignacion-tutor.service';
import { AsignarTutorDto } from './dto/asignar-tutor.dto';
import { SsoAuthGuard } from '../compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../compartido/auth/guards/roles.guard';
import { Roles } from '../compartido/auth/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioAutenticado,
} from '../compartido/auth/decorators/usuario-actual.decorator';
import { AsignacionTutor } from './entities/asignacion-tutor.entity';

/**
 * Controlador HTTP del Módulo AsignaciónTutor (CU-03, ADR-004, EAC-03).
 * Expone el endpoint POST /asignaciones-tutor protegido con SsoAuthGuard y RolesGuard
 * exigiendo el rol ADMINISTRATIVO.
 */
@Controller('asignaciones-tutor')
@UseGuards(SsoAuthGuard, RolesGuard)
export class AsignacionTutorController {
  constructor(
    private readonly asignacionTutorService: AsignacionTutorService,
  ) {}

  /**
   * POST /asignaciones-tutor
   * Asigna o actualiza el tutor/supervisor empresarial asociado a un estudiante (CU-03).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03, PA-04).
   */
  @Post()
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async asignarTutor(
    @Body() dto: AsignarTutorDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<AsignacionTutor> {
    return this.asignacionTutorService.asignarTutor(dto, usuario.documento);
  }
}
