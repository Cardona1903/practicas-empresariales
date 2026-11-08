# Vista de desarrollo: diagrama de componentes

> C4 nivel 3: se abre la API de prácticas y se hace zoom a sus bloques internos y responsabilidades, más la vista de usos (quién necesita a quién). Para: programadores.

## 1. Presentación principal

Diagrama: [`diagramas/03-desarrollo.puml`](../../diagramas/03-desarrollo.puml)

**Nota sobre las "capas".** La clase de referencia dibuja esta vista con capas de Clean Architecture (dominio / aplicación / infraestructura, con puertos y adaptadores explícitos). El código real de este proyecto (carpeta `src/`, ya construido en NestJS) **no** separa esas tres capas dentro de cada módulo: cada módulo tiene un `Controller` (adaptador HTTP), un `Service` (caso de uso) y accede a su propio repositorio de TypeORM directamente con `@InjectRepository`, sin una interfaz de puerto intermedia. Ningún driver de `drivers.md` exige hexagonal puro — ADR-001 solo exige que un módulo no acceda a las tablas de otro, lo cual sí se cumple y se puede verificar en el código (ver más abajo). Se documenta esta simplificación explícitamente en vez de dibujar una capa que no existe.

## 2. Catálogo de elementos

| Componente | Tipo | Responsabilidad | Depende de |
|---|---|---|---|
| Módulo Postulación | Caso de uso | CU-02 (revisar/validar), CU-09 (postularse); máquina de estados ADR-003. | Compartido/Configuración, Compartido/Auth, PostgreSQL |
| Módulo AsignaciónTutor | Caso de uso | CU-03 (no primario, existe porque PA-01 lo nombra). | Compartido/Auth, PostgreSQL |
| Módulo Horas | Caso de uso | CU-05 (verificar), CU-12 (ingresar, Supervisor). | Compartido/Auth, PostgreSQL |
| Módulo Evaluación | Caso de uso | CU-13 (evaluar desempeño, Supervisor). | Compartido/Auth, PostgreSQL |
| Módulo Actas | Caso de uso | CU-07 (generar acta); ADR-005 (síncrono, transaccional), ADR-006 (reintento manual). | **PostulacionService** y **HorasService** exportados (nunca sus repositorios), PostgreSQL |
| Módulo Administración | Caso de uso | CU-08 (reportes, no primario); solo lee a través de servicios exportados, igual que Actas. | PostulacionService, HorasService |
| Compartido / Auth | Adaptador | SSO institucional (`SsoAuthGuard`), autorización por rol (`RolesGuard`), enlace de un solo uso (`SupervisorTokenGuard`); ADR-004. Registra cada acceso rechazado en RegistroAuditoria (PA-04). | PostgreSQL (enlaces, auditoría), SIA |
| Compartido / Configuración | Caso de uso | `RequisitoPrograma` por programa académico; ADR-007. | PostgreSQL |

## 3. Justificación

- **ADR-001:** la regla de dependencia entre módulos es la misma que exige esa decisión: un módulo de negocio nunca importa el `Repository<T>` de otro, solo su servicio exportado. El código ya la cumple literalmente en `actas.module.ts` (importa `PostulacionModule` y `HorasModule`, no sus entidades) y en `reportes.service.ts` (mismo patrón).
- **Mantenibilidad (EAC-02):** por eso Postulación y Configuración son módulos separados — cambiar un requisito de validación por programa académico se queda en Configuración, sin tocar Postulación, Horas ni Actas.
- **Regla de dependencia:** los casos de uso (los seis módulos de negocio) no implementan directamente el acceso a infraestructura externa (SIA); eso es responsabilidad exclusiva de Compartido/Auth.
- **RT-01 y ADR-002:** cada módulo tiene su propio acceso a PostgreSQL, aislado por módulo aunque compartan el mismo motor institucional.

## 4. Comportamiento

El escenario `cu07-generar-acta.puml` ocurre dentro de la API de prácticas: el Controlador de Actas invoca `ActasService`, que llama a `PostulacionService.estaValidada()` y a `HorasService.totalHorasValidadas()` antes de generar el PDF — exactamente las dos flechas de uso dibujadas aquí.

## 5. Vistas relacionadas

- **Procesos:** es el interior del contenedor "API de prácticas".
- **Lógica:** los módulos operan sobre las entidades del modelo de dominio.
- **Módulos (familia de estructuras):** coincide con la vista de usos: ningún módulo de negocio depende de Actas ni de Administración — la dependencia va en un solo sentido, sin ciclos.
