import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorador para restringir el acceso a roles específicos según RBAC (ADR-004).
 * Ejemplo: @Roles('ESTUDIANTE')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
