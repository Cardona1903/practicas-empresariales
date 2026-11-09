# Vista de procesos: diagrama de contenedores

> C4 nivel 2: se abre la caja del sistema y se hace zoom a qué se ejecuta y cómo se comunica. Para: integradores del sistema.

## 1. Presentación principal

Diagrama: [`diagramas/02-procesos.puml`](../diagramas/02-procesos.puml)

## 2. Catálogo de elementos

| Elemento | Responsabilidad | Tecnología | Se comunica con |
|---|---|---|---|
| Aplicación web | Interfaz del estudiante, el personal administrativo y el supervisor (vía enlace). | SPA (por implementar) | API de prácticas (JSON/HTTPS) |
| API de prácticas | Reglas de postulación, asignación de tutor, horas, evaluación y generación del acta (monolito modular). | Node.js, NestJS, TypeScript | Aplicación web, PostgreSQL, almacenamiento de PDFs, SIA |
| PostgreSQL | Postulaciones, horas, evaluaciones, actas y configuración de requisitos por programa. | PostgreSQL (RT-01) | API de prácticas (SQL) |
| Almacenamiento de PDFs | Archivos de las actas generadas. | Almacenamiento institucional (RT-01) | API de prácticas (escribe y lee) |

**Estado de implementación.** La API de prácticas ya está construida (carpeta `src/`, 45 archivos, NestJS + TypeORM); la Aplicación web todavía no tiene código, solo este contrato de interfaz hacia la API.

## 3. Justificación

- **ADR-001 (monolito modular):** la API de prácticas es un único contenedor desplegable, con separación interna por módulos de negocio — esa separación se ve en la Vista de desarrollo, no aquí.
- **ADR-002 y RT-01:** PostgreSQL y el almacenamiento de PDFs corren en infraestructura institucional, no en la nube.
- **ADR-005 (generación síncrona del acta):** no hay broker de mensajes ni worker asíncrono, a diferencia de sistemas que firman digitalmente en segundo plano; la API genera el PDF en la misma petición.
- **RN-02 y ADR-004:** el Supervisor usa la misma Aplicación web que los demás actores, pero autenticado por un enlace de un solo uso en vez de SSO.
- **Supuesto S2:** la conexión con el SIA es responsabilidad exclusiva de la API, no de la Aplicación web.

## 4. Comportamiento

Los seis escenarios de `drivers.md` (sección "Escenarios") cruzan estos contenedores: por ejemplo, `cu07-generar-acta.puml` muestra a la API consultando PostgreSQL y escribiendo en el almacenamiento de PDFs dentro de una misma transacción (ADR-005).

## 5. Vistas relacionadas

- **Contexto (vista previa):** de ahí vienen los tres actores y el SIA.
- **Desarrollo:** muestra cómo se organiza por dentro la API de prácticas.
- **Física:** en qué nodo de la infraestructura institucional corre cada uno de estos contenedores.
