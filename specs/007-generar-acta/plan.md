# Plan: 007 Generar el acta final de la práctica en PDF (CU-07)

## Decisiones que aplican

- **ADR-001 (Monolito modular por módulos de negocio):** La lógica de expedición de actas reside en el módulo `actas` (`ActasController` y `ActasService`). El módulo `actas` no importa ni inyecta repositorios de otros módulos (`Repository<Postulacion>`, `Repository<RegistroHoras>`, etc.). Toda interacción se realiza exclusivamente a través de los servicios exportados:
  - `PostulacionService` (para verificar si la postulación está en estado `VALIDADA` y consultar el programa académico del estudiante).
  - `HorasService` (para consolidar y sumar las horas en estado `VERIFICADA`).
  - `ConfiguracionService` (para obtener las horas mínimas requeridas según el programa académico).
  - `AuditoriaService` (para registrar la trazabilidad de accesos denegados y generación de actas).
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia relacional de la entidad `Acta` en PostgreSQL sobre servidores on-premise institucionales (RT-01), gestionando transaccionalmente el registro en estado `GENERADA` o `FALLIDA`.
- **ADR-003 (Máquina de estados de postulación):** Precondición estricta: solo se puede expedir el acta final si la postulación del estudiante se encuentra en estado `VALIDADA`. Si está en `RECIBIDA`, `EN_REVISION`, `RECHAZADA` o no existe, la solicitud se rechaza con HTTP 409 Conflict y el mensaje "la postulación aún no está validada".
- **ADR-004 (SSO + RBAC y acceso institucional):** Protección del endpoint `POST /actas` mediante `SsoAuthGuard` y `RolesGuard`, exigiendo rol `ADMINISTRATIVO` y extrayendo el documento del funcionario mediante `@UsuarioActual()`. Todo acceso no autenticado o con rol indebido (`ESTUDIANTE` o supervisor externo) es bloqueado con HTTP 401/403 y auditado en $\le 1$ segundo (EAC-03).
- **ADR-005 (Generación síncrona del acta PDF en memoria con consolidación transaccional):** Al confirmar la finalización, `ActasService` consolida las horas validadas en una sola transacción, genera el documento PDF en memoria usando `PDFKit` embebido en el servidor de aplicación, guarda el archivo en el almacenamiento institucional local on-premise y persiste el registro en PostgreSQL. No se emplean colas ni workers asíncronos (coherente con la ausencia de mensajería en la Visión).
- **ADR-006 (Manejo centralizado de errores con reintento manual):** Uso de `HttpExceptionFilter` global y subclases de `DominioError`. Si la renderización o guardado del archivo PDF falla, el acta se registra en la base de datos con estado `FALLIDA` y `detalleError`, retornando HTTP 500 Internal Server Error con el mensaje "no se pudo generar el acta, reintentar manualmente", sin reintentos automáticos (RN-01).
- **ADR-007 (Configuración de requisitos y horas mínimas por programa académico):** Las horas mínimas exigidas se consultan dinámicamente desde `RequisitoPrograma` mediante `ConfiguracionService`, sin quemar valores en el código. Si las horas verificadas no alcanzan dicho mínimo, se rechaza con HTTP 409 Conflict.
- **RN-01 (Exclusión de automatizaciones):** El flujo de generación del acta se activa única y exclusivamente tras la confirmación y solicitud manual directa del personal administrativo.
- **RT-01 (Infraestructura institucional):** Generación y almacenamiento local en servidor y disco on-premise, sin dependencias de SaaS externos para generación o firma de documentos.
- **EAC-01 (Eficiencia de desempeño):** Procesamiento síncrono capaz de generar y responder con el acta en menos de 5 segundos en el 95% de las solicitudes con hasta 30 peticiones simultáneas durante el cierre de semestre.
- **PA-04 (Registro y trazabilidad):** Registro en `RegistroAuditoria` del 100% de los intentos denegados y de los eventos de expedición exitosa o fallida del acta.

## Componentes

