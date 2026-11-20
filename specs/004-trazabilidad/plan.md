# Plan: 004 Visualización de datos y trazabilidad de postulantes (CU-04)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La funcionalidad reside en el módulo `postulacion` (`PostulacionController` y `PostulacionService`). Siguiendo la regla estricta de modularidad, `PostulacionService` **no** importa ni inyecta el `Repository<RegistroAuditoria>` del módulo `compartido/auditoria`; toda consulta de eventos de auditoría asociados al trámite se realiza exclusivamente invocando el servicio exportado `AuditoriaService`.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Consulta de las entidades `Estudiante` y `Postulacion` en PostgreSQL mediante los repositorios TypeORM del módulo `postulacion`, y consulta de `RegistroAuditoria` a través de `AuditoriaService`.
- **ADR-003 (Máquina de estados con aprobación manual):** El detalle de la postulación expone el estado actual de la máquina de estados (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`) y el `motivoRechazo` cuando aplica, junto con la trazabilidad de sus transiciones manuales (RN-01).
- **ADR-004 (SSO + RBAC y acceso institucional):** El endpoint `GET /postulaciones/estudiante/:documento` se protege con `SsoAuthGuard` y `RolesGuard`, exigiendo estrictamente el rol `ADMINISTRATIVO`. Se bloquea el acceso a usuarios no autenticados, estudiantes y supervisores externos (RN-02).
- **ADR-006 (Manejo centralizado de errores con reintento manual):** Respuestas de error unificadas mediante `HttpExceptionFilter` y errores de dominio tipados que heredan de `DominioError` (`PostulacionNoEncontradaError` mapeado a HTTP 404 cuando no existe postulante o postulación para el documento consultado).
- **Vistas arquitectónicas y calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `Estudiante` (`documento`, `programaAcademico`), `Postulacion` (`id`, `estado`, `documentosAdjuntos`, `motivoRechazo`, `creadaEn`, `actualizadaEn`) y `RegistroAuditoria` (`evento`, `resultado`, `fecha`).
  - *Vista de Procesos (`docs/vistas/02-procesos.md`):* Consulta HTTP `GET /postulaciones/estudiante/:documento` síncrona atendida por el contenedor API de prácticas contra PostgreSQL.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository` en `postulacion`, comunicándose con `compartido/auditoria` únicamente mediante `AuditoriaService`.
  - *Preocupación PA-04 (Registro y trazabilidad):* Consulta de los eventos registrados en `RegistroAuditoria` asociados a la postulación del estudiante (cambios de estado y eventos del trámite) y registro de cualquier intento de acceso denegado.
  - *Escenario de calidad EAC-03 (Seguridad):* El 100% de los intentos de consulta sin sesión SSO válida o con rol distinto a `ADMINISTRATIVO` son bloqueados con HTTP 401/403 y registrados en `RegistroAuditoria` en $\le 1$ segundo.

## Componentes
- `src/compartido/auth/`:
  - `guards/sso-auth.guard.ts`: Valida el token JWT institucional SSO y audita intentos no autenticados (HTTP 401).
  - `guards/roles.guard.ts`: Verifica que el usuario autenticado tenga el rol `ADMINISTRATIVO` y audita intentos sin permiso (HTTP 403).
  - `decorators/roles.decorator.ts`: Decorador `@Roles('ADMINISTRATIVO')`.
- `src/compartido/auditoria/`:
  - `entities/registro-auditoria.entity.ts`: Entidad TypeORM `RegistroAuditoria` (`id`, `evento`, `actorId`, `resultado`, `detalles`, `fecha`).
  - `auditoria.service.ts`: Se añade el método exportado `consultarPorTramite(postulacionId: string, documentoEstudiante: string): Promise<Array<{ evento: string; resultado: string; fecha: Date }>>` (o consulta equivalente de `RegistroAuditoria` ordenada cronológicamente) para entregar los eventos asociados al trámite sin exponer el repositorio fuera de `AuditoriaModule` (ADR-001).
  - `auditoria.module.ts`: Exporta `AuditoriaService`.
- `src/compartido/errores/`:
  - `dominio.error.ts`: Reutiliza `PostulacionNoEncontradaError` (HTTP 404) cuando no se encuentra estudiante o postulación con el `documento` solicitado.
  - `http-exception.filter.ts`: Filtro global que formatea las excepciones de dominio y HTTP.
- `src/postulacion/`:
  - `entities/estudiante.entity.ts`: Entidad TypeORM `Estudiante` (`documento`, `programaAcademico`).
  - `entities/postulacion.entity.ts`: Entidad TypeORM `Postulacion` (`id`, `estado`, `documentosAdjuntos`, `motivoRechazo`, `creadaEn`, `actualizadaEn`, relación `estudiante`).
  - `postulacion.service.ts`: Se añade el método `obtenerTrazabilidadPorEstudiante(documento: string)` que busca la postulación y los datos del estudiante por `documento` (lanzando `PostulacionNoEncontradaError` HTTP 404 si no existe), consulta los eventos de auditoría asociados mediante `this.auditoriaService` y retorna la estructura consolidada `{ estudiante, postulacion, trazabilidad }`.
  - `postulacion.controller.ts`: Se añade el endpoint `GET /postulaciones/estudiante/:documento` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`.
  - `postulacion.module.ts`: Ya importa `AuditoriaModule`, `AuthModule` y `TypeOrmModule.forFeature([Postulacion, Estudiante])`.

## Flujo
Basado en la arquitectura de `docs/vistas/03-desarrollo.md` y el patrón de secuencia de `docs/diagramas/secuencias/cu02-revisar-postulacion.puml` (CU-04 no es un caso de uso primario en `docs/drivers.md`, sección 7, por lo que recorre los mismos elementos de Contexto, Lógica, Procesos y Desarrollo que ESC-02):
1. El usuario con rol `ADMINISTRATIVO` autenticado vía SSO envía una petición `GET /postulaciones/estudiante/{documento}` con su token JWT institucional.
2. `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si no hay sesión SSO válida o el rol no es `ADMINISTRATIVO` (p. ej., un `ESTUDIANTE` o un supervisor externo), bloquean el acceso con código HTTP 401 o 403.
   - `AuditoriaService.registrarAccesoDenegado()` registra el intento no autorizado en `RegistroAuditoria` en menos de 1 segundo (EAC-03, PA-04).
3. Si la autorización es exitosa, `PostulacionController.obtenerTrazabilidadEstudiante(documento)` invoca a `PostulacionService.obtenerTrazabilidadPorEstudiante(documento)`.
4. `PostulacionService` consulta `postulacionRepo` buscando la postulación asociada al estudiante con `documento` (incluyendo la relación `estudiante`):
   - Si no existe ningún estudiante ni postulación registrada con ese documento, lanza `PostulacionNoEncontradaError` y `HttpExceptionFilter` responde con código HTTP 404 indicando que el postulante no fue encontrado.
5. Si existe la postulación, `PostulacionService` invoca al servicio exportado `AuditoriaService` (respetando ADR-001) para recuperar los eventos de auditoría vinculados a dicha postulación/estudiante.
6. `PostulacionService` construye y retorna la respuesta con:
   - Datos del estudiante postulante: `documento`, `programaAcademico`.
   - Detalle de la postulación: `id`, `estado`, `documentosAdjuntos`, `motivoRechazo`, `creadaEn`, `actualizadaEn`.
   - Lista de eventos de auditoría asociados al trámite: `evento`, `resultado`, `fecha`.
7. `PostulacionController` responde con código HTTP 200 OK y el cuerpo JSON resultante.

## Fuera de alcance
- Modificación o transición del estado de la postulación consultada (corresponde a CU-02 / `specs/002-revisar-postulacion`).
- Consulta del listado general de todas las peticiones de postulación (corresponde a CU-01 / `specs/001-visualizar-peticiones`).
- Radicación de nuevas postulaciones por parte del estudiante (corresponde a CU-09 / `specs/009-postularse`).
- Consulta del estado de postulación y avance de horas por parte del propio estudiante (corresponde a CU-10).
- Reportes o indicadores globales agregados de todas las prácticas en curso (corresponde a CU-08).
- Interfaz gráfica web SPA / Frontend (DT-03).
