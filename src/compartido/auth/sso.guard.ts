import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// ADR-004: autenticacion institucional para estudiantes y personal
// administrativo, contra el SIA (supuesto S2 de vision.md). El SIA emite un
// JWT; aqui solo se valida la firma y se adjunta el usuario a la request.
// La integracion real con el SIA (endpoint/llave publica) queda pendiente;
// esto deja el contrato (forma del guard) listo para conectarla.
@Injectable()
export class SsoAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'] as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw new UnauthorizedException('Falta el token institucional (SSO).');

    try {
      // payload esperado del SIA: { sub, rol: 'estudiante' | 'administrativo', programa? }
      const payload = this.jwtService.verify(token, {
        secret: process.env.SSO_JWT_SECRET,
      });
      request.user = { id: payload.sub, rol: payload.rol, programa: payload.programa };
      return true;
    } catch {
      throw new UnauthorizedException('Token institucional invalido o expirado.');
    }
  }
}
