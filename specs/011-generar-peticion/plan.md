# Plan: 011 Generar petición del acta final (CU-11)

## Decisiones que aplican

- **ADR-001 (Monolito modular por módulos de negocio):** La funcionalidad de solicitud del acta final por parte del estudiante reside en el módulo `actas` (`ActasController` y `ActasService`). Se respeta la regla estricta de modularidad: el módulo `actas` no importa ni inyecta repositorios de otros módulos (`Repository<Postulacion>`, `Repository<RegistroHoras>`, `Repository<RequisitoPrograma>`), sino que se comunica exclusivamente mediante sus servicios exportados (`PostulacionService`, `HorasService`, `ConfiguracionService`, `AuditoriaService`).
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia relacional del registro de `Acta` en estado `SOLICITADA` (con `rutaPdf = null` y `detalleError = null`) en PostgreSQL sobre infraestructura on-premise institucional (RT-01).
- **ADR-003 (Máquina de estados con aprobación manual en la postulación):** Precondición obligatoria: el estudiante solo puede radicar la petición del acta final si su postulación se encuentra en estado `VALIDADA`. Si no existe postulación o está en `RECIBIDA`, `EN_REVISION` o `RECHAZADA`, la petición se rechaza con HTTP 409 Conflict (`PostulacionNoValidadaError`).
- **ADR-004 (SSO + RBAC y control de acceso institucional):** El endpoint `POST /actas/solicitar` está protegido mediante `SsoAuthGuard` y `RolesGuard`, restringido exclusivamente al rol `ESTUDIANTE` (`@Roles('ESTUDIANTE')`). La identidad del estudiante (`usuario.documento`) se toma directamente del token JWT institucional (`@UsuarioActual()`), impidiendo que un estudiante solicite actas a nombre de otro. Todo intento sin autenticación o con un rol distinto (`ADMINISTRATIVO` o supervisor externo) es bloqueado al 100% con HTTP 401/403 y registrado en `RegistroAuditoria` en $\le 1$ segundo (EAC-03).
- **ADR-005 (Generación síncrona del acta con consolidación transaccional):** CU-11 actúa como el disparador previo (solicitud del estudiante) en el módulo `actas`: verifica y consolida el total de horas en estado `VERIFICADA` al momento de la solicitud, dejando el registro de `Acta` en estado `SOLICITADA` sin renderizar el PDF automáticamente, a la espera de la confirmación y expedición manual del personal administrativo (CU-06, CU-07).
- **ADR-006 (Manejo de errores centralizado):** Uso del filtro global `HttpExceptionFilter` y errores de negocio tipados que heredan de `DominioError` (`PostulacionNoValidadaError`, `HorasInsuficientesError`, `ActaYaExisteError` / `PeticionActaYaExisteError` con código HTTP 409 Conflict).
- **ADR-007 (Configuración de requisitos y horas mínimas por programa académico):** El mínimo de horas verificadas exigido para permitir la petición se consulta dinámicamente desde `RequisitoPrograma` a través de `ConfiguracionService.obtenerRequisitosVigentes(programaAcademico)`, sin valores quemados en código (PA-05, EAC-02).
- **RN-01 (Exclusión de automatizaciones en flujos de trabajo):** Al radicar la petición del estudiante (`POST /actas/solicitar`), el sistema únicamente crea la solicitud en estado `SOLICITADA` y nunca dispara automáticamente la generación del PDF ni la aprobación final.
- **PA-04 (Registro y trazabilidad):** Tanto la creación exitosa de la petición de acta en estado `SOLICITADA` como el 100% de los accesos denegados quedan registrados en la bitácora `RegistroAuditoria` mediante `AuditoriaService`.
- **Vistas arquitectónicas (`docs/vistas/01-logica.md` y `docs/vistas/03-desarrollo.md`):** Se mantiene la estructura sin capas intermedias innecesarias (`ActasController` → `ActasService` → `@InjectRepository(Acta)` + servicios exportados de `PostulacionModule`, `HorasModule`, `ConfiguracionModule` y `AuditoriaModule`).

## Componentes

- `src/actas/enums/estado-acta.enum.ts`:
  - Extender la enumeración `EstadoActa` para incluir el estado `SOLICITADA = 'SOLICITADA'` además de `GENERADA` y `FALLIDA`.
- `src/actas/entities/acta.entity.ts`:
  - Entidad TypeORM `Acta` (`id`, `estudianteId`, `totalHoras`, `rutaPdf` nullable, `estado` con enum `EstadoActa`, `detalleError` nullable, `creadoEn`). Cuando se registra la petición en CU-11, `estado` es `EstadoActa.SOLICITADA` y `rutaPdf` permanece en `null`.
- `src/compartido/errores/dominio.error.ts`:
  - Reutilización de `PostulacionNoValidadaError` (HTTP 409), `HorasInsuficientesError` (HTTP 409) y `ActaYaExisteError` (HTTP 409, para rechazar peticiones duplicadas cuando ya existe un acta en estado `SOLICITADA` o `GENERADA`).
