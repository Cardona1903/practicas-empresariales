import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { EnlaceAccesoService } from '../enlace-acceso.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { EnlaceSupervisorAutenticado } from '../decorators/enlace-actual.decorator';

/**
 * Guard de autenticación para supervisores empresariales externos mediante
 * enlace temporal de un solo uso (ADR-004, RN-02, EAC-03).
 * Bloquea el 100% de los enlaces inválidos, usados, vencidos o ausentes
 * y registra el intento rechazado en la bitácora de auditoría en <= 1 s (PA-04).
 */
@Injectable()
export class SupervisorTokenGuard implements CanActivate {
  constructor(
    private readonly enlaceAccesoService: EnlaceAccesoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawHeader = request.headers['enlace-token'];
    const token = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!token || !token.trim()) {
      await this.auditoriaService.registrarAccesoDenegado(
        'ENLACE_SUPERVISOR_AUSENTE',
        null,
        `Petición sin encabezado enlace-token en ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('enlace inválido, usado o vencido');
    }

    const enlace = await this.enlaceAccesoService.validarEnlace(token);

    if (!enlace) {
      await this.auditoriaService.registrarAccesoDenegado(
        'ENLACE_SUPERVISOR_RECHAZADO',
        token,
        `Intento con enlace inválido, usado o vencido en ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('enlace inválido, usado o vencido');
    }

    const contextoEnlace: EnlaceSupervisorAutenticado = {
      token: enlace.token,
      estudianteId: enlace.estudianteId,
      supervisorId: enlace.supervisorId,
      rol: 'SUPERVISOR',
    };

    (request as any).enlaceAcceso = contextoEnlace;
    return true;
  }
}
