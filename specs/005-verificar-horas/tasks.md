- [ ] T-01 Errores de dominio RegistroHorasNoEncontradoError y RegistroHorasYaVerificadoError (ADR-006)
      Archivos: src/compartido/errores/dominio.error.ts
      Escenarios: Intento de verificar un registro de horas que ya estaba verificado (excepción), Verificación de un registro de horas inexistente (excepción)
      Depende de: ninguna

- [ ] T-02 DTO ConsultarHorasFiltroDto para filtrado opcional por estado y estudianteId
      Archivos: src/horas/dto/consultar-horas-filtro.dto.ts
      Escenarios: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico)
      Depende de: ninguna

- [ ] T-03 Consulta, verificación manual con auditoría y consolidación totalHorasValidadas en HorasService (ADR-001, ADR-005, RN-01, PA-04)
      Archivos: src/horas/horas.service.ts, src/horas/horas.module.ts
      Escenarios: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico), Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico), Intento de verificar un registro de horas que ya estaba verificado (excepción), Verificación de un registro de horas inexistente (excepción)
      Depende de: T-01, T-02

- [ ] T-04 Endpoints administrativos GET /horas y PATCH /horas/:id con RBAC en HorasController (ADR-004, EAC-03)
      Archivos: src/horas/horas.controller.ts
      Escenarios: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico), Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico), Intento de verificar un registro de horas que ya estaba verificado (excepción), Verificación de un registro de horas inexistente (excepción), Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad)
      Depende de: T-03

- [ ] T-05 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/005-verificar-horas/validacion.md, test/probar-verificar-horas.ts
      Escenarios: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico), Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico), Intento de verificar un registro de horas que ya estaba verificado (excepción), Verificación de un registro de horas inexistente (excepción), Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad)
      Depende de: T-04
