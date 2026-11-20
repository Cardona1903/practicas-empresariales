- [x] T-01 DTO de salida ReportePracticasDto para indicadores y avance de prácticas
      Archivos: src/administracion/dto/reporte-practicas.dto.ts
      Escenarios: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico), Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno)
      Depende de: ninguna

- [x] T-02 Servicio ReportesService que consolida indicadores exclusivamente mediante PostulacionService y HorasService (ADR-001)
      Archivos: src/administracion/reportes.service.ts
      Escenarios: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico), Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno)
      Depende de: T-01

- [ ] T-03 Controlador ReportesController con endpoint GET /administracion/reportes y RBAC administrativo (ADR-004, EAC-03)
      Archivos: src/administracion/reportes.controller.ts
      Escenarios: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico), Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno), Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-02

- [ ] T-04 Integración modular en AdministracionModule y AppModule (ADR-001)
      Archivos: src/administracion/administracion.module.ts, src/app.module.ts
      Escenarios: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico)
      Depende de: T-03

- [ ] T-05 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/008-consultar-reportes/validacion.md, test/probar-consultar-reportes.ts
      Escenarios: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico), Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno), Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-04
