# Plan: 013 Evaluar el desempeño del estudiante en práctica (CU-13)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** El registro de la evaluación reside en el módulo de negocio `evaluacion` (`EvaluacionController` y `EvaluacionService`), mientras que la autenticación y el consumo del enlace temporal de un solo uso se delegan al módulo transversal `compartido/auth` (`SupervisorTokenGuard` y `EnlaceAccesoService`). Se cumple estrictamente la regla de modularidad: `EvaluacionModule` **no** importa ni inyecta el `Repository<EnlaceAcceso>` ni ningún repositorio de otro módulo; la marcación del enlace como usado (`usado = true`) se ejecuta exclusivamente invocando el servicio exportado `EnlaceAccesoService.consumirEnlace(token)`.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia relacional en PostgreSQL de la entidad `Evaluacion` (tabla `evaluacion`), además de `EnlaceAcceso` (`enlace_acceso_supervisor`) y `RegistroAuditoria` (`registro_auditoria`).
- **ADR-004 y RN-02 (Acceso de un solo uso para actores externos sin cuenta institucional):** Los supervisores empresariales interactúan sin cuenta en el ERP institucional mediante un token temporal (`EnlaceAcceso`) enviado en el encabezado HTTP `enlace-token`. `SupervisorTokenGuard` verifica que el token exista, no haya sido usado y no esté vencido, adjuntando `{ token, estudianteId, supervisorId }` a la solicitud. Tras verificar que el estudiante aún no cuenta con una evaluación registrada y persistir la nueva `Evaluacion`, `EnlaceAccesoService.consumirEnlace(token)` marca el enlace como `usado = true`; si la solicitud falla por validación (HTTP 400) o por evaluación duplicada (HTTP 409), el enlace no se consume.
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter`, `ValidationPipe` y `DominioError`:
  - HTTP 401 (`UnauthorizedException('enlace inválido, usado o vencido')`) cuando el encabezado `enlace-token` falta o el enlace no existe, ya fue usado o expiró.
  - HTTP 400 (`BadRequestException` vía `ValidationPipe` o validación en servicio) cuando `calificacion` no es un número entre `0.0` y `5.0`.
  - HTTP 409 (`EvaluacionYaRegistradaError`) cuando el estudiante ya tiene una evaluación registrada (`Estudiante "1" -- "0..1" Evaluacion` según la Vista Lógica).
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md` y `docs/diagramas/01-logica.puml`):* Entidad del glosario `Evaluacion` (`id`, `estudianteId`, `supervisorId`, `calificacion`, `comentarios`, `creadaEn`) con multiplicidad `0..1` respecto a `Estudiante`.
  - *Vista de Procesos (`docs/vistas/02-procesos.md`) y Escenario +1 (`docs/diagramas/secuencias/cu13-evaluar-desempeno.puml`):* Petición `POST /evaluaciones` con encabezado `enlace-token` validada por `SupervisorTokenGuard` y procesada por `Módulo Evaluación` contra PostgreSQL.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller -> Service -> Repository` dentro del `Módulo Evaluación`, dependiendo únicamente de `Compartido/Auth` y `PostgreSQL`.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de las solicitudes con enlace inexistente, usado, vencido o ausente son bloqueadas con HTTP 401 y registradas en `RegistroAuditoria` en menos de 1 segundo.

## Componentes
- `src/compartido/errores/`:
  - `dominio.error.ts`: Se agrega la subclase `EvaluacionYaRegistradaError` (HTTP 409 Conflict).
- `src/evaluacion/`:
  - `entities/evaluacion.entity.ts`: Entidad TypeORM `Evaluacion` mapeada a la tabla `evaluacion` (`id`, `estudianteId` único, `supervisorId`, `calificacion` decimal/float, `comentarios` opcionales, `creadaEn`).
  - `dto/registrar-evaluacion.dto.ts`: DTO de entrada `RegistrarEvaluacionDto` con validaciones `class-validator` (`@IsNumber()`, `@Min(0)` y `@Max(5)` para `calificacion`; `@IsOptional()` y `@IsString()` para `comentarios`).
  - `evaluacion.service.ts`: Servicio `EvaluacionService` que inyecta `@InjectRepository(Evaluacion)` y el servicio exportado `EnlaceAccesoService` (ADR-001). Implementa `registrarEvaluacion(estudianteId, supervisorId, token, dto)` que valida el rango `0.0..5.0`, verifica que no exista evaluación previa para `estudianteId` (lanzando `EvaluacionYaRegistradaError` 409 si ya existe), persiste la `Evaluacion` y consume el enlace vía `enlaceAccesoService.consumirEnlace(token)`.
  - `evaluacion.controller.ts`: Controlador `EvaluacionController` con el endpoint `POST /evaluaciones` protegido con `@UseGuards(SupervisorTokenGuard)` y código HTTP 201 Created.
  - `evaluacion.module.ts`: Módulo `EvaluacionModule` que importa `TypeOrmModule.forFeature([Evaluacion])` y `AuthModule`, y exporta `EvaluacionService`.
- `src/app.module.ts`:
  - Registra la entidad `Evaluacion` e importa `EvaluacionModule`.

## Flujo
Basado en el diagrama de secuencia `docs/diagramas/secuencias/cu13-evaluar-desempeno.puml`:
1. El supervisor empresarial abre su enlace temporal y envía una solicitud `POST /evaluaciones` con el encabezado `enlace-token: <token>` y el cuerpo JSON `{ "calificacion": 4.5, "comentarios"?: "..." }`.
2. `SupervisorTokenGuard` intercepta la solicitud y verifica el encabezado `enlace-token` mediante `EnlaceAccesoService.validarEnlace(token)`:
   - Si el encabezado falta o el enlace es inexistente, ya fue usado o expiró, bloquea la solicitud con HTTP 401 `"enlace inválido, usado o vencido"` y registra el intento rechazado en `RegistroAuditoria` en $\le 1$ segundo (EAC-03, PA-04).
   - Si el enlace es válido, adjunta `{ token, estudianteId, supervisorId }` al request y autoriza el acceso.
3. `ValidationPipe` valida el cuerpo de la petición contra `RegistrarEvaluacionDto`:
   - Si `calificacion` es menor a `0.0`, mayor a `5.0` o no es numérica, responde con HTTP 400 Bad Request sin crear evaluación ni consumir el enlace.
4. `EvaluacionController.registrarEvaluacion(enlace, dto)` invoca a `EvaluacionService.registrarEvaluacion(enlace.estudianteId, enlace.supervisorId, enlace.token, dto)`.
5. `EvaluacionService` verifica en PostgreSQL si ya existe una `Evaluacion` para `estudianteId`:
   - Si ya existe, lanza `EvaluacionYaRegistradaError` (HTTP 409 Conflict) sin modificar la evaluación previa ni consumir el enlace.
6. `EvaluacionService` crea y persiste en PostgreSQL la nueva entidad `Evaluacion` con `estudianteId`, `supervisorId`, `calificacion` y `comentarios` (`null` si no se enviaron).
7. `EvaluacionService` invoca `enlaceAccesoService.consumirEnlace(token)` para marcar `usado = true` en el `EnlaceAcceso` utilizado (ADR-004).
8. El controlador retorna la evaluación creada con código HTTP 201 Created.

## Fuera de alcance
- Ingreso periódico de horas de práctica por parte del supervisor (implementado en CU-12 / `specs/012-ingresar-horas/`).
- Verificación administrativa de horas (implementado en CU-05 / `specs/005-verificar-horas/`).
- Generación del acta final en PDF (pertenece a CU-07 / `specs/007-generar-acta/`).
- Envío de enlaces por correo electrónico o mensajería interna (excluido del alcance en `docs/vision.md`).
- Interfaz gráfica web SPA / Frontend (DT-03).
