import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EnlaceAccesoSupervisor } from './enlace-acceso.entity';
import { SsoAuthGuard } from './sso.guard';
import { SupervisorTokenGuard } from './supervisor-token.guard';
import { RolesGuard } from './roles.guard';

// ADR-004: agrupa los dos mecanismos de acceso (SSO + enlace de un solo
// uso) y el control de acceso por rol que exige EAC-03. Otros modulos
// importan AuthModule para poder usar estos guards en sus controladores.
@Module({
  imports: [
    TypeOrmModule.forFeature([EnlaceAccesoSupervisor]),
    JwtModule.register({}),
  ],
  providers: [SsoAuthGuard, SupervisorTokenGuard, RolesGuard],
  exports: [SsoAuthGuard, SupervisorTokenGuard, RolesGuard, TypeOrmModule],
})
export class AuthModule {}
