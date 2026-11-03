import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// ADR-004 + EAC-03 (Seguridad): "el 100% de los accesos no autorizados son
// bloqueados". Se aplica DESPUES de SsoAuthGuard o SupervisorTokenGuard,
// que son los que ponen `request.user` con el rol real del actor.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const autorizado = !!user && rolesRequeridos.includes(user.rol);

    if (!autorizado) {
      // TODO (PA-04 / ADR-005 trazabilidad): registrar este intento en la
      // bitacora de auditoria, como exige EAC-03 ("...y el intento queda
      // registrado en la bitacora en menos de 1 segundo").
      throw new ForbiddenException('No autorizado para esta operacion.');
    }
    return true;
  }
}
