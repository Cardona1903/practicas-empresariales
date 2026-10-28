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
