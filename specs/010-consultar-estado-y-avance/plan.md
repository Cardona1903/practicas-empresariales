# Plan: 010 Consultar el estado de la postulación y el avance de horas (CU-10)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** Se preserva el desacoplamiento estricto entre `PostulacionModule` y `HorasModule` definido en la Vista de Desarrollo (`docs/vistas/03-desarrollo.md` y `docs/diagramas/03-desarrollo.puml`):
  - El estudiante consulta el estado de su postulación mediante `GET /postulaciones/mi-postulacion` en `PostulacionController` (ya implementado).
  - El estudiante consulta su avance de horas de práctica mediante `GET /horas/mi-avance` en `HorasController` (`HorasService.consultarAvanceEstudiante(estudianteId)`), sin que `HorasModule` importe ni dependa de `PostulacionModule` ni viceversa.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Consulta sobre la entidad `RegistroHoras` (`registro_horas`) filtrando estrictamente por el `estudianteId` extraído de la sesión SSO del estudiante.
- **ADR-004 y RN-02 (SSO + RBAC y aislamiento por rol):** Protección del endpoint `GET /horas/mi-avance` mediante `SsoAuthGuard` y `RolesGuard`, exigiendo el rol `ESTUDIANTE`. El documento del estudiante se toma exclusivamente del payload JWT (`@UsuarioActual()`) para garantizar la regla de negocio de la Vista Lógica (`docs/vistas/01-logica.md`): *"Estudiante: Solo gestiona su propia postulación y horas"*.
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter` para respuestas uniformes ante rechazos de autenticación o autorización.
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `Estudiante`, `Postulacion`, `RegistroHoras` (`estado: REGISTRADA | VERIFICADA`) y `RegistroAuditoria`.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller -> Service -> Repository` dentro de `HorasModule`.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de los intentos sin token SSO o con rol distinto a `ESTUDIANTE` son bloqueados con HTTP 401/403 y registrados en `RegistroAuditoria` en menos de 1 segundo; además, ningún estudiante puede consultar horas de otro estudiante.

## Componentes
- `src/horas/`:
  - `dto/avance-horas-estudiante.dto.ts`: DTO de salida `AvanceHorasEstudianteDto` con `estudianteId`, `totalHorasVerificadas`, `totalHorasRegistradas`, `totalHorasReportadas` y `registros: RegistroHoras[]`.
  - `horas.service.ts`: Se implementa `consultarAvanceEstudiante(estudianteId: string): Promise<AvanceHorasEstudianteDto>` que consulta los registros de `estudianteId` en `Repository<RegistroHoras>`, suma por separado las horas en estado `VERIFICADA` y `REGISTRADA`, y retorna el resumen junto con la lista de registros.
  - `horas.controller.ts`: Se agrega el endpoint `GET /horas/mi-avance` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ESTUDIANTE')`.

## Flujo
1. El estudiante autenticado mediante SSO consulta el estado de su postulación en `GET /postulaciones/mi-postulacion` y su avance de horas en `GET /horas/mi-avance` enviando su token JWT institucional.
2. En `GET /horas/mi-avance`, `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si el usuario no está autenticado o su rol no es `ESTUDIANTE`, se bloquea la solicitud con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` persiste el intento en `RegistroAuditoria` en $\le 1$ segundo (EAC-03, PA-04).
3. `HorasController.obtenerMiAvance(usuario)` extrae `usuario.documento` del decorador `@UsuarioActual()` e invoca a `HorasService.consultarAvanceEstudiante(usuario.documento)`.
4. `HorasService` consulta en `Repository<RegistroHoras>` todos los registros donde `estudianteId === usuario.documento` ordenados por fecha de creación descendente.
5. `HorasService` calcula `totalHorasVerificadas` (suma de registros en `EstadoHoras.VERIFICADA`), `totalHorasRegistradas` (suma de registros en `EstadoHoras.REGISTRADA`) y `totalHorasReportadas` (suma total), y retorna `AvanceHorasEstudianteDto` con código HTTP 200 OK.

## Fuera de alcance
- Modificación o verificación de horas por parte del estudiante (la carga de horas es exclusiva del supervisor en CU-12 y la verificación es exclusiva del administrativo en CU-05).
- Generación del acta final en PDF (implementado en CU-07).
- Interfaz gráfica web SPA / Frontend (DT-03).
