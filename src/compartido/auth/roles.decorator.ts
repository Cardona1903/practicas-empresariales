import { SetMetadata } from '@nestjs/common';

// ADR-004 / EAC-03: declara que roles pueden llamar un endpoint.
// Uso: @Roles('administrativo')
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
