import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuditoriaService } from '../../auditoria/auditoria.service';

/**
 * Guard de autenticación institucional vía SSO con token JWT (ADR-004).
 * Bloquea el 100% de los accesos sin autenticar y registra en auditoría en <= 1 s (EAC-03).
 */
@Injectable()
export class SsoAuthGuard implements CanActivate {
  private readonly logger = new Logger(SsoAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extraerToken(request);

    if (!token) {
      await this.auditoriaService.registrarAccesoDenegado(
        'ACCESO_NO_AUTENTICADO_SSO',
        null,
        `Petición sin token en ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('Token de autenticación institucional no proporcionado');
    }

    try {
      const secret = this.configService.get<string>('SSO_JWT_SECRET') || 'cambiar_este_secreto';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      (request as any).user = payload;
      return true;
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Token inválido';
      this.logger.warn(`Fallo de verificación de token JWT: ${mensajeError}`);
      await this.auditoriaService.registrarAccesoDenegado(
        'TOKEN_INVALIDO_SSO',
        null,
        `Token inválido en ${request.method} ${request.url}: ${mensajeError}`,
      );
      throw new UnauthorizedException('Token de autenticación institucional inválido o expirado');
    }
  }

  private extraerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }
    const [tipo, token] = authHeader.split(' ');
    return tipo === 'Bearer' && token ? token : null;
  }
}
