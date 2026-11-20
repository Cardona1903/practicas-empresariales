# Plan: 001 Visualizar peticiones de postulación (CU-01)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La funcionalidad se confina exclusivamente al módulo `postulacion`. Se expone mediante `PostulacionController` y `PostulacionService`. No se importan ni inyectan repositorios ajenos; el módulo gestiona de forma directa su entidad `Postulacion` y la relación con `Estudiante`.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia y consulta en base de datos PostgreSQL institucional mediante el repositorio TypeORM de `Postulacion`, consultando la relación eager/join con `Estudiante`.
- **ADR-003 (Máquina de estados con aprobación manual):** Las peticiones listadas reflejan con exactitud los estados válidos de la máquina de estados (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`), permitiendo al personal administrativo identificar oportunamente las solicitudes pendientes de trámite para su posterior revisión en CU-02 (RN-01).
- **ADR-004 (SSO + RBAC y acceso institucional):** Autenticación institucional JWT mediante `SsoAuthGuard` y autorización por roles mediante `RolesGuard`, exigiendo estrictamente el rol `ADMINISTRATIVO`. Se restringe el acceso a estudiantes, supervisores externos y usuarios anónimos.
- **ADR-006 (Manejo centralizado de errores con reintento manual):** Respuestas de error estandarizadas a través del filtro global `HttpExceptionFilter`. Validación de parámetros de entrada con `ValidationPipe` (HTTP 400 Bad Request ante valores de estado no reconocidos).
- **Vistas arquitectónicas y calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades de dominio `Postulacion` (atributos `id`, `estado`, `documentosAdjuntos`, `creadaEn`) y `Estudiante` (`documento`, `programaAcademico`).
  - *Vista de Procesos (`docs/vistas/02-procesos.md`):* Consulta HTTP `GET /postulaciones` sincrónica sobre la API REST institucional.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Arquitectura Controller-Service-Repository directa sin capas intermedias superfluas ni interfaces de puerto artificiales.
  - *Escenario de calidad EAC-03 (Seguridad):* El 100% de los intentos de acceso no autorizados son denegados (HTTP 401/403) y registrados en la bitácora `RegistroAuditoria` en menos de 1 segundo vía `AuditoriaService`.
  - *Objetivo de negocio OB-01 (`docs/vision.md`):* Reducir en un 75% el tiempo operativo dedicado por el personal administrativo en la visualización y consulta de datos.

## Componentes
- `src/compartido/auth/`:
  - `guards/sso-auth.guard.ts`: Valida la autenticidad y vigencia del JWT institucional SSO.
  - `guards/roles.guard.ts`: Comprueba que el usuario autenticado posea el rol `ADMINISTRATIVO`.
  - `decorators/roles.decorator.ts`: Decorador `@Roles('ADMINISTRATIVO')`.
  - `auth.module.ts`: Provee y exporta los módulos de autenticación y autorización.
- `src/compartido/auditoria/`:
  - `entities/registro-auditoria.entity.ts`: Modelo TypeORM de `RegistroAuditoria`.
  - `auditoria.service.ts`: Registra eventos e intentos de acceso no autorizados en menos de 1 segundo (EAC-03).
  - `auditoria.module.ts`: Exporta `AuditoriaService`.
- `src/compartido/errores/`:
  - `http-exception.filter.ts`: Filtro global que unifica las excepciones HTTP y respuestas de error.
- `src/postulacion/`:
  - `enums/estado-postulacion.enum.ts`: Enumeración de estados (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`).
  - `dto/consultar-postulaciones-filtro.dto.ts`: DTO con validaciones `@IsOptional()` e `@IsEnum(EstadoPostulacion)` para capturar y validar el query parameter opcional `?estado=`.
  - `entities/postulacion.entity.ts`: Entidad TypeORM `Postulacion`.
  - `entities/estudiante.entity.ts`: Entidad TypeORM `Estudiante`.
  - `postulacion.controller.ts`: Expone el endpoint `GET /postulaciones` con `@Roles('ADMINISTRATIVO')` y `@UseGuards(SsoAuthGuard, RolesGuard)`.
  - `postulacion.service.ts`: Implementa el método `listarPostulaciones(estado?: EstadoPostulacion): Promise<Postulacion[]>`, ordenando por `creadaEn: 'DESC'` e incluyendo la relación `estudiante`.
  - `postulacion.module.ts`: Módulo NestJS que declara y provee los controladores, servicios y repositorios TypeORM necesarios.

## Flujo
Flujo síncrono de consulta y autorización:
1. El usuario administrativo autenticado realiza una petición HTTP `GET /postulaciones` (con query param opcional `?estado=RECIBIDA`) enviando su token JWT institucional.
2. `SsoAuthGuard` y `RolesGuard` interceptan la petición:
   - Si no existe token válido, o el rol no coincide con `ADMINISTRATIVO` (por ejemplo un estudiante o un supervisor externo), se deniega de inmediato con código HTTP 401 o 403.
   - En caso de acceso denegado, `AuditoriaService.registrarAccesoDenegado()` registra el intento en `RegistroAuditoria` en $\le 1$ segundo cumpliendo el atributo de seguridad EAC-03.
3. Si el usuario cuenta con el rol `ADMINISTRATIVO`, la petición avanza hacia `PostulacionController`:
   - El `ValidationPipe` valida el DTO de consulta; si el valor de `estado` no pertenece a `EstadoPostulacion`, retorna HTTP 400 Bad Request.
4. `PostulacionController.obtenerPostulaciones(filtroDto)` delega en `PostulacionService.listarPostulaciones(filtroDto.estado)`.
5. `PostulacionService` consulta el repositorio TypeORM `postulacionRepo`:
   - Incluye la relación con la entidad `estudiante` para extraer `documento` y `programaAcademico`.
   - Si se suministró el filtro de estado, aplica la condición `where: { estado }`.
   - Aplica el ordenamiento cronológico descendente `order: { creadaEn: 'DESC' }`.
6. La base de datos PostgreSQL retorna las entidades coincidentes:
   - Si no existen postulaciones registradas, se retorna un arreglo vacío `[]`.
   - Si existen postulaciones, se retorna el listado de objetos con identificador, datos del estudiante, fecha de radicación, documentos adjuntos y estado.
7. `PostulacionController` responde con código HTTP 200 OK y el cuerpo de la respuesta en formato JSON.

## Fuera de alcance
- Transición y actualización de estados (`EN_REVISION`, `VALIDADA`, `RECHAZADA`), que corresponde a CU-02 (Revisar y validar postulación).
- Creación y radicación de nuevas postulaciones con carga de documentos, correspondiente a CU-09 (Postularse a la práctica).
- Asignación de tutores o supervisores a postulaciones validadas (CU-03).
- Generación de reportes consolidados o indicadores generales de gestión (CU-08).
- Interfaz gráfica web de usuario SPA / Frontend (DT-03: se desarrollará de forma desacoplada consumiendo la API REST).
- Paginación compleja por cursores o páginas (descartada en `spec.md`, entregando listado completo ordenado por fecha de radicación).
