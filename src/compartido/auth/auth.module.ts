import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SsoAuthGuard } from './guards/sso-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SupervisorTokenGuard } from './guards/supervisor-token.guard';
import { EnlaceAcceso } from './entities/enlace-acceso.entity';
import { EnlaceAccesoService } from './enlace-acceso.service';

/**
 * Módulo de Autenticación y Autorización (ADR-004, EAC-03, RN-02).
 * Provee verificación de identidad vía SSO institucional (JWT), RBAC
 * y enlaces temporales de un solo uso para supervisores externos.
 */
@Module({
  imports: [
    ConfigModule,
    AuditoriaModule,
    TypeOrmModule.forFeature([EnlaceAcceso]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SSO_JWT_SECRET') || 'cambiar_este_secreto',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [SsoAuthGuard, RolesGuard, EnlaceAccesoService, SupervisorTokenGuard],
  exports: [
    SsoAuthGuard,
    RolesGuard,
    EnlaceAccesoService,
    SupervisorTokenGuard,
    JwtModule,
    AuditoriaModule,
  ],
})
export class AuthModule {}
