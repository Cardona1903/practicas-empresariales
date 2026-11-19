import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';
import { SsoAuthGuard } from '../compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../compartido/auth/guards/roles.guard';
import { Roles } from '../compartido/auth/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioAutenticado,
} from '../compartido/auth/decorators/usuario-actual.decorator';
import { Postulacion } from './entities/postulacion.entity';

/**
 * Controlador HTTP del módulo de Postulación (CU-09).
 * Expone endpoints REST protegidos por autenticación SSO y autorización RBAC (ADR-004, EAC-03).
 */
@Controller('postulaciones')
@UseGuards(SsoAuthGuard, RolesGuard)
export class PostulacionController {
  constructor(private readonly postulacionService: PostulacionService) {}

  /**
   * POST /postulaciones
   * Radica una nueva postulación cargando los requisitos exigidos (CU-09).
   * Requiere rol 'ESTUDIANTE'. Responde HTTP 201 Created y estado RECIBIDA (ADR-003).
   */
  @Post()
  @Roles('ESTUDIANTE')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async postularse(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearPostulacionDto,
  ): Promise<Postulacion> {
    return this.postulacionService.crearPostulacion(usuario, dto);
  }

  /**
   * GET /postulaciones/mi-postulacion
   * Permite al estudiante consultar su postulación registrada.
   */
  @Get('mi-postulacion')
  @Roles('ESTUDIANTE')
  async obtenerMiPostulacion(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Postulacion | null> {
    return this.postulacionService.obtenerPorEstudiante(usuario.documento);
  }
}
