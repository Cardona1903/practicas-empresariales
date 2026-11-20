# Plan: 006 Dar confirmación para la generación del acta final (CU-06)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La confirmación administrativa de la petición de acta final reside en el módulo de negocio `actas` (`ActasController` y `ActasService`). Respeta la regla estricta de modularidad: `ActasService` opera sobre su propia entidad `Acta` (`Repository<Acta>`) y registra la auditoría invocando exclusivamente el servicio exportado `AuditoriaService` de `AuditoriaModule`, sin importar ni inyectar repositorios ajenos.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Actualización transaccional en PostgreSQL del registro de `Acta` cambiando su estado de `SOLICITADA` a `CONFIRMADA`.
- **RN-01 (Exclusión de automatizaciones en flujos de trabajo):** La transición de una petición de acta desde `SOLICITADA` (creada por el estudiante en CU-11) hacia `CONFIRMADA` requiere una acción humana explícita de un funcionario administrativo autenticado (`PATCH /actas/:id/confirmar`). Asimismo, confirmar el acta no genera el PDF automáticamente; la expedición del archivo PDF ocurre cuando el administrativo invoca explícitamente `POST /actas` en CU-07.
- **ADR-004 (SSO + RBAC para actores institucionales):** El endpoint `PATCH /actas/:id/confirmar` está protegido mediante `SsoAuthGuard` y `RolesGuard`, exigiendo el rol `ADMINISTRATIVO` y extrayendo el documento del administrativo desde el JWT institucional (`@UsuarioActual()`).
- **ADR-005 y ADR-006 (Ciclo de vida del acta y manejo centralizado de errores):**
  - Se extiende `EstadoActa` con el valor `CONFIRMADA = 'CONFIRMADA'` (`SOLICITADA -> CONFIRMADA -> GENERADA / FALLIDA`).
  - En `solicitarActa` (CU-11), también se impide duplicar peticiones si ya existe un acta en estado `CONFIRMADA`.
  - Se emplean subclases tipadas de `DominioError` procesadas por `HttpExceptionFilter`:
    - HTTP 404 (`ActaNoEncontradaError`) cuando el identificador del acta no existe.
    - HTTP 409 (`TransicionEstadoActaInvalidaError`) cuando se intenta confirmar un acta cuyo estado actual no es `SOLICITADA` (por ejemplo, ya está en `CONFIRMADA` o `GENERADA`).
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `Acta` (`id`, `estudianteId`, `totalHoras`, `rutaPdf`, `estado`, `detalleError`, `creadoEn`), `EstadoActa` y `RegistroAuditoria`.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller -> Service -> Repository` dentro del `Módulo Actas`.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de los intentos sin autenticación SSO o con rol distinto a `ADMINISTRATIVO` son bloqueados con HTTP 401/403 y registrados en `RegistroAuditoria` en menos de 1 segundo; cada confirmación exitosa queda registrada en `RegistroAuditoria` con el documento del administrativo.

## Componentes
- `src/actas/enums/estado-acta.enum.ts`:
  - Se agrega `CONFIRMADA = 'CONFIRMADA'` a la enumeración `EstadoActa`.
- `src/compartido/errores/dominio.error.ts`:
  - Se agregan `ActaNoEncontradaError` (HTTP 404 Not Found) y `TransicionEstadoActaInvalidaError` (HTTP 409 Conflict).
- `src/actas/actas.service.ts`:
  - Se implementa `confirmarActa(id: string, actorId: string): Promise<Acta>` que busca el acta por `id` (404 si no existe), verifica que su estado sea `EstadoActa.SOLICITADA` (409 si está en otro estado), actualiza su estado a `EstadoActa.CONFIRMADA` sin renderizar el PDF (RN-01) y registra el evento `CONFIRMACION_ACTA` en `RegistroAuditoria` (PA-04).
- `src/actas/actas.controller.ts`:
  - Se agrega el endpoint `PATCH /actas/:id/confirmar` decorado con `@Patch(':id/confirmar')`, `@Roles('ADMINISTRATIVO')` y `@HttpCode(HttpStatus.OK)`.

## Flujo
1. El personal administrativo autenticado con SSO envía una solicitud `PATCH /actas/{id}/confirmar` con su token JWT institucional.
2. `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si el usuario no está autenticado o su rol no es `ADMINISTRATIVO`, se bloquea la petición con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` registra el intento en `RegistroAuditoria` en $\le 1$ segundo (EAC-03, PA-04).
3. `ActasController.confirmarActa(id, usuario)` invoca a `ActasService.confirmarActa(id, usuario.documento)`.
4. `ActasService` busca el registro de `Acta` por `id` en PostgreSQL:
   - Si no existe, lanza `ActaNoEncontradaError` (HTTP 404 Not Found).
   - Si el estado actual del acta no es `EstadoActa.SOLICITADA`, lanza `TransicionEstadoActaInvalidaError` (HTTP 409 Conflict).
5. `ActasService` actualiza `acta.estado = EstadoActa.CONFIRMADA` y ejecuta `UPDATE` en PostgreSQL mediante `actaRepo.save(acta)`.
6. `ActasService` registra el cambio de estado en `RegistroAuditoria` invocando `auditoriaService.registrarEvento('CONFIRMACION_ACTA', 'EXITOSO', actorId, detalles)` (PA-04).
7. El controlador retorna el registro `Acta` actualizado en estado `CONFIRMADA` con código HTTP 200 OK.

## Fuera de alcance
- Radicación inicial de la petición de acta por parte del estudiante (implementado en CU-11 / `specs/011-generar-peticion/`).
- Renderizado del archivo PDF con PDFKit y almacenamiento en disco local (implementado en CU-07 / `specs/007-generar-acta/`).
- Interfaz gráfica web SPA / Frontend (DT-03).
