- [x] T-01 Entidad EnlaceAcceso para tokens temporales de supervisores externos (ADR-002, ADR-004, RN-02)
      Archivos: src/compartido/auth/entities/enlace-acceso.entity.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)
      Depende de: ninguna

- [x] T-02 Servicio EnlaceAccesoService, SupervisorTokenGuard, decorador EnlaceActual y exportación en AuthModule (ADR-001, ADR-004, EAC-03, PA-04)
      Archivos: src/compartido/auth/enlace-acceso.service.ts, src/compartido/auth/guards/supervisor-token.guard.ts, src/compartido/auth/decorators/enlace-actual.decorator.ts, src/compartido/auth/auth.module.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad), Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
      Depende de: T-01

- [x] T-03 Enum EstadoHoras y entidad RegistroHoras (ADR-002, RN-01)
      Archivos: src/horas/enums/estado-horas.enum.ts, src/horas/entities/registro-horas.entity.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno)
      Depende de: ninguna

- [x] T-04 DTO RegistrarHorasDto con validaciones de fecha, horas positivas y descripción opcional
      Archivos: src/horas/dto/registrar-horas.dto.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción)
      Depende de: ninguna

- [x] T-05 Servicio HorasService para registro de horas en estado REGISTRADA y consumo del enlace vía EnlaceAccesoService (ADR-001, ADR-004, RN-01)
      Archivos: src/horas/horas.service.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción)
      Depende de: T-02, T-03, T-04

- [x] T-06 Controlador HorasController con endpoint POST /horas protegido por SupervisorTokenGuard (ADR-004, EAC-03)
      Archivos: src/horas/horas.controller.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción), Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad), Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
      Depende de: T-02, T-05

- [x] T-07 Integración modular en HorasModule y AppModule (ADR-001, ADR-002)
      Archivos: src/horas/horas.module.ts, src/app.module.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno)
      Depende de: T-06

- [ ] T-08 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/012-ingresar-horas/validacion.md, test/probar-ingresar-horas.ts
      Escenarios: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico), Registro exitoso de horas sin descripción (flujo alterno), Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción), Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad), Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
      Depende de: T-07
