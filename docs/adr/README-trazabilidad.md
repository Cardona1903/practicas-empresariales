# Trazabilidad: drivers → ADR

Verificación de que ningún driver identificado en `drivers.md` queda sin cubrir.

| Driver | Descripción corta | ADR que lo cubre |
|---|---|---|
| CU-02 | Revisar y validar la postulación del estudiante | ADR-003 |
| CU-05 | Verificar horas de estudiantes | ADR-005 |
| CU-07 | Generar el acta final de la práctica (PDF) | ADR-005 |
| CU-09 | Realizar postulación a la práctica | ADR-007 |
| CU-12 | Ingresar horas de práctica (Supervisor) | ADR-004 |
| CU-13 | Evaluar el desempeño del estudiante (Supervisor) | ADR-004 |
| EAC-01 | Eficiencia de desempeño (generación de acta) | ADR-005 |
| EAC-02 | Mantenibilidad (modificar validación por programa) | ADR-001 |
| EAC-03 | Seguridad (control de acceso) | ADR-004 |
| RT-01 | Infraestructura institucional / PostgreSQL | ADR-002 |
| RN-01 | Exclusión de automatizaciones en flujos de trabajo | ADR-003 |
| RN-02 | Acceso restringido de roles en el sistema | ADR-004 |
| PA-01 | Estructura general | ADR-001 |
| PA-02 | Autenticación y autorización | ADR-004 |
| PA-03 | Manejo de errores y excepciones | ADR-006 |
| PA-04 | Registro y trazabilidad | ADR-005 |
| PA-05 | Configuración | ADR-007 |

**17 de 17 drivers cubiertos.** No queda ningún driver pendiente declarado como riesgo: incluso el de menor prioridad en la matriz (Manejo de errores y excepciones, cuadrante "hacer si sobra tiempo") tiene su propio ADR, aunque con una decisión deliberadamente simple.

## Resumen de los 7 ADR

| ADR | Título | Alternativas descartadas | ¿Impuesto por una restricción? |
|---|---|---|---|
| ADR-001 | Monolito modular por módulos de negocio | Microservicios; monolito sin separación modular | No |
| ADR-002 | PostgreSQL en infraestructura institucional | Nube pública administrada; NoSQL | Sí (RT-01) |
| ADR-003 | Máquina de estados con aprobación manual en la postulación | Motor de reglas automático; aprobación implícita | Sí (RN-01) |
| ADR-004 | SSO + RBAC, con acceso de un solo uso para actores externos | Cuenta institucional para supervisores; autenticación propia sin SIA | Sí (RN-02) |
| ADR-005 | Generación síncrona del acta con consolidación transaccional | Generación asíncrona; delegar a SaaS externo | No (restricciones la refuerzan: RT-01, RN-02) |
| ADR-006 | Manejo de errores centralizado con reintento manual | Reintentos automáticos; manejo ad-hoc por módulo | No |
| ADR-007 | Requisitos de postulación como configuración por programa | Reglas embebidas en código; archivo estático | No |

## Matriz de cobertura: drivers y ADR por vista

Verificación de que cada driver y cada ADR se ve en al menos una de las cuatro vistas de 4+1 (más el contexto, que las encuadra). Ninguna fila queda vacía.

| Driver o ADR | Contexto | Lógica | Procesos | Desarrollo | Física |
|---|---|---|---|---|---|
| CU-02 Revisar y validar postulación | ✓ | ✓ | | | |
| CU-05 Verificar horas | ✓ | ✓ | | | |
| CU-07 Generar acta | ✓ | ✓ | ✓ | ✓ | ✓ |
| CU-09 Postularse | ✓ | ✓ | | ✓ | |
| CU-12 Ingresar horas | ✓ | ✓ | ✓ | ✓ | |
| CU-13 Evaluar desempeño | ✓ | ✓ | ✓ | ✓ | |
| EAC-01 Eficiencia de desempeño | | | ✓ | ✓ | ✓ |
| EAC-02 Mantenibilidad | | ✓ | | ✓ | |
| EAC-03 Seguridad | ✓ | ✓ | ✓ | ✓ | |
| RT-01 Infraestructura institucional | | | ✓ | ✓ | ✓ |
| RN-01 Sin automatizaciones | | ✓ | | | |
| RN-02 Acceso restringido por rol | ✓ | ✓ | ✓ | | ✓ |
| PA-01 Estructura general | | | ✓ | ✓ | |
| PA-02 Autenticación y autorización | | | ✓ | ✓ | |
| PA-03 Manejo de errores | | ✓ | | ✓ | |
| PA-04 Registro y trazabilidad | | ✓ | | ✓ | |
| PA-05 Configuración | | ✓ | | ✓ | |
| ADR-001 Monolito modular | | | ✓ | ✓ | |
| ADR-002 PostgreSQL institucional | | | ✓ | ✓ | ✓ |
| ADR-003 Máquina de estados, postulación | | ✓ | | ✓ | |
| ADR-004 SSO + enlace de un solo uso | ✓ | ✓ | ✓ | ✓ | |
| ADR-005 Generación síncrona del acta | | | ✓ | ✓ | ✓ |
| ADR-006 Manejo de errores centralizado | | ✓ | | ✓ | |
| ADR-007 Configuración por programa | | ✓ | | ✓ | |

**Lectura.** Cada vista tiene al menos una marca en cada columna y ninguna fila está completamente vacía; el detalle de por qué cada marca aplica está en la sección "3. Justificación" de cada `docs/vistas/0X-*.md` y de `docs/contexto.md`. La columna Física concentra menos marcas porque la mayoría de los drivers son de comportamiento o de estructura de código, no de topología de despliegue — solo los que tocan directamente la infraestructura institucional (RT-01), el acceso por roles (RN-02) o el desempeño bajo carga (EAC-01) la tocan.
