- [x] T-01 Estado CONFIRMADA en EstadoActa y errores de dominio ActaNoEncontradaError y TransicionEstadoActaInvalidaError (ADR-005, ADR-006)
      Archivos: src/actas/enums/estado-acta.enum.ts, src/compartido/errores/dominio.error.ts
      Escenarios: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico), Intento de confirmar un acta que no se encuentra en estado solicitada (excepción), Confirmación de un registro de acta inexistente (excepción)
      Depende de: ninguna

- [x] T-02 Método confirmarActa en ActasService con validación de transición SOLICITADA -> CONFIRMADA y auditoría (ADR-001, RN-01, PA-04)
      Archivos: src/actas/actas.service.ts
      Escenarios: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico), Intento de confirmar un acta que no se encuentra en estado solicitada (excepción), Confirmación de un registro de acta inexistente (excepción)
      Depende de: T-01

- [x] T-03 Endpoint PATCH /actas/:id/confirmar con RBAC administrativo en ActasController (ADR-004, EAC-03)
      Archivos: src/actas/actas.controller.ts
      Escenarios: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico), Intento de confirmar un acta que no se encuentra en estado solicitada (excepción), Confirmación de un registro de acta inexistente (excepción), Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-02

- [x] T-04 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/006-confirmar-acta/validacion.md, test/probar-confirmar-acta.ts
      Escenarios: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico), Intento de confirmar un acta que no se encuentra en estado solicitada (excepción), Confirmación de un registro de acta inexistente (excepción), Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-03
