import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface EnlaceSupervisorAutenticado {
  token: string;
  estudianteId: string;
  supervisorId: string | null;
  rol: 'SUPERVISOR';
}

/**
 * Decorador de parámetro para inyectar los datos del enlace temporal de un solo uso
 * validado por SupervisorTokenGuard (ADR-004, RN-02).
 */
export const EnlaceActual = createParamDecorator(
  (data: keyof EnlaceSupervisorAutenticado | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const enlace = request.enlaceAcceso as EnlaceSupervisorAutenticado;
    return data ? enlace?.[data] : enlace;
  },
);
