import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HorasService } from './horas.service';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { ConsultarHorasFiltroDto } from './dto/consultar-horas-filtro.dto';
import { AvanceHorasEstudianteDto } from './dto/avance-horas-estudiante.dto';
import { SupervisorTokenGuard } from '../compartido/auth/guards/supervisor-token.guard';
import { SsoAuthGuard } from '../compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../compartido/auth/guards/roles.guard';
import { Roles } from '../compartido/auth/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioAutenticado,
} from '../compartido/auth/decorators/usuario-actual.decorator';
import {
  EnlaceActual,
  EnlaceSupervisorAutenticado,
} from '../compartido/auth/decorators/enlace-actual.decorator';
import { RegistroHoras } from './entities/registro-horas.entity';

/**
 * Controlador HTTP del Módulo Horas (CU-12, CU-05, ADR-004, RN-02, EAC-03).
 * - POST /horas: protegido con SupervisorTokenGuard para el supervisor externo (CU-12).
 * - GET /horas y PATCH /horas/:id: protegidos con SsoAuthGuard + RolesGuard para ADMINISTRATIVO (CU-05).
 */
@Controller('horas')
export class HorasController {
  constructor(private readonly horasService: HorasService) {}

  /**
   * POST /horas
   * Registra una entrada de horas de práctica del estudiante usando el enlace-token del supervisor (CU-12).
   * Responde HTTP 201 Created con el RegistroHoras en estado REGISTRADA (RN-01).
   */
  @Post()
  @UseGuards(SupervisorTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async registrarHoras(
    @EnlaceActual() enlace: EnlaceSupervisorAutenticado,
    @Body() dto: RegistrarHorasDto,
  ): Promise<RegistroHoras> {
    return this.horasService.registrarHoras(
      enlace.estudianteId,
      enlace.supervisorId,
      enlace.token,
      dto,
    );
  }

  /**
   * GET /horas
   * Consulta los registros de horas con filtros opcionales por estado y estudianteId (CU-05).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03).
   */
  @Get()
  @UseGuards(SsoAuthGuard, RolesGuard)
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listarHoras(
    @Query() filtro: ConsultarHorasFiltroDto,
  ): Promise<RegistroHoras[]> {
    return this.horasService.listarRegistrosHoras(filtro);
  }

  /**
   * GET /horas/mi-avance
   * Permite al estudiante autenticado consultar el avance de sus propias horas de práctica (CU-10).
   * Requiere rol 'ESTUDIANTE' (ADR-004, EAC-03, Vista Lógica).
   */
  @Get('mi-avance')
  @UseGuards(SsoAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE')
  @HttpCode(HttpStatus.OK)
  async obtenerMiAvance(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<AvanceHorasEstudianteDto> {
    return this.horasService.consultarAvanceEstudiante(usuario.documento);
  }

  /**
   * PATCH /horas/:id
   * Verifica manualmente un registro de horas pendiente pasándolo a estado VERIFICADA (CU-05, RN-01).
   * Requiere rol 'ADMINISTRATIVO' (ADR-004, EAC-03, PA-04).
   */
  @Patch(':id')
  @UseGuards(SsoAuthGuard, RolesGuard)
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  async verificarHoras(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RegistroHoras> {
    return this.horasService.verificarRegistroHoras(id, usuario.documento);
  }
}
