- [x] T-01 Errores de dominio para revisión de postulación (ADR-006)
      Archivos: src/compartido/errores/dominio.error.ts
      Escenarios: Rechazo sin motivo (excepción), Transición de estado no permitida (excepción), Revisión de una postulación inexistente (excepción)
      Depende de: ninguna

- [x] T-02 Atributo motivoRechazo en la entidad Postulacion (ADR-002)
      Archivos: src/postulacion/entities/postulacion.entity.ts
      Escenarios: Rechazar una postulación en revisión (flujo alterno)
      Depende de: ninguna

- [x] T-03 DTO de revisión de postulación con validaciones de estado y motivo
      Archivos: src/postulacion/dto/revisar-postulacion.dto.ts
      Escenarios: Tomar en revisión una postulación recibida (flujo básico), Validar una postulación en revisión (flujo básico), Rechazar una postulación en revisión (flujo alterno), Estado solicitado que no pertenece a la máquina de estados (excepción)
      Depende de: ninguna

- [x] T-04 Máquina de estados TRANSICIONES_VALIDAS, revisión y auditoría en PostulacionService (ADR-003, PA-04)
      Archivos: src/postulacion/postulacion.service.ts
      Escenarios: Tomar en revisión una postulación recibida (flujo básico), Validar una postulación en revisión (flujo básico), Rechazar una postulación en revisión (flujo alterno), Rechazo sin motivo (excepción), Transición de estado no permitida (excepción), Revisión de una postulación inexistente (excepción), Registro en bitácora de cada cambio de estado (PA-04)
      Depende de: T-01, T-02, T-03

- [ ] T-05 Endpoint administrativo PATCH /postulaciones/:id con RBAC en PostulacionController (ADR-004, EAC-03)
      Archivos: src/postulacion/postulacion.controller.ts
      Escenarios: Tomar en revisión una postulación recibida (flujo básico), Validar una postulación en revisión (flujo básico), Rechazar una postulación en revisión (flujo alterno), Rechazo sin motivo (excepción), Transición de estado no permitida (excepción), Estado solicitado que no pertenece a la máquina de estados (excepción), Revisión de una postulación inexistente (excepción), Registro en bitácora de cada cambio de estado (PA-04), Bloqueo de la revisión sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-04

- [ ] T-06 Validación y verificación de escenarios en validacion.md
      Archivos: specs/002-revisar-postulacion/validacion.md, test/probar-revisar-postulacion.ts
      Escenarios: Tomar en revisión una postulación recibida (flujo básico), Validar una postulación en revisión (flujo básico), Rechazar una postulación en revisión (flujo alterno), Rechazo sin motivo (excepción), Transición de estado no permitida (excepción), Estado solicitado que no pertenece a la máquina de estados (excepción), Revisión de una postulación inexistente (excepción), Registro en bitácora de cada cambio de estado (PA-04), Bloqueo de la revisión sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-05
