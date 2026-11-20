# Plan: 012 Ingresar horas de práctica de los estudiantes (CU-12)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** El registro de horas reside en el módulo de negocio `horas` (`HorasController` y `HorasService`), mientras que el mecanismo de autenticación y consumo del enlace temporal de un solo uso reside en el módulo transversal `compartido/auth` (`EnlaceAcceso`, `EnlaceAccesoService`, `SupervisorTokenGuard`). Se respeta estrictamente la regla de modularidad: `HorasModule` **no** importa ni inyecta el `Repository<EnlaceAcceso>` ni ningún repositorio de otro módulo; la marcación del enlace como usado se realiza exclusivamente invocando el servicio exportado `EnlaceAccesoService` de `AuthModule`.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia relacional en PostgreSQL de las entidades `RegistroHoras` (tabla `registro_horas`), `EnlaceAcceso` (tabla `enlace_acceso_supervisor`) y `RegistroAuditoria` (tabla `registro_auditoria`).
- **RN-01 (Exclusión de automatizaciones en flujos de trabajo):** Todo nuevo `RegistroHoras` se crea explícitamente en estado `REGISTRADA` (`EstadoHoras.REGISTRADA`). No existe verificación automática de horas; su paso a `VERIFICADA` requiere la acción humana explícita del personal administrativo en CU-05.
- **ADR-004 y RN-02 (Acceso de un solo uso para actores externos sin cuenta institucional):** Los supervisores empresariales no tienen cuenta en el ERP institucional; interactúan mediante un token temporal (`EnlaceAcceso`) enviado en el encabezado HTTP `enlace-token`. `SupervisorTokenGuard` valida que el token exista, no haya sido usado (`usado === false`) y no esté vencido (`expiraEn > ahora`), adjuntando el contexto del enlace autorizado (`estudianteId`, `supervisorId`, `token`) a la petición. Una vez validado el DTO y persistido el registro de horas, `EnlaceAccesoService.consumirEnlace(token)` marca el enlace como `usado = true` para impedir su reutilización; si la validación de los datos de entrada (`fecha`, `horas`) falla, el enlace no se consume.
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter`, `ValidationPipe` y `DominioError` para devolver respuestas estandarizadas:
  - HTTP 401 (`UnauthorizedException('enlace inválido, usado o vencido')`) cuando falta el encabezado `enlace-token` o el enlace no existe, ya fue usado o expiró.
  - HTTP 400 (`BadRequestException` vía `ValidationPipe` o error de validación) cuando `horas <= 0` o `fecha` no tiene un formato ISO válido.
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades del glosario `RegistroHoras` (`fecha`, `horas`, `descripcion`, `estado`), `EstadoHoras` (`REGISTRADA`, `VERIFICADA`), `EnlaceAcceso` (`token`, `expiraEn`, `usado`, `estudianteId`, `supervisorId`) y `RegistroAuditoria` (`evento`, `actorId`, `resultado`, `detalles`, `fecha`).
  - *Vista de Procesos (`docs/vistas/02-procesos.md`) y Escenario +1 (`docs/diagramas/secuencias/cu12-ingresar-horas.puml`):* Petición `POST /horas` con encabezado `enlace-token` validada por `SupervisorTokenGuard` y procesada por `Módulo Horas` contra PostgreSQL.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Estructura directa `Controller -> Service -> Repository` dentro de cada módulo, donde `Módulo Horas` depende únicamente de `Compartido/Auth` y `PostgreSQL`.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de las solicitudes con enlace inexistente, usado, vencido o ausente son bloqueadas con HTTP 401 y registradas en `RegistroAuditoria` mediante `AuditoriaService.registrarAccesoDenegado()` en menos de 1 segundo.

## Componentes
- `src/compartido/auth/`:
  - `entities/enlace-acceso.entity.ts`: Entidad TypeORM `EnlaceAcceso` mapeada a la tabla `enlace_acceso_supervisor` (`id`, `token`, `estudianteId`, `supervisorId`, `expiraEn`, `usado`, `creadoEn`).
  - `enlace-acceso.service.ts`: Servicio exportado `EnlaceAccesoService` que encapsula el acceso a `Repository<EnlaceAcceso>` (`validarEnlace(token)` y `consumirEnlace(token)`).
  - `guards/supervisor-token.guard.ts`: Guard `SupervisorTokenGuard` que lee el encabezado `enlace-token`, verifica el enlace con `EnlaceAccesoService`, adjunta el contexto del supervisor (`estudianteId`, `supervisorId`, `token`) al request y, si es inválido/usado/vencido/ausente, invoca a `AuditoriaService.registrarAccesoDenegado()` y lanza `UnauthorizedException('enlace inválido, usado o vencido')` (EAC-03).
  - `decorators/enlace-actual.decorator.ts`: Decorador de parámetro `@EnlaceActual()` para inyectar en el controlador los datos del enlace validado por `SupervisorTokenGuard` (`token`, `estudianteId`, `supervisorId`).
  - `auth.module.ts`: Registra `TypeOrmModule.forFeature([EnlaceAcceso])`, provee y exporta `EnlaceAccesoService` y `SupervisorTokenGuard`.
- `src/horas/`:
  - `enums/estado-horas.enum.ts`: Enumeración `EstadoHoras` con los valores del glosario (`REGISTRADA = 'REGISTRADA'`, `VERIFICADA = 'VERIFICADA'`).
  - `entities/registro-horas.entity.ts`: Entidad TypeORM `RegistroHoras` mapeada a la tabla `registro_horas` (`id`, `estudianteId`, `supervisorId`, `fecha`, `horas`, `descripcion` opcional, `estado` con valor por defecto `EstadoHoras.REGISTRADA`, `creadoEn`).
  - `dto/registrar-horas.dto.ts`: DTO de entrada `RegistrarHorasDto` con validaciones `class-validator` (`@IsDateString()` para `fecha`, `@IsNumber()` y `@Min(1)` / `@IsPositive()` para `horas`, `@IsOptional()` y `@IsString()` para `descripcion`).
  - `horas.service.ts`: Servicio `HorasService` que inyecta `@InjectRepository(RegistroHoras)` y el servicio exportado `EnlaceAccesoService` (cumpliendo ADR-001). Implementa `registrarHoras(estudianteId, supervisorId, token, dto)` que valida los datos, crea el `RegistroHoras` en estado `EstadoHoras.REGISTRADA`, marca el enlace como usado vía `enlaceAccesoService.consumirEnlace(token)` y retorna el registro creado.
  - `horas.controller.ts`: Controlador `HorasController` con el endpoint `POST /horas` protegido con `@UseGuards(SupervisorTokenGuard)` y código de respuesta HTTP 201.
  - `horas.module.ts`: Módulo `HorasModule` que importa `TypeOrmModule.forFeature([RegistroHoras])` y `AuthModule`, y exporta `HorasService`.
- `src/app.module.ts`:
  - Registra las entidades `EnlaceAcceso` y `RegistroHoras` e importa `HorasModule`.

## Flujo
Basado en el diagrama de secuencia `docs/diagramas/secuencias/cu12-ingresar-horas.puml`:
1. El supervisor empresarial abre su enlace temporal y envía una solicitud `POST /horas` con el encabezado `enlace-token: <token>` y el cuerpo JSON `{ "fecha": "2026-04-15", "horas": 8, "descripcion"?: "..." }`.
2. `SupervisorTokenGuard` intercepta la solicitud y extrae el encabezado `enlace-token`:
   - Si el encabezado no está presente, registra el intento rechazado en `RegistroAuditoria` (`AuditoriaService.registrarAccesoDenegado`) en $\le 1$ segundo y lanza HTTP 401 `UnauthorizedException('enlace inválido, usado o vencido')` (EAC-03).
   - Consulta el enlace mediante `EnlaceAccesoService.validarEnlace(token)` (`SELECT enlace_acceso_supervisor WHERE token`).
   - Si el enlace no existe, ya tiene `usado = true` o `expiraEn <= ahora`, registra el intento rechazado en `RegistroAuditoria` en $\le 1$ segundo y responde con HTTP 401 `"enlace inválido, usado o vencido"` (EAC-03).
   - Si el enlace es válido, no usado y no vencido, adjunta `{ token, estudianteId, supervisorId }` a la petición HTTP y autoriza el paso al controlador.
3. `ValidationPipe` valida el cuerpo de la petición contra `RegistrarHorasDto`:
   - Si `horas <= 0` o `fecha` no es una fecha ISO válida, rechaza la solicitud con HTTP 400 Bad Request antes de invocar al servicio, por lo que no se inserta ningún `RegistroHoras` ni se consume el `EnlaceAcceso`.
4. `HorasController.registrarHoras(dto, enlace)` invoca a `HorasService.registrarHoras(enlace.estudianteId, enlace.supervisorId, enlace.token, dto)`.
5. `HorasService` crea y persiste en PostgreSQL una nueva instancia de `RegistroHoras` con `estudianteId`, `supervisorId`, `fecha`, `horas`, `descripcion` (`null` si no se envió) y `estado = EstadoHoras.REGISTRADA` (RN-01).
6. `HorasService` invoca `enlaceAccesoService.consumirEnlace(token)` para actualizar `usado = true` en el `EnlaceAcceso` utilizado (ADR-004).
7. El controlador retorna el registro creado con código HTTP 201 Created.

## Fuera de alcance
- Generación o envío por correo de enlaces de acceso para supervisores (la mensajería está excluida del alcance en `docs/vision.md`).
- Consulta y verificación administrativa de las horas registradas para pasarlas de `REGISTRADA` a `VERIFICADA` (pertenece a CU-05 / `specs/005-verificar-horas/`).
- Evaluación del desempeño del estudiante por parte del supervisor (pertenece a CU-13 / `specs/013-evaluar-desempeno/`).
- Consolidación de horas verificadas para la generación del acta final en PDF (pertenece a CU-07 / `specs/007-generar-acta/`).
- Verificación automática de horas sin revisión administrativa (prohibida por RN-01).
- Interfaz gráfica web SPA / Frontend (DT-03).
