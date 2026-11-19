import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../decorators/usuario-actual.decorator';

/**
 * Guard de control de acceso basado en roles RBAC (ADR-004).
 * Bloquea el 100% de los intentos de acceso fuera del rol autorizado y registra en auditoría en <= 1 s (EAC-03).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as UsuarioAutenticado | undefined;

    if (!user || !user.rol || !rolesRequeridos.includes(user.rol)) {
      const actorId = user?.documento || 'DESCONOCIDO';
      const rolActual = user?.rol || 'SIN_ROL';
      this.logger.warn(
        `Acceso denegado: actor [${actorId}] con rol [${rolActual}] intentó acceder a recurso que exige [${rolesRequeridos.join(', ')}]`,
      );

      await this.auditoriaService.registrarAccesoDenegado(
        'ACCESO_ROL_NO_AUTORIZADO',
        actorId,
        `Rol actual: ${rolActual}. Roles requeridos: ${rolesRequeridos.join(', ')} en ${request.method} ${request.url}`,
      );

      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los siguientes roles: ${rolesRequeridos.join(', ')}`,
      );
    }

    return true;
  }
}
