import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SsoAuthGuard } from './guards/sso-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Módulo de Autenticación y Autorización (ADR-004, EAC-03).
 * Provee verificación de identidad vía SSO institucional (JWT) y RBAC.
 */
@Module({
  imports: [
    ConfigModule,
    AuditoriaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SSO_JWT_SECRET') || 'cambiar_este_secreto',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [SsoAuthGuard, RolesGuard],
  exports: [SsoAuthGuard, RolesGuard, JwtModule, AuditoriaModule],
})
export class AuthModule {}
