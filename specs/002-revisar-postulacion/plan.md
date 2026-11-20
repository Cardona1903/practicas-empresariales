# Plan: 002 Revisar y validar la postulación del estudiante (CU-02)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La lógica de revisión y transición de estados reside en el módulo `postulacion` (`PostulacionController` y `PostulacionService`). Para el registro en la bitácora de auditoría se consume exclusivamente el servicio exportado `AuditoriaService` del módulo `compartido/auditoria`, sin inyectar ni importar repositorios ajenos (`Repository<RegistroAuditoria>`).
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia transaccional en PostgreSQL de los cambios de estado y del motivo de rechazo sobre la entidad `Postulacion`, así como del registro de trazabilidad en `RegistroAuditoria`.
- **ADR-003 (Máquina de estados con aprobación manual):** Se define explícitamente la tabla `TRANSICIONES_VALIDAS` para la entidad `Postulacion`:
  - `RECIBIDA` $\rightarrow$ `EN_REVISION`
  - `EN_REVISION` $\rightarrow$ `VALIDADA` | `RECHAZADA`
  - `VALIDADA` $\rightarrow$ *(estado terminal, sin transiciones)*
  - `RECHAZADA` $\rightarrow$ *(estado terminal, sin transiciones)*
  Ninguna transición se ejecuta de forma automática; toda transición exige la acción explícita de un usuario autenticado con rol `ADMINISTRATIVO` (RN-01).
- **ADR-004 (SSO + RBAC y acceso institucional):** Protección del endpoint `PATCH /postulaciones/:id` mediante `SsoAuthGuard` y `RolesGuard`, exigiendo el rol `ADMINISTRATIVO` y extrayendo el identificador del actor desde el JWT institucional (`@UsuarioActual()`).
- **ADR-006 (Manejo centralizado de errores con reintento manual):** Uso del filtro global `HttpExceptionFilter` y errores tipados que heredan de `DominioError`:
  - HTTP 404 (`PostulacionNoEncontradaError`) cuando el identificador de la postulación no existe.
  - HTTP 409 (`TransicionEstadoInvalidaError`) cuando la transición solicitada no está permitida por `TRANSICIONES_VALIDAS`.
  - HTTP 400 (`MotivoRechazoObligatorioError` / `ValidationPipe`) cuando se rechaza sin motivo o se envía un estado que no pertenece a `EstadoPostulacion`.
- **Vistas arquitectónicas y preocupaciones:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `Postulacion` (atributos `id`, `estado`, `documentosAdjuntos`, `motivoRechazo`, `estudiante`) y `RegistroAuditoria` (`evento`, `actorId`, `resultado`, `detalles`, `fecha`).
  - *Vista de Procesos (`docs/vistas/02-procesos.md`) y Escenario +1 (`docs/diagramas/secuencias/cu02-revisar-postulacion.puml`):* Petición síncrona `PATCH /postulaciones/{id}` procesada por el módulo `Postulacion` contra PostgreSQL.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository` sin capas intermedias innecesarias.
  - *Preocupación PA-04 (Registro y trazabilidad):* Cada cambio de estado exitoso queda registrado en `RegistroAuditoria` con el documento del administrativo, el ID de la postulación, el estado anterior, el nuevo estado y la fecha; las transiciones rechazadas por inválidas no generan registro de transición.
  - *Escenario de calidad EAC-03 (Seguridad):* El 100% de los intentos de revisión sin token SSO o con rol distinto a `ADMINISTRATIVO` (p. ej. `ESTUDIANTE` o supervisor externo) son bloqueados con HTTP 401/403 y registrados en `RegistroAuditoria` en $\le 1$ segundo.

## Componentes
- `src/compartido/errores/`:
  - `dominio.error.ts`: Agregar las subclases de error de dominio `PostulacionNoEncontradaError` (HTTP 404), `TransicionEstadoInvalidaError` (HTTP 409) y `MotivoRechazoObligatorioError` (HTTP 400).
  - `http-exception.filter.ts`: Filtro global existente que traduce `DominioError` y `HttpException` a respuestas JSON estandarizadas.
- `src/compartido/auth/`:
  - `guards/sso-auth.guard.ts`: Valida la sesión SSO JWT y registra accesos no autenticados (HTTP 401) en auditoría.
  - `guards/roles.guard.ts`: Verifica el rol `ADMINISTRATIVO` y registra intentos con rol indebido (HTTP 403) en auditoría.
  - `decorators/roles.decorator.ts` y `decorators/usuario-actual.decorator.ts`: Decoradores `@Roles('ADMINISTRATIVO')` y `@UsuarioActual()`.
- `src/compartido/auditoria/`:
  - `auditoria.service.ts`: Servicio exportado (`AuditoriaService.registrarEvento`) utilizado para auditar las transiciones de estado exitosas (PA-04) y los accesos denegados (EAC-03).
- `src/postulacion/`:
  - `enums/estado-postulacion.enum.ts`: Enumeración `EstadoPostulacion` (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`).
  - `entities/postulacion.entity.ts`: Entidad TypeORM `Postulacion`; se añade la columna opcional `motivoRechazo` (`varchar`, `nullable: true`) para almacenar el motivo cuando pasa a `RECHAZADA`.
  - `dto/revisar-postulacion.dto.ts`: Nuevo DTO de entrada para `PATCH /postulaciones/:id` con validadores `class-validator` (`@IsEnum(EstadoPostulacion)` para `estado`, y `@IsOptional()`, `@IsString()` para `motivo`).
  - `postulacion.service.ts`: Se define el mapa `TRANSICIONES_VALIDAS`, se inyecta `AuditoriaService` y se implementa el método `revisarPostulacion(id: string, dto: RevisarPostulacionDto, actorId: string): Promise<Postulacion>`.
  - `postulacion.controller.ts`: Se agrega el endpoint `PATCH /postulaciones/:id` protegido con `@Roles('ADMINISTRATIVO')`.
  - `postulacion.module.ts`: Ya importa `AuditoriaModule`, `AuthModule`, `ConfiguracionModule` y `TypeOrmModule.forFeature([Postulacion, Estudiante])`.