- `src/actas/actas.service.ts`:
  - Nuevo método `solicitarActa(estudianteId: string): Promise<Acta>`:
    1. Consulta en `Repository<Acta>` si ya existe un registro para `estudianteId` con estado `SOLICITADA` o `GENERADA`. Si existe, lanza `ActaYaExisteError` (HTTP 409 Conflict).
    2. Verifica mediante `postulacionService.estaValidada(estudianteId)` y `postulacionService.obtenerPorEstudiante(estudianteId)` que el estudiante tenga una postulación en estado `VALIDADA`. Si no existe o está en otro estado, lanza `PostulacionNoValidadaError` (HTTP 409 Conflict).
    3. Obtiene los requisitos vigentes del programa académico del estudiante con `configuracionService.obtenerRequisitosVigentes(postulacion.estudiante.programaAcademico)` y consulta las horas verificadas con `horasService.totalHorasValidadas(estudianteId)`.
    4. Si `totalHoras < requisito.horasMinimas`, lanza `HorasInsuficientesError` (HTTP 409 Conflict).
    5. Crea y guarda en PostgreSQL un registro de `Acta` con `estudianteId`, `totalHoras`, `rutaPdf: null`, `estado: EstadoActa.SOLICITADA`, `detalleError: null` (sin generar archivo PDF, respetando RN-01).
    6. Registra el evento `'SOLICITUD_ACTA'` con resultado `'EXITOSO'` y actor `estudianteId` en `AuditoriaService` (PA-04).
    7. Retorna la entidad `Acta` creada en estado `SOLICITADA`.
  - Ajuste compatible en `generarActa(estudianteId: string, actorId: string)` (CU-07): si el estudiante tenía un acta previa en estado `SOLICITADA`, permite que el administrativo la procese o expida el acta `GENERADA`, manteniendo el bloqueo HTTP 409 únicamente si ya existe un acta en estado `GENERADA`.
- `src/actas/actas.controller.ts`:
  - Nuevo endpoint `POST /actas/solicitar`:
    - Decorado con `@Post('solicitar')`, `@Roles('ESTUDIANTE')` y `@HttpCode(HttpStatus.CREATED)`.
    - Protegido a nivel de controlador por `@UseGuards(SsoAuthGuard, RolesGuard)` (ADR-004, EAC-03).
    - Extrae el estudiante autenticado con `@UsuarioActual() usuario: UsuarioAutenticado` e invoca `this.actasService.solicitarActa(usuario.documento)`.
- `src/actas/actas.module.ts`:
  - Sin nuevas dependencias externas: ya importa `TypeOrmModule.forFeature([Acta])`, `PostulacionModule`, `HorasModule`, `ConfiguracionModule`, `AuditoriaModule` y `AuthModule`.

## Flujo

Correspondiente a la interacción de CU-11 como disparador previo del escenario `docs/diagramas/secuencias/cu07-generar-acta.puml` (ESC-06) y el control de acceso de `ADR-004`:

1. El estudiante autenticado con SSO institucional envía una solicitud HTTP `POST /actas/solicitar` con su token JWT en el encabezado `Authorization`.
2. `SsoAuthGuard` y `RolesGuard` validan la sesión y el rol:
   - Si el usuario no está autenticado o su rol no es `ESTUDIANTE` (por ejemplo, `ADMINISTRATIVO` o un supervisor externo), el guard bloquea el acceso respondiendo con código HTTP 401 o 403 y registra el intento en `RegistroAuditoria` en menos de 1 segundo (EAC-03, PA-04).
3. `ActasController.solicitarActa()` extrae `usuario.documento` desde `@UsuarioActual()` e invoca `ActasService.solicitarActa(usuario.documento)`.
4. `ActasService` verifica en `Repository<Acta>` si ya existe un registro para `estudianteId` en estado `SOLICITADA` o `GENERADA`:
   - Si ya existe, lanza `ActaYaExisteError` y el sistema responde con HTTP 409 Conflict sin alterar los registros existentes.
5. `ActasService` consulta a `PostulacionService.estaValidada(estudianteId)` y `PostulacionService.obtenerPorEstudiante(estudianteId)` (ADR-001):
   - Si no existe postulación o su estado es distinto de `VALIDADA` (`RECIBIDA`, `EN_REVISION`, `RECHAZADA`), lanza `PostulacionNoValidadaError` y el sistema responde con HTTP 409 Conflict ("la postulación aún no está validada").
6. `ActasService` consulta los requisitos del programa académico mediante `ConfiguracionService.obtenerRequisitosVigentes(programaAcademico)` (ADR-007) y el total de horas verificadas mediante `HorasService.totalHorasValidadas(estudianteId)` (CU-05):
   - Si `totalHoras < requisito.horasMinimas`, lanza `HorasInsuficientesError` y el sistema responde con HTTP 409 Conflict ("El estudiante no cumple con las horas mínimas verificadas requeridas por su programa académico").
7. Si todas las validaciones se cumplen:
   - `ActasService` persiste en PostgreSQL la entidad `Acta` con `estado = 'SOLICITADA'`, `totalHoras = totalHoras`, `rutaPdf = null` y `detalleError = null`.
   - No se renderiza ningún archivo PDF en este paso (RN-01).
   - `AuditoriaService.registrarEvento('SOLICITUD_ACTA', 'EXITOSO', estudianteId, ...)` registra la trazabilidad de la petición en `RegistroAuditoria` (PA-04).
   - El controlador responde con código HTTP 201 Created y los datos del registro `Acta` en estado `SOLICITADA`.

## Fuera de alcance

- Generación automática del archivo PDF del acta al momento de la solicitud del estudiante (prohibido por RN-01; la generación del PDF corresponde exclusivamente al personal administrativo en CU-07).
- Confirmación administrativa de la petición (corresponde a CU-06) y expedición del PDF (corresponde a CU-07).
- Verificación o aprobación de registros de horas (corresponde a CU-05 en el Módulo Horas).
- Validación o cambio de estado de la postulación (corresponde a CU-02 en el Módulo Postulación).
- Notificaciones o mensajería al personal administrativo o al estudiante (excluido explícitamente del alcance en `docs/vision.md`).
- Interfaz gráfica de usuario / SPA Frontend (DT-03).
