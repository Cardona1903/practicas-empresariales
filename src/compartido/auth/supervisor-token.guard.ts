import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnlaceAccesoSupervisor } from './enlace-acceso.entity';

// ADR-004: valida el enlace de un solo uso del Supervisor, sin pedirle
// cuenta institucional (RN-02). Rechaza si no existe, ya se uso, o vencio;
// eso es lo que EAC-03 exige bloquear al 100%.
@Injectable()
export class SupervisorTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(EnlaceAccesoSupervisor)
    private readonly enlaces: Repository<EnlaceAccesoSupervisor>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = (request.headers['x-enlace-token'] as string) ?? request.query.token;

    if (!token) throw new UnauthorizedException('Falta el enlace de acceso.');

    const enlace = await this.enlaces.findOneBy({ token });
    if (!enlace || enlace.usado || enlace.expiraEn < new Date()) {
      throw new UnauthorizedException('Enlace invalido, usado o vencido.');
    }

    request.user = { id: enlace.supervisorEmail, rol: 'supervisor', estudianteId: enlace.estudianteId };
    request.enlaceAcceso = enlace;
    return true;
  }
}