## Flujo
Basado en el diagrama de secuencia `docs/diagramas/secuencias/cu02-revisar-postulacion.puml`:
1. El personal administrativo autenticado envía una petición `PATCH /postulaciones/{id}` con el cuerpo `{ "estado": "<nuevo_estado>", "motivo"?: "<texto>" }` y su token JWT institucional.
2. `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si el usuario no está autenticado o su rol no es `ADMINISTRATIVO`, se bloquea la petición con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` persiste el evento en `RegistroAuditoria` en menos de 1 segundo (EAC-03).
3. `ValidationPipe` valida el cuerpo contra `RevisarPostulacionDto`:
   - Si `estado` no pertenece a `EstadoPostulacion` (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`), responde inmediatamente con HTTP 400 Bad Request sin tocar la base de datos.
4. `PostulacionController.revisarPostulacion(id, dto, usuario)` invoca a `PostulacionService.revisarPostulacion(id, dto, usuario.documento)`.
5. `PostulacionService` ejecuta `SELECT` de la postulación por `id` mediante `postulacionRepo.findOne({ where: { id } })`:
   - Si no existe, lanza `PostulacionNoEncontradaError` (HTTP 404 Not Found).
6. `PostulacionService` verifica la máquina de estados (`TRANSICIONES_VALIDAS[postulacion.estado]`):
   - Si el `dto.estado` no está permitido desde el estado actual (p. ej., `RECIBIDA` $\rightarrow$ `VALIDADA`, `VALIDADA` $\rightarrow$ `RECHAZADA`, `RECHAZADA` $\rightarrow$ `EN_REVISION`), lanza `TransicionEstadoInvalidaError` (HTTP 409 Conflict) sin modificar la entidad ni registrar transición en la bitácora.
7. Si el nuevo estado solicitado es `RECHAZADA`:
   - Verifica que `dto.motivo` esté presente y no sea una cadena vacía; si falta, lanza `MotivoRechazoObligatorioError` (HTTP 400 Bad Request) conservando el estado `EN_REVISION`.
   - Si el motivo es válido, lo asigna a `postulacion.motivoRechazo`.
8. `PostulacionService` actualiza `postulacion.estado = dto.estado` y ejecuta `UPDATE` en PostgreSQL mediante `postulacionRepo.save(postulacion)`.
9. `PostulacionService` invoca `auditoriaService.registrarEvento('CAMBIO_ESTADO_POSTULACION', 'EXITOSO', actorId, detalles)` registrando el ID de la postulación, el estado anterior (`estadoAnterior`) y el nuevo estado (`dto.estado`) (PA-04).
10. El controlador retorna la postulación actualizada con código HTTP 200 OK.

## Fuera de alcance
- Radicación inicial de la postulación y validación automática de completitud/integridad de archivos PDF (implementado en CU-09 / `specs/009-postularse`).
- Consulta y filtrado del listado general de peticiones de postulación (implementado en CU-01 / `specs/001-visualizar-peticiones`).
- Asignación de tutor o supervisor empresarial una vez validada la postulación (pertenece a CU-03).
- Motores de reglas de aprobación automática de postulaciones (expresamente prohibidos por RN-01 y ADR-003).
- Sistema de mensajería, chat o notificaciones por correo electrónico al estudiante (excluido del alcance en `docs/vision.md`).
- Interfaz gráfica web SPA / Frontend (DT-03).
