# AGENTS.md: Sistema de Gestión de Prácticas Empresariales

Reglas permanentes del proyecto. Se le entregan al agente al inicio de cada sesión junto con `docs/arquitectura.md`. Es corto: enlaza a `docs/` en lugar de copiar su contenido.

## Fuentes de verdad

- `docs/arquitectura.md`: mapa de visión, drivers, ADR, vistas y glosario.
- `docs/drivers.md`, sección 1: catálogo de casos de uso (CU-01 a CU-13). Es la lista de funcionalidades del sistema.
- `specs/`: una carpeta por caso de uso del catálogo, con el mismo número (p. ej. CU-02 → `specs/002-revisar-postulacion/`), con `spec.md`, `plan.md`, `tasks.md` y `validacion.md`.
- Si el código contradice una especificación o la arquitectura, gana la especificación / documento de arquitectura. Si parece incorrecto o ambiguo, detenerse y preguntar.
- Los ADR no se editan: una decisión nueva se escribe como ADR nuevo que reemplaza al anterior.

## Arquitectura

- Monolito modular en NestJS (ADR-001), organizado por módulos de negocio (`postulacion`, `asignacion-tutor`, `horas`, `evaluacion`, `actas`, `administracion`) y módulo transversal (`compartido/`).
- **Regla estricta de modularidad (ADR-001):** ningún módulo importa ni inyecta el `Repository<T>` de otro módulo. La interacción entre módulos se realiza exclusivamente a través de sus servicios exportados (`PostulacionService`, `HorasService`, etc.).
- Sin capas intermedias innecesarias: según la Vista de desarrollo (`docs/vistas/03-desarrollo.md`), cada módulo consta de `Controller` (adaptador HTTP), `Service` (lógica y caso de uso) y acceso directo a su propia entidad con `@InjectRepository`.
- La postulación se modela como una máquina de estados explícita (`RECIBIDA` → `EN_REVISION` → `VALIDADA`/`RECHAZADA`) con transiciones manuales aprobadas por humanos, sin automatizaciones (RN-01, ADR-003).
- Generación de acta síncrona (ADR-005): no hay colas ni workers asíncronos; el PDF se renderiza en memoria con PDFKit dentro de la transacción.
- Control de acceso por roles (ADR-004): SSO institucional con JWT para estudiantes y administrativos; Magic Links con tokens de un solo uso y expiración corta para supervisores externos sin cuenta (RN-02).
- Manejo de errores centralizado (ADR-006): `HttpExceptionFilter` global y errores de negocio con `DominioError`. Sin reintentos automáticos (si la generación falla pasa a estado `FALLIDA` para reintento manual).
- Requisitos y horas mínimas parametrizados por programa académico en base de datos (`requisito_programa`), nunca quemados en código (ADR-007).
- Se audita el 100% de los accesos denegados y los cambios de estado críticos en `RegistroAuditoria` (EAC-03, PA-04).

## Convenciones de código

- NestJS 10 + TypeScript sobre Node.js 20+.
- Tipado estricto; DTOs con validadores (`class-validator` y `class-transformer`) en entradas y salidas de controladores.
- Nombres alineados con el glosario (sección 10 de `docs/arquitectura.md`).
- Persistencia en PostgreSQL mediante TypeORM (ADR-002); adaptadores simulados o en memoria cuando una etapa de especificación previa lo requiera.
- Validación escenario por escenario según los diagramas de secuencia (`docs/diagramas/secuencias/`).

## Forma de trabajar

- Una tarea de `tasks.md` a la vez.
- Al terminar: marcar la tarea, listar los archivos cambiados y detenerse.
- No inventar requisitos: lo que no esté en los documentos se marca en `spec.md` con `# [NECESITA ACLARACIÓN: <pregunta>]` o se pregunta al usuario.
- No agregar dependencias de paquetes ni librerías que ningún ADR haya aprobado.
- Un commit por tarea, con el ID de la tarea en el mensaje.