- `src/compartido/errores/`:
  - `dominio.error.ts`: Incorporar subclases de error:
    - `PostulacionNoValidadaError` (HTTP 409 Conflict): `"la postulación aún no está validada"`.
    - `HorasInsuficientesError` (HTTP 409 Conflict): `"El estudiante no cumple con las horas mínimas requeridas por su programa académico"`.
    - `ActaYaExisteError` (HTTP 409 Conflict): `"Ya existe un acta oficial generada para este estudiante"`.
    - `FalloGeneracionActaError` (HTTP 500 Internal Server Error): `"no se pudo generar el acta, reintentar manualmente"`.
  - `http-exception.filter.ts`: Filtro global existente para mapear errores de dominio a respuestas HTTP JSON.
- `src/compartido/auth/`:
  - `guards/sso-auth.guard.ts` y `guards/roles.guard.ts`: Autenticación institucional JWT y autorización estricta para rol `ADMINISTRATIVO`.
  - `decorators/roles.decorator.ts` y `decorators/usuario-actual.decorator.ts`: `@Roles('ADMINISTRATIVO')` y `@UsuarioActual()`.
- `src/compartido/auditoria/`:
  - `auditoria.service.ts`: `AuditoriaService.registrarEvento` para registrar la generación exitosa/fallida del acta y `AuditoriaService.registrarAccesoDenegado` para accesos bloqueados.
- `src/compartido/configuracion/`:
  - `configuracion.service.ts`: `ConfiguracionService.obtenerRequisitosVigentes(programaAcademico)` para consultar `horasMinimas`.
- `src/postulacion/`:
  - `postulacion.service.ts`: Métodos exportados para que Actas verifique el estado y programa:
    - `estaValidada(estudianteId: string): Promise<boolean>`
    - `obtenerPorEstudiante(documento: string): Promise<Postulacion | null>`
- `src/horas/`:
  - `horas.service.ts`: Método exportado para consultar la consolidación de horas:
    - `totalHorasValidadas(estudianteId: string): Promise<number>` (suma de `horas` de los registros en estado `VERIFICADA`).
- `src/actas/`:
  - `enums/estado-acta.enum.ts`: Enumeración `EstadoActa` (`GENERADA`, `FALLIDA`).
  - `entities/acta.entity.ts`: Entidad TypeORM `Acta` con campos:
    - `id`: UUID clave primaria.
    - `estudianteId`: varchar(100), documento del estudiante.
    - `totalHoras`: int, total de horas consolidadas en el acta.
    - `rutaPdf`: varchar(500), nullable: true, ruta en el almacenamiento local on-premise.
    - `estado`: enum `EstadoActa` (`GENERADA` o `FALLIDA`).
    - `detalleError`: text, nullable: true.
    - `creadoEn`: timestamp de creación.
  - `dto/generar-acta.dto.ts`: DTO con `@IsNotEmpty()` y `@IsString()` para `estudianteId`.
  - `actas.service.ts`: Lógica del caso de uso CU-07:
    - Inyecta `Repository<Acta>`, `PostulacionService`, `HorasService`, `ConfiguracionService`, `AuditoriaService` y `DataSource`.
    - Verifica si ya existe un acta en estado `GENERADA` para el estudiante (si existe, lanza `ActaYaExisteError`).
    - Valida que la postulación esté en estado `VALIDADA` mediante `PostulacionService` (si no, lanza `PostulacionNoValidadaError`).
    - Obtiene los requisitos del programa del estudiante mediante `ConfiguracionService` y total de horas verificadas mediante `HorasService.totalHorasValidadas()`.
    - Valida que las horas verificadas cumplan con el mínimo (si no, lanza `HorasInsuficientesError`).
    - Genera el PDF en memoria utilizando `PDFKit`, lo escribe en disco local institucional (`uploads/actas/acta_<estudianteId>_<timestamp>.pdf`) y persiste la entidad `Acta` en estado `GENERADA`.
    - Si ocurre un fallo en la generación o guardado del archivo, persiste en base de datos el `Acta` en estado `FALLIDA` con `detalleError` y lanza `FalloGeneracionActaError` (HTTP 500).
    - Registra el evento en `AuditoriaService`.
  - `actas.controller.ts`: Endpoint `POST /actas` con `@Roles('ADMINISTRATIVO')` y `@UseGuards(SsoAuthGuard, RolesGuard)`.
  - `actas.module.ts`: Exporta `ActasService`, declara `ActasController`, e importa `TypeOrmModule.forFeature([Acta])`, `PostulacionModule`, `HorasModule`, `ConfiguracionModule`, `AuditoriaModule`, `AuthModule`.
