# Plan: 009 Postularse a la práctica (CU-09)

## Decisiones que aplican
- **ADR-001 (Monolito modular):** Organización en módulos NestJS delimitados (`postulacion`, `compartido/configuracion`, `compartido/auth`, `compartido/auditoria`). Ningún módulo importa entidades ni repositorios de otro; la comunicación se realiza exclusivamente a través de servicios exportados (`ConfiguracionService`).
- **ADR-002 (PostgreSQL institucional con TypeORM):** Persistencia en PostgreSQL para las entidades `Postulacion`, `Estudiante`, `RequisitoPrograma` y `RegistroAuditoria`.
- **ADR-003 (Máquina de estados con aprobación manual):** La postulación creada queda fijada en estado `RECIBIDA`. Se excluye cualquier transición o aprobación automática (RN-01).
- **ADR-004 (SSO + RBAC y acceso institucional):** Autenticación institucional JWT con validación de roles (`ESTUDIANTE`) vía `SsoAuthGuard` y `RolesGuard`. La identidad (documento y programa) se extrae del token validado.
- **ADR-006 (Manejo centralizado de errores con reintento manual):** Manejo global con `HttpExceptionFilter` y errores de dominio (`DominioError`). Retorno de HTTP 422 ante documentos faltantes o corruptos, y HTTP 409 ante postulaciones activas simultáneas.
- **ADR-007 (Requisitos como configuración por programa):** Consulta dinámica de requisitos vigentes en base de datos (`RequisitoPrograma`) mediante `ConfiguracionService`, sin reglas quemadas en código ni necesidad de redespliegue (EAC-02).
- **Vistas arquitectónicas:**
  - *Vista Lógica (`docs/vistas/01-logica.md`):* Entidades `Estudiante`, `Postulacion`, `RequisitoPrograma`, `RegistroAuditoria`.
  - *Vista de Procesos (`docs/vistas/02-procesos.md`):* Petición HTTP POST multipart/form-data a la API REST institucional.
  - *Vista de Desarrollo (`docs/vistas/03-desarrollo.md`):* Arquitectura Controller-Service-Repository directa sin capas intermedias ficticias.
  - *Escenario de calidad EAC-02:* Modificabilidad de requisitos en $\le 2$ días/persona tocando un solo módulo.
  - *Escenario de calidad EAC-03:* 100% accesos bloqueados y registrados en bitácora en $\le 1$ segundo.

## Componentes
- `src/compartido/auth/`:
  - `guards/sso-auth.guard.ts`: Valida el token institucional JWT emitido vía SSO.
  - `guards/roles.guard.ts`: Restringe el acceso asegurando que el actor posea el rol `ESTUDIANTE`.
  - `decorators/roles.decorator.ts`: Decorador `@Roles('ESTUDIANTE')`.
  - `decorators/usuario-actual.decorator.ts`: Decorador para inyectar en el controlador la identidad del estudiante (documento, programa académico).
  - `auth.module.ts`: Configura los guards y servicios de autenticación institucional.
- `src/compartido/auditoria/`:
  - `entities/registro-auditoria.entity.ts`: Modelo TypeORM para la tabla de auditoría (`RegistroAuditoria`).
  - `auditoria.service.ts`: Servicio para persistir eventos de seguridad e intentos de acceso no autorizado en menos de 1 segundo (EAC-03).
  - `auditoria.module.ts`: Exporta `AuditoriaService`.
- `src/compartido/errores/`:
  - `dominio.error.ts`: Error tipado de negocio base.
  - `http-exception.filter.ts`: Filtro global NestJS para unificar errores de negocio y validación HTTP.
- `src/compartido/configuracion/`:
  - `entities/requisito-programa.entity.ts`: Modelo TypeORM para `RequisitoPrograma` (programaAcademico, horasMinimas, documentosRequeridos).
  - `configuracion.service.ts`: Servicio exportado que implementa `obtenerRequisitosVigentes(programaAcademico)`.
  - `configuracion.module.ts`: Exporta `ConfiguracionService`.
