# Plan: 005 Verificar horas de estudiantes (CU-05)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La consulta, verificación manual y consolidación de horas residen en el módulo de negocio `horas` (`HorasController` y `HorasService`). Para auditar las transiciones de estado (`REGISTRADA -> VERIFICADA`), `HorasService` consume exclusivamente el servicio exportado `AuditoriaService` del módulo `compartido/auditoria`, sin inyectar ni importar nunca `Repository<RegistroAuditoria>`. Asimismo, `HorasService` exporta el método `totalHorasValidadas(estudianteId)` para que `ActasService` (en CU-07) y `AdministracionService` (en CU-08) puedan consultar el total consolidado de horas verificadas sin acceder directamente a `Repository<RegistroHoras>`.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Consultas filtradas y actualización transaccional sobre la entidad `RegistroHoras` (`registro_horas`) en PostgreSQL.
- **RN-01 (Exclusión de automatizaciones en flujos de trabajo):** La transición de un `RegistroHoras` desde `REGISTRADA` hacia `VERIFICADA` solo ocurre mediante una acción humana explícita de un usuario autenticado con rol `ADMINISTRATIVO` en `PATCH /horas/:id`.
- **ADR-004 (SSO + RBAC para actores institucionales):** Los endpoints `GET /horas` y `PATCH /horas/:id` están protegidos con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`, extrayendo el documento del administrativo desde el JWT institucional (`@UsuarioActual()`).
- **ADR-005 (Consolidación de horas verificadas previa al acta):** Se implementa la consolidación de horas en estado `VERIFICADA` por estudiante (`totalHorasValidadas(estudianteId)`), garantizando que solo las horas verificadas manualmente por el administrativo sumen al total requerido antes de generar el acta final.
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter` y subclases tipadas de `DominioError`:
  - HTTP 404 (`RegistroHorasNoEncontradoError`) cuando el identificador del registro de horas no existe.
  - HTTP 409 (`RegistroHorasYaVerificadoError`) cuando se intenta verificar un registro que ya se encuentra en estado `VERIFICADA`.
  - HTTP 400 (`ValidationPipe`) cuando se envía un filtro de estado que no pertenece a `EstadoHoras` (`REGISTRADA`, `VERIFICADA`).
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `RegistroHoras` (`id`, `estudianteId`, `supervisorId`, `fecha`, `horas`, `descripcion`, `estado`), `EstadoHoras` (`REGISTRADA`, `VERIFICADA`) y `RegistroAuditoria` (`evento`, `actorId`, `resultado`, `detalles`, `fecha`).
  - *Vista de Procesos (`docs/vistas/02-procesos.md`) y Escenario +1 (`docs/diagramas/secuencias/cu05-verificar-horas.puml`):* `GET /horas?estado=REGISTRADA` y `PATCH /horas/{id}` ejecutados por el Personal Administrativo sobre el Módulo Horas y PostgreSQL.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller -> Service -> Repository` sin capas intermedias innecesarias.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de los intentos de consulta o verificación sin autenticación SSO o con rol distinto a `ADMINISTRATIVO` son bloqueados con HTTP 401/403 y registrados en `RegistroAuditoria` en menos de 1 segundo; cada verificación exitosa queda registrada en `RegistroAuditoria` con el actor administrativo.

## Componentes
- `src/compartido/errores/`:
  - `dominio.error.ts`: Se agregan las subclases `RegistroHorasNoEncontradoError` (HTTP 404) y `RegistroHorasYaVerificadoError` (HTTP 409).
- `src/horas/`:
  - `dto/consultar-horas-filtro.dto.ts`: Nuevo DTO de consulta `ConsultarHorasFiltroDto` para `GET /horas` con validadores `class-validator` (`@IsOptional() @IsEnum(EstadoHoras)` para `estado`, y `@IsOptional() @IsString()` para `estudianteId`).
  - `horas.service.ts`:
    - Se inyecta `AuditoriaService` (exportado por `AuditoriaModule` / `AuthModule`).
    - Se implementa `listarRegistrosHoras(filtro?: ConsultarHorasFiltroDto): Promise<RegistroHoras[]>` para consultar registros filtrando opcionalmente por `estado` y `estudianteId`.
    - Se implementa `verificarRegistroHoras(id: string, actorId: string): Promise<RegistroHoras>` que valida la existencia del registro (404 si no existe), verifica que esté en estado `REGISTRADA` (409 si ya está en `VERIFICADA`), actualiza su estado a `EstadoHoras.VERIFICADA` y registra el evento `VERIFICACION_HORAS` en `RegistroAuditoria` (PA-04).
    - Se implementa `totalHorasValidadas(estudianteId: string): Promise<number>` que suma y consolida todas las horas en estado `EstadoHoras.VERIFICADA` del estudiante (preparado para CU-05 y CU-07 según `cu07-generar-acta.puml`).
  - `horas.controller.ts`:
    - Se agrega `GET /horas` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`.
    - Se agrega `PATCH /horas/:id` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`.
  - `horas.module.ts`: Importa `AuditoriaModule` (además de `TypeOrmModule.forFeature([RegistroHoras])` y `AuthModule`) y exporta `HorasService`.

## Flujo
Basado en el diagrama de secuencia `docs/diagramas/secuencias/cu05-verificar-horas.puml`:
1. El personal administrativo autenticado con SSO consulta `GET /horas?estado=REGISTRADA` (y opcionalmente `&estudianteId=...`):
   - `SsoAuthGuard` y `RolesGuard` validan la sesión JWT y el rol `ADMINISTRATIVO`; si falla, bloquean con HTTP 401/403 y registran en `RegistroAuditoria` en $\le 1$ segundo (EAC-03).
   - `HorasController.listarHoras(filtro)` invoca a `HorasService.listarRegistrosHoras(filtro)`, que ejecuta `SELECT` sobre `registro_horas` con los criterios indicados y responde HTTP 200 OK con la lista de registros.
2. Para cada registro pendiente revisado manualmente, el administrativo envía `PATCH /horas/{id}` con su token JWT institucional:
   - `SsoAuthGuard` y `RolesGuard` verifican el rol `ADMINISTRATIVO`.
   - `HorasController.verificarHoras(id, usuario)` invoca a `HorasService.verificarRegistroHoras(id, usuario.documento)`.
   - `HorasService` busca el registro por `id` en PostgreSQL:
     - Si no existe, lanza `RegistroHorasNoEncontradoError` (HTTP 404 Not Found).
     - Si el registro ya se encuentra en estado `EstadoHoras.VERIFICADA`, lanza `RegistroHorasYaVerificadoError` (HTTP 409 Conflict).
   - `HorasService` cambia `registro.estado = EstadoHoras.VERIFICADA` y ejecuta `UPDATE` en PostgreSQL mediante `registroHorasRepo.save(registro)`.
   - `HorasService` registra la transición en `RegistroAuditoria` invocando `auditoriaService.registrarEvento('VERIFICACION_HORAS', 'EXITOSO', actorId, detalles)` (PA-04).
   - El controlador responde con HTTP 200 OK y el registro actualizado en estado `VERIFICADA`.
3. Al consultar `HorasService.totalHorasValidadas(estudianteId)`, el servicio consolida y suma únicamente los registros del estudiante cuyo estado es `VERIFICADA` (ADR-005).

## Fuera de alcance
- Ingreso inicial de horas por parte del supervisor externo mediante enlace temporal (implementado en CU-12 / `specs/012-ingresar-horas/`).
- Generación del acta final en PDF una vez verificadas las horas (pertenece a CU-07 / `specs/007-generar-acta/`).
- Verificación automática de horas sin intervención humana (prohibida por RN-01).
- Interfaz gráfica web SPA / Frontend (DT-03).