- `src/app.module.ts`:
  - Importar `ActasModule` e incluir la entidad `Acta` en la configuración de `TypeOrmModule`.

## Flujo

Basado en el diagrama de secuencia arquitectónico `docs/diagramas/secuencias/cu07-generar-acta.puml` (ESC-06):

1. Un funcionario administrativo autenticado envía una petición HTTP `POST /actas` con el cuerpo `{ "estudianteId": "1053800000" }` y su token JWT institucional en el encabezado `Authorization`.
2. `SsoAuthGuard` y `RolesGuard` interceptan la petición:
   - Si no está autenticado o el rol no es `ADMINISTRATIVO`, bloquean la solicitud con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` registra el intento en `RegistroAuditoria` en menos de 1 segundo (EAC-03).
3. `ValidationPipe` valida el cuerpo contra `GenerarActaDto`:
   - Si `estudianteId` está vacío o no es cadena, responde con HTTP 400 Bad Request.
4. `ActasController.generarActa()` invoca a `ActasService.generarActa(dto.estudianteId, usuario.documento)`.
5. `ActasService` consulta si ya existe un acta previa para ese estudiante:
   - Si existe un registro con `estado = GENERADA`, lanza `ActaYaExisteError` (HTTP 409 Conflict: "Ya existe un acta oficial generada para este estudiante").
6. `ActasService` invoca `postulacionService.obtenerPorEstudiante(estudianteId)`:
   - Si no existe postulación o su estado no es `VALIDADA`, lanza `PostulacionNoValidadaError` (HTTP 409 Conflict: "la postulación aún no está validada").
7. `ActasService` obtiene las horas mínimas requeridas invocando `configuracionService.obtenerRequisitosVigentes(postulacion.estudiante.programaAcademico)`.
8. `ActasService` consulta las horas verificadas acumuladas invocando `horasService.totalHorasValidadas(estudianteId)`:
   - Si `totalHoras` es menor a `horasMinimas`, lanza `HorasInsuficientesError` (HTTP 409 Conflict: "El estudiante no cumple con las horas mínimas requeridas por su programa académico").
9. `ActasService` procede a la generación síncrona en memoria del PDF:
   - Renderiza el documento PDF con `PDFKit` incluyendo la información del estudiante, programa académico, total de horas acreditadas y fecha de expedición.
   - Guarda el archivo PDF en el almacenamiento local on-premise institucional (`uploads/actas/`).
10. Si la generación y guardado del archivo PDF es exitosa:
    - Inserta en PostgreSQL el registro `Acta` con `estado = GENERADA`, `totalHoras = totalHoras`, `rutaPdf = <ruta_guardada>` dentro de la transacción.
    - Registra el evento exitoso en `AuditoriaService` (PA-04).
    - Retorna el acta creada con código HTTP 201 Created.
11. Si ocurre una excepción o fallo técnico durante la generación o almacenamiento del PDF:
    - Inserta en PostgreSQL el registro `Acta` con `estado = FALLIDA` y `detalleError = error.message` (ADR-005, ADR-006).
    - Registra el fallo en `AuditoriaService` (PA-04).
    - Lanza `FalloGeneracionActaError` que el filtro global traduce en HTTP 500 Internal Server Error ("no se pudo generar el acta, reintentar manualmente").
    - No se realiza ningún reintento automático (RN-01).

## Fuera de alcance

- Encolamiento asíncrono o procesamiento background en colas como RabbitMQ o BullMQ (descartado por ADR-005).
- Integración con servicios SaaS externos de generación de PDF o almacenamiento en la nube pública (descartado por RT-01).
- Plataformas externas de firma digital criptográfica o de certificación externa (el acta se genera localmente en PDF según Contexto de arquitectura).
- Envío de notificaciones por correo electrónico, SMS o mensajería interna (excluido expresamente del alcance en `docs/vision.md`).
- Aprobación o verificación manual de registros de horas (corresponde a CU-05 / Módulo Horas).
- Modificación del estado de las postulaciones (corresponde a CU-02 / Módulo Postulación).
- Interfaz gráfica web SPA / Frontend (DT-03).
