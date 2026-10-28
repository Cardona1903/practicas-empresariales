# ADR-002: Desplegar sobre PostgreSQL en la infraestructura institucional existente

## Estado
Aceptado

## Contexto
La restricción **RT-01** ("Despliegue en infraestructura institucional — PostgreSQL"), impuesta por el Departamento de TI de la Universidad, exige reutilizar los servidores y el motor de base de datos relacional ya contratados por la institución, evitando costos de nube externa y garantizando el cumplimiento de las políticas de seguridad de la información vigentes.

**Drivers cubiertos:** RT-01.

Esta decisión viene impuesta por una restricción de origen institucional. Se documentan igualmente dos alternativas para dejar constancia de por qué no son viables, no porque estuvieran realmente disponibles para el equipo.

## Alternativas consideradas
1. **PostgreSQL on-premise sobre infraestructura institucional (elegida, impuesta por RT-01).**
2. **Servicio de base de datos administrado en nube pública** (p. ej. una instancia PostgreSQL gestionada por un proveedor externo).
3. **Motor NoSQL/documental**, dado que parte de la información (postulaciones, documentos adjuntos) tiene estructura variable.

## Decisión
Se usa PostgreSQL desplegado en los servidores institucionales.

La opción de nube pública administrada se descarta porque RT-01 prohíbe explícitamente el uso de nube externa.

La opción NoSQL se descarta porque, aunque algunos datos (documentos de postulación) son poco estructurados, el núcleo del sistema (horas, actas, relaciones estudiante–tutor–empresa) requiere integridad transaccional y relaciones consistentes entre entidades, que un motor relacional ya disponible institucionalmente resuelve sin introducir un segundo motor de persistencia que la universidad tendría que operar y asegurar por separado.

## Consecuencias

### Positivas
- No hay costo adicional de infraestructura ni negociación con un nuevo proveedor.
- El sistema hereda las políticas de seguridad, respaldo y cumplimiento ya vigentes en la institución.

### Negativas y costos aceptados
- La capacidad de cómputo y de escalamiento del sistema queda limitada a lo que el Departamento de TI disponga; el equipo de desarrollo no controla directamente los tiempos de aprovisionamiento de más capacidad si el volumen de estudiantes crece por encima de lo previsto.

### Riesgos asumidos
- Durante los picos de cierre de semestre (hasta 30 solicitudes simultáneas de generación de actas, Escenario 1), un recurso de infraestructura compartido con otros sistemas institucionales podría degradar el desempeño por debajo de la medida de respuesta acordada, sin que el equipo del proyecto tenga control directo sobre esa capacidad.
