- [x] T-01 Errores de dominio y filtro global de excepciones
      Archivos: src/compartido/errores/dominio.error.ts, src/compartido/errores/http-exception.filter.ts
      Escenarios: Rechazo de postulación por documentos incompletos (flujo alterno - excepción), Rechazo de postulación por archivo corrupto o ilegible (flujo alterno - excepción), Intento de postulación cuando ya existe una postulación activa (flujo alterno - excepción)
      Depende de: ninguna

- [x] T-02 Entidad y servicio de auditoría para registro de accesos (EAC-03)
      Archivos: src/compartido/auditoria/entities/registro-auditoria.entity.ts, src/compartido/auditoria/auditoria.service.ts, src/compartido/auditoria/auditoria.module.ts
      Escenarios: Bloqueo de postulación sin autenticación o rol indebido (EAC-03 - Seguridad)
      Depende de: ninguna

- [x] T-03 Entidad de requisitos y servicio de configuración por programa (ADR-007, EAC-02)
      Archivos: src/compartido/configuracion/entities/requisito-programa.entity.ts, src/compartido/configuracion/configuracion.service.ts, src/compartido/configuracion/configuracion.module.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Modificación de requisitos de postulación sin tocar código ni redesplegar (EAC-02 - Mantenibilidad)
      Depende de: ninguna

- [x] T-04 Guards SSO, validación de roles y decoradores de autenticación (ADR-004)
      Archivos: src/compartido/auth/guards/sso-auth.guard.ts, src/compartido/auth/guards/roles.guard.ts, src/compartido/auth/decorators/roles.decorator.ts, src/compartido/auth/decorators/usuario-actual.decorator.ts, src/compartido/auth/auth.module.ts
      Escenarios: Bloqueo de postulación sin autenticación o rol indebido (EAC-03 - Seguridad), Carga exitosa de postulación con requisitos completos (flujo básico)
      Depende de: T-02

- [x] T-05 Entidades de postulación, estudiante y enum de estados (ADR-002, ADR-003)
      Archivos: src/postulacion/enums/estado-postulacion.enum.ts, src/postulacion/entities/estudiante.entity.ts, src/postulacion/entities/postulacion.entity.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico)
      Depende de: ninguna

- [x] T-06 DTO de creación de postulación con validaciones
      Archivos: src/postulacion/dto/crear-postulacion.dto.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Rechazo de postulación por documentos incompletos (flujo alterno - excepción), Rechazo de postulación por archivo corrupto o ilegible (flujo alterno - excepción)
      Depende de: T-05

- [x] T-07 Servicio de postulación con máquina de estados y validación de reglas de negocio
      Archivos: src/postulacion/postulacion.service.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Rechazo de postulación por documentos incompletos (flujo alterno - excepción), Rechazo de postulación por archivo corrupto o ilegible (flujo alterno - excepción), Intento de postulación cuando ya existe una postulación activa (flujo alterno - excepción), Modificación de requisitos de postulación sin tocar código ni redesplegar (EAC-02 - Mantenibilidad)
      Depende de: T-01, T-03, T-05, T-06

- [x] T-08 Controlador de postulación con endpoints y guards institucionales
      Archivos: src/postulacion/postulacion.controller.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Bloqueo de postulación sin autenticación o rol indebido (EAC-03 - Seguridad)
      Depende de: T-04, T-07

- [x] T-09 Integración modular en PostulacionModule y AppModule
      Archivos: src/postulacion/postulacion.module.ts, src/app.module.ts
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Modificación de requisitos de postulación sin tocar código ni redesplegar (EAC-02 - Mantenibilidad)
      Depende de: T-08

- [ ] T-10 Validación y verificación de escenarios en validacion.md
      Archivos: specs/009-postularse/validacion.md
      Escenarios: Carga exitosa de postulación con requisitos completos (flujo básico), Rechazo de postulación por documentos incompletos (flujo alterno - excepción), Rechazo de postulación por archivo corrupto o ilegible (flujo alterno - excepción), Intento de postulación cuando ya existe una postulación activa (flujo alterno - excepción), Bloqueo de postulación sin autenticación o rol indebido (EAC-03 - Seguridad), Modificación de requisitos de postulación sin tocar código ni redesplegar (EAC-02 - Mantenibilidad)
      Depende de: T-09
