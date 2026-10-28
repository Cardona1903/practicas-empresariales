# ADR-007: Externalizar los requisitos de postulación y las horas mínimas como configuración por programa académico

## Estado
Aceptado

## Contexto
La preocupación arquitectónica **"Configuración"** exige definir "cómo se parametrizan los requisitos de postulación y las horas mínimas exigidas, que pueden variar entre programas académicos, sin modificar el código ni volver a desplegar".

**CU-09** (Realizar postulación a la práctica) es el caso de uso primario donde el estudiante carga los datos y documentos requeridos, los cuales deben validarse contra esos requisitos vigentes para su programa.

**Drivers cubiertos:** PA-05 (Configuración); CU-09.

## Alternativas consideradas
1. **Configuración en base de datos (elegida):** tablas de requisitos y horas mínimas por programa académico, editables desde una pantalla de administración, sin tocar código ni desplegar.
2. **Reglas de validación embebidas en el código** de la aplicación, con un nuevo despliegue cada vez que cambian para un programa.
3. **Archivo de configuración estático** (p. ej. YAML/JSON) editado manualmente por un desarrollador y publicado en cada despliegue.

## Decisión
Se almacena la configuración en base de datos con una pantalla de administración.

La alternativa 2 se descarta porque contradice explícitamente lo que exige la preocupación de Configuración ("sin modificar el código ni volver a desplegar") y además perjudica la mantenibilidad (EAC-02) al mezclar datos de negocio cambiantes con la lógica del módulo de Postulación.

La alternativa 3 se descarta porque, aunque evita tocar la lógica de validación, sigue dependiendo de un desarrollador y un despliegue para cada cambio, lo cual no resuelve el problema de fondo: que un coordinador de programa pueda ajustar sus propios requisitos sin pasar por el equipo técnico.

## Consecuencias

### Positivas
- Un cambio en las horas mínimas o los requisitos de un programa académico no exige código nuevo ni un despliegue.
- CU-09 valida siempre contra la configuración vigente en el momento de la postulación.

### Negativas y costos aceptados
- Se debe construir y mantener una capa de validación que interprete configuración y no solo reglas fijas en código, lo cual añade complejidad al módulo de Postulación en comparación con reglas embebidas simples.

### Riesgos asumidos
- Si el personal administrativo que edita la configuración (sin ser el equipo técnico) introduce un valor inválido o inconsistente (p. ej. un mínimo de horas negativo o un requisito contradictorio entre programas), el sistema podría aceptar o rechazar postulaciones incorrectamente; se asume este riesgo y se recomienda una validación básica de la propia configuración como trabajo futuro.
