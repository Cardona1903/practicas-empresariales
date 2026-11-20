import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';
import { ConsultarPostulacionesFiltroDto } from './dto/consultar-postulaciones-filtro.dto';
import { RevisarPostulacionDto } from './dto/revisar-postulacion.dto';
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

  /**
   * GET /postulaciones
   * Consulta el listado de peticiones de postulación con filtrado opcional por estado (CU-01).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03).
   * Responde HTTP 200 con el listado ordenado cronológicamente por fecha de radicación descendente.
   */
  @Get()
  @Roles('ADMINISTRATIVO')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listarPostulaciones(
    @Query() filtro: ConsultarPostulacionesFiltroDto,
  ): Promise<Postulacion[]> {
    return this.postulacionService.listarPostulaciones(filtro.estado);
  }

  /**
   * PATCH /postulaciones/:id
   * Revisa y cambia manualmente el estado de una postulación (CU-02).
   * Requiere rol 'ADMINISTRATIVO' (ADR-003, ADR-004, EAC-03, RN-01).
   * Responde HTTP 200 con la postulación actualizada.
   */
  @Patch(':id')
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async revisarPostulacion(
    @Param('id') id: string,
    @Body() dto: RevisarPostulacionDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Postulacion> {
    return this.postulacionService.revisarPostulacion(
      id,
      dto,
      usuario.documento,
    );
  }

  /**
   * GET /postulaciones/estudiante/:documento
   * Consulta los datos detallados de un estudiante postulante y la trazabilidad de su postulación (CU-04).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03, PA-04).
   * Responde HTTP 200 con datos del estudiante, postulación y eventos de auditoría asociados.
   */
  @Get('estudiante/:documento')
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  async obtenerTrazabilidadEstudiante(
    @Param('documento') documento: string,
  ) {
    return this.postulacionService.obtenerTrazabilidadPorEstudiante(documento);
  }
}
