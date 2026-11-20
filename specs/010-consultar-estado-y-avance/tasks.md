- [x] T-01 DTO de salida AvanceHorasEstudianteDto para resumen y registros de horas del estudiante
      Archivos: src/horas/dto/avance-horas-estudiante.dto.ts
      Escenarios: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico), Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno)
      Depende de: ninguna

- [ ] T-02 Método consultarAvanceEstudiante en HorasService con aislamiento por estudianteId (ADR-001, Vista Lógica)
      Archivos: src/horas/horas.service.ts
      Escenarios: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico), Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno), Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad)
      Depende de: T-01

- [ ] T-03 Endpoint GET /horas/mi-avance con RBAC para ESTUDIANTE en HorasController (ADR-004, EAC-03)
      Archivos: src/horas/horas.controller.ts
      Escenarios: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico), Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno), Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad), Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
      Depende de: T-02

- [ ] T-04 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/010-consultar-estado-y-avance/validacion.md, test/probar-consultar-estado-y-avance.ts
      Escenarios: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico), Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno), Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad), Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
      Depende de: T-03
