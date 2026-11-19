- [x] T-01 DTO de filtro para consulta de peticiones de postulación
      Archivos: src/postulacion/dto/consultar-postulaciones-filtro.dto.ts
      Escenarios: Consulta exitosa del listado general de peticiones (flujo básico), Filtrado opcional de peticiones por estado de postulación (flujo alterno)
      Depende de: ninguna

- [x] T-02 Consulta y filtrado de postulaciones en el servicio
      Archivos: src/postulacion/postulacion.service.ts
      Escenarios: Consulta exitosa del listado general de peticiones (flujo básico), Consulta de peticiones cuando no existen registros en el sistema (flujo alterno), Filtrado opcional de peticiones por estado de postulación (flujo alterno)
      Depende de: T-01

- [ ] T-03 Endpoint administrativo GET /postulaciones con RBAC en el controlador
      Archivos: src/postulacion/postulacion.controller.ts
      Escenarios: Consulta exitosa del listado general de peticiones (flujo básico), Consulta de peticiones cuando no existen registros en el sistema (flujo alterno), Filtrado opcional de peticiones por estado de postulación (flujo alterno), Bloqueo de consulta de postulaciones sin autenticación o rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-02

- [ ] T-04 Validación y verificación de escenarios en validacion.md
      Archivos: specs/001-visualizar-peticiones/validacion.md
      Escenarios: Consulta exitosa del listado general de peticiones (flujo básico), Consulta de peticiones cuando no existen registros en el sistema (flujo alterno), Filtrado opcional de peticiones por estado de postulación (flujo alterno), Bloqueo de consulta de postulaciones sin autenticación o rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-03
