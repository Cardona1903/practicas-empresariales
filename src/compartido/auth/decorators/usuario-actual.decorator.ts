import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  documento: string;
  programaAcademico: string;
  rol: string;
  nombre?: string;
  email?: string;
}

/**
 * Decorador de parámetro para inyectar los datos del usuario extraídos del JWT institucional (ADR-004).
 */
export const UsuarioActual = createParamDecorator(
  (data: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UsuarioAutenticado;
    return data ? user?.[data] : user;
  },
);
