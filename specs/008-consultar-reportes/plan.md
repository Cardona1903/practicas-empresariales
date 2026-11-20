# Plan: 008 Consultar reportes/indicadores del estado de las prácticas en curso (CU-08)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La consulta consolidada de reportes e indicadores reside en el módulo de negocio `administracion` (`ReportesController` y `ReportesService` dentro de `src/administracion/`), tal como lo especifica la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`, sección 2 y 3). El `Módulo Administración` **no tiene repositorios propios ni importa ningún `Repository<T>` de otros módulos**: obtiene toda la información exclusivamente a través de los servicios exportados `PostulacionService` (de `PostulacionModule`) y `HorasService` (de `HorasModule`), cumpliendo literalmente con el diagrama `docs/diagramas/03-desarrollo.puml`.
- **ADR-004 (SSO + RBAC para actores institucionales):** El endpoint `GET /administracion/reportes` está protegido mediante `SsoAuthGuard` y `RolesGuard`, exigiendo el rol `ADMINISTRATIVO`.
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter` para unificar respuestas HTTP de error y bloqueo de autorización.
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md` y `docs/diagramas/03-desarrollo.puml`):* `Módulo Administración` (CU-08) depende únicamente de `PostulacionService`, `HorasService` y `Compartido/Auth`, sin flechas hacia `PostgreSQL` ni ciclos de dependencia (`EAC-02`).
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de las solicitudes sin autenticación SSO o con rol distinto a `ADMINISTRATIVO` son bloqueadas con HTTP 401/403 y registradas en `RegistroAuditoria` en menos de 1 segundo.

## Componentes
- `src/administracion/`:
  - `dto/reporte-practicas.dto.ts`: Interfaces y DTO de salida `ReportePracticasDto`, `ResumenEstadosPostulacionDto` e `IndicadorPracticaEstudianteDto` que estructuran el conteo global de postulaciones por estado (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`) y el avance de horas verificadas por estudiante.
  - `reportes.service.ts`: Servicio `ReportesService` que inyecta únicamente `PostulacionService` y `HorasService` (cumpliendo `ADR-001` y la nota de `03-desarrollo.md` sección 3). Implementa `consultarReporteEstadoPracticas(): Promise<ReportePracticasDto>` invocando `postulacionService.listarPostulaciones()`, `postulacionService.estaValidada(id)` y `horasService.totalHorasValidadas(documento)`.
  - `reportes.controller.ts`: Controlador `ReportesController` con ruta base `@Controller('administracion/reportes')` y endpoint `GET /administracion/reportes` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`.
  - `administracion.module.ts`: Módulo `AdministracionModule` que importa únicamente `PostulacionModule`, `HorasModule` y `AuthModule` (sin `TypeOrmModule.forFeature`), declara `ReportesController` y provee/exporta `ReportesService`.
- `src/app.module.ts`:
  - Importa `AdministracionModule`.

## Flujo
1. El personal administrativo autenticado envía una solicitud `GET /administracion/reportes` con su token JWT institucional.
2. `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si el usuario no está autenticado o su rol no es `ADMINISTRATIVO`, se bloquea la petición con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` persiste el evento en `RegistroAuditoria` en $\le 1$ segundo (EAC-03, PA-04).
3. `ReportesController.obtenerReportePracticas()` invoca a `ReportesService.consultarReporteEstadoPracticas()`.
4. `ReportesService` consulta todas las postulaciones mediante `postulacionService.listarPostulaciones()`.
5. `ReportesService` calcula los contadores por estado (`totalPostulaciones`, `recibidas`, `enRevision`, `validadas`, `rechazadas`) y, para cada postulación, consulta `postulacionService.estaValidada(postulacion.id)` y `horasService.totalHorasValidadas(postulacion.estudiante.documento)`.
6. El controlador retorna el objeto `ReportePracticasDto` consolidado con código HTTP 200 OK.

## Fuera de alcance
- Modificación de postulaciones o verificación de horas desde el módulo de reportes (el módulo `administracion` es estrictamente de lectura a través de servicios exportados).
- Generación del acta final en PDF (pertenece a CU-07 / `Módulo Actas`).
- Interfaz gráfica web SPA / Frontend (DT-03).