- `src/postulacion/`:
  - `entities/estudiante.entity.ts`: Modelo TypeORM para `Estudiante`.
  - `entities/postulacion.entity.ts`: Modelo TypeORM para `Postulacion` (`estado: RECIBIDA`, `documentosAdjuntos`, relación a `Estudiante`).
  - `dto/crear-postulacion.dto.ts`: Validaciones de entrada de documentos adjuntos.
  - `postulacion.controller.ts`: Endpoint `POST /postulaciones`, decorado con `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ESTUDIANTE')`.
  - `postulacion.service.ts`: Orquesta la verificación de postulación activa previa (lanza 409 si existe), consulta los requisitos vigentes con `ConfiguracionService`, valida completitud e integridad de archivos (lanza 422 si falla) y persiste la postulación en estado `RECIBIDA`.
  - `postulacion.module.ts`: Importa `TypeOrmModule.forFeature([Postulacion, Estudiante])`, `ConfiguracionModule` y `AuditoriaModule`; exporta `PostulacionService`.
- `src/app.module.ts`: Módulo raíz que integra la conexión a PostgreSQL con TypeORM y los módulos correspondientes.

## Flujo
Basado estrictamente en el diagrama `docs/diagramas/secuencias/cu09-postularse.puml`:
1. El estudiante autenticado envía solicitud HTTP `POST /postulaciones` con los archivos adjuntos requeridos.
2. `SsoAuthGuard` y `RolesGuard` interceptan la petición:
   - Si no hay credenciales o el rol no es `ESTUDIANTE`, se deniega inmediatamente (HTTP 401/403) y `AuditoriaService.registrarAccesoDenegado()` almacena el intento en `RegistroAuditoria` en $\le 1$ segundo (EAC-03).
3. `PostulacionController` recibe los archivos y los datos del estudiante autenticado provistos por el decorador `@UsuarioActual()`.
4. `PostulacionController` llama a `PostulacionService.crearPostulacion(datosEstudiante, archivos)`.
5. `PostulacionService` verifica si el estudiante ya tiene una postulación en curso (`RECIBIDA` o `EN_REVISION`):
   - Si existe, interrumpe el flujo y lanza `DominioError` resultando en HTTP 409 Conflict.
6. `PostulacionService` solicita los requisitos a través de `ConfiguracionService.obtenerRequisitosVigentes(datosEstudiante.programaAcademico)`.
7. `ConfiguracionService` consulta la entidad `RequisitoPrograma` en PostgreSQL y retorna los documentos requeridos vigentes.
8. `PostulacionService` compara los archivos recibidos contra los requisitos obligatorios y valida su integridad:
   - Si falta algún documento o algún archivo está corrupto/ilegible, lanza `DominioError` resultando en HTTP 422 Unprocessable Entity (ADR-006).
9. Si los documentos están completos y son válidos:
   - `PostulacionService` crea y persiste la nueva `Postulacion` con estado explícito `RECIBIDA` y los documentos asociados en PostgreSQL mediante su repositorio TypeORM.
   - Retorna código HTTP 201 Created con el resumen de radicación de la postulación.
10. La postulación permanece en estado `RECIBIDA` a la espera de validación manual administrativa en CU-02 (ADR-003, RN-01).

## Fuera de alcance
- Revisión y transición a estados `EN_REVISION`, `VALIDADA` o `RECHAZADA` (pertenece a CU-02).
- Asignación de tutor académico o supervisor empresarial (pertenece a CU-03).
- Carga y verificación de horas de práctica (pertenece a CU-12 y CU-05).
- Generación del acta final en PDF (pertenece a CU-07).
- Interfaz gráfica de usuario SPA / Frontend (se consumirá la API REST desacoplada según DT-03).
- Notificaciones automáticas por correo electrónico o mensajería (descartadas en `vision.md`).
