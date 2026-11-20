# Fase 4: Implementar

Entrada: `AGENTS.md`, `docs/arquitectura.md`, `spec.md`, `plan.md`, `tasks.md` y el ID de la tarea indicada (T-NN).

Reglas:
- Implementar solo la tarea T-NN. No tocar archivos que la tarea no menciona.
- Respetar la regla estricta de modularidad (ADR-001): ningún módulo importa ni inyecta el `Repository<T>` de otro módulo. Toda interacción entre módulos de negocio se realiza exclusivamente a través de sus servicios exportados (`PostulacionService`, `HorasService`, etc.).
- Sin capas intermedias innecesarias: usar `Controller` (HTTP) -> `Service` (lógica) -> `@InjectRepository` (entidad propia), según `docs/vistas/03-desarrollo.md`.
- Manejo de errores unificado (ADR-006): lanzar `DominioError` para errores de negocio y apoyarse en `HttpExceptionFilter` global, sin reintentos automáticos.
- Nombres de clases, métodos, entidades y atributos alineados estrictamente con el glosario (sección 10 de `docs/arquitectura.md`).
- No agregar librerías ni dependencias de npm que ningún ADR haya aprobado.
- Si hay una ambigüedad o inconsistencia, detenerse y preguntar; no resolverla por cuenta propia.
- Al terminar: marcar la casilla en `tasks.md`, listar los archivos cambiados y detenerse.

La persona lee el cambio completo, confirma con un commit que lleva el ID de la tarea en el mensaje y pide la siguiente.
