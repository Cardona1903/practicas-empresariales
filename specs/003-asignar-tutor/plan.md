# Plan: 003 Asignar tutor al estudiante (CU-03)

## Decisiones que aplican
- **ADR-001 (Monolito modular por módulos de negocio):** La asignación y actualización de la relación estudiante-supervisor reside en el módulo de negocio `asignacion-tutor` (`AsignacionTutorController` y `AsignacionTutorService`), tal como lo definen `AGENTS.md`, `PA-01` y la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`). `AsignacionTutorModule` gestiona sus propias entidades `Supervisor` y `AsignacionTutor`, y consume exclusivamente `AuthModule` / `AuditoriaService` exportados, sin importar ni inyectar repositorios de ningún otro módulo.
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia relacional en PostgreSQL de las entidades `Supervisor` (tabla `supervisor`) y `AsignacionTutor` (tabla `asignacion_tutor`).
- **ADR-004 (SSO + RBAC para actores institucionales):** El endpoint `POST /asignaciones-tutor` está protegido mediante `SsoAuthGuard` y `RolesGuard`, exigiendo el rol `ADMINISTRATIVO` y extrayendo el documento del administrativo desde el JWT institucional (`@UsuarioActual()`).
- **ADR-006 (Manejo centralizado de errores):** Uso del filtro global `HttpExceptionFilter` y `ValidationPipe` para rechazar con HTTP 400 Bad Request cualquier solicitud con formato de correo inválido o sin `estudianteId`.
- **Vistas arquitectónicas y atributos de calidad:**
  - *Vista Lógica (`docs/vistas/01-logica.md` y `docs/diagramas/01-logica.puml`):* Entidades del glosario `Supervisor` (`id`, `correo`, `nombre` opcional) y `AsignacionTutor` (`id`, `estudianteId` único, `supervisor`, `asignadaEn`), modelando la relación `Estudiante "1" -- "0..1" AsignacionTutor` y `AsignacionTutor "0..1" -- "1" Supervisor`.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md` y `docs/diagramas/03-desarrollo.puml`):* `Módulo AsignaciónTutor` con estructura directa `Controller -> Service -> Repository`, dependiendo únicamente de `Compartido/Auth` y `PostgreSQL`.
  - *Escenario de calidad EAC-03 (Seguridad) y Preocupación PA-04 (Trazabilidad):* El 100% de las solicitudes sin autenticación SSO o con rol distinto a `ADMINISTRATIVO` son bloqueadas con HTTP 401/403 y registradas en `RegistroAuditoria` en menos de 1 segundo; cada asignación o actualización de tutor queda registrada en `RegistroAuditoria`.

## Componentes
- `src/asignacion-tutor/`:
  - `entities/supervisor.entity.ts`: Entidad TypeORM `Supervisor` mapeada a la tabla `supervisor` (`id`, `correo` único, `nombre` opcional, `creadoEn`).
  - `entities/asignacion-tutor.entity.ts`: Entidad TypeORM `AsignacionTutor` mapeada a la tabla `asignacion_tutor` (`id`, `estudianteId` único, relación `@ManyToOne(() => Supervisor, { eager: true }) supervisor`, `asignadaEn`).
  - `dto/asignar-tutor.dto.ts`: DTO de entrada `AsignarTutorDto` con validaciones `class-validator` (`@IsString() @IsNotEmpty()` para `estudianteId`, `@IsEmail()` para `correoSupervisor`, `@IsOptional() @IsString()` para `nombreSupervisor`).
  - `asignacion-tutor.service.ts`: Servicio `AsignacionTutorService` que inyecta `@InjectRepository(Supervisor)`, `@InjectRepository(AsignacionTutor)` y `AuditoriaService`. Implementa `asignarTutor(dto: AsignarTutorDto, actorId: string): Promise<AsignacionTutor>` que busca o crea el `Supervisor` por `correo`, crea o actualiza la `AsignacionTutor` asociada a `estudianteId`, actualiza `asignadaEn` y registra el evento `ASIGNACION_TUTOR` en `RegistroAuditoria` (PA-04).
  - `asignacion-tutor.controller.ts`: Controlador `AsignacionTutorController` con el endpoint `POST /asignaciones-tutor` protegido con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')`, respondiendo HTTP 201 Created.
  - `asignacion-tutor.module.ts`: Módulo `AsignacionTutorModule` que importa `TypeOrmModule.forFeature([Supervisor, AsignacionTutor])`, `AuthModule` y `AuditoriaModule`, y exporta `AsignacionTutorService`.
- `src/app.module.ts`:
  - Registra las entidades `Supervisor` y `AsignacionTutor` e importa `AsignacionTutorModule`.

## Flujo
1. El personal administrativo autenticado envía una petición `POST /asignaciones-tutor` con su token JWT institucional y el cuerpo JSON `{ "estudianteId": "1053800000", "correoSupervisor": "supervisor@empresa.com", "nombreSupervisor"?: "Carlos Gómez" }`.
2. `SsoAuthGuard` y `RolesGuard` interceptan la solicitud:
   - Si el usuario no está autenticado o su rol no es `ADMINISTRATIVO`, se bloquea con HTTP 401 o 403 y `AuditoriaService.registrarAccesoDenegado()` persiste el intento en `RegistroAuditoria` en $\le 1$ segundo (EAC-03).
3. `ValidationPipe` valida el cuerpo contra `AsignarTutorDto`:
   - Si `estudianteId` está vacío o `correoSupervisor` no tiene un formato de correo válido, rechaza la solicitud con HTTP 400 Bad Request sin tocar la base de datos.
4. `AsignacionTutorController.asignarTutor(dto, usuario)` invoca a `AsignacionTutorService.asignarTutor(dto, usuario.documento)`.
5. `AsignacionTutorService` busca en `Repository<Supervisor>` si ya existe un supervisor con `correo = dto.correoSupervisor`:
   - Si no existe, lo crea; si existe y se envió `nombreSupervisor`, actualiza su nombre.
6. `AsignacionTutorService` busca en `Repository<AsignacionTutor>` si el estudiante `dto.estudianteId` ya tiene una asignación previa:
   - Si no existe, crea una nueva instancia de `AsignacionTutor` asociando `estudianteId` y `supervisor`.
   - Si ya existe, actualiza su relación `supervisor` con el nuevo supervisor y actualiza la fecha `asignadaEn`.
7. `AsignacionTutorService` registra el evento `ASIGNACION_TUTOR` en `RegistroAuditoria` mediante `AuditoriaService.registrarEvento()` con el documento del administrativo (`actorId`) (PA-04).
8. El controlador retorna la asignación registrada con código HTTP 201 Created.

## Fuera de alcance
- Revisión y validación de la postulación (implementado en CU-02 / `specs/002-revisar-postulacion/`).
- Ingreso de horas y evaluación de desempeño por parte del supervisor mediante enlace temporal (implementados en CU-12 y CU-13).
- Envío de notificaciones por correo electrónico al supervisor o al estudiante (excluido del alcance en `docs/vision.md`).
- Interfaz gráfica web SPA / Frontend (DT-03).
