# ADR-004: Autenticar por SSO institucional y autorizar por roles, con acceso de un solo uso para actores externos

## Estado
Aceptado

## Contexto
La restricción **RN-02** ("Acceso restringido de roles en el sistema"), impuesta por Decanatura y el gobierno de datos de la facultad, establece que "los tutores y empresas externas no deben ingresar al ERP" y que el acceso a datos sensibles debe limitarse a estudiantes y administrativos.

Sin embargo, dos casos de uso primarios dependen de un actor externo sin cuenta institucional: **CU-12** (Ingresar horas de práctica, realizado por el Supervisor de práctica) y **CU-13** (Evaluar el desempeño del estudiante, también realizado por el Supervisor), cuya propia justificación señala que están "atados a un atributo de calidad crítico: capacidad de interacción para un actor externo sin cuenta institucional".

El **EAC-03 – Seguridad** exige además que el sistema "rechace la solicitud y registre el intento" cuando un actor consulta o registra información de una práctica que no le pertenece, bloqueando el **100% de los accesos no autorizados** y registrándolos en menos de 1 segundo.

**Drivers cubiertos:** RN-02; CU-12; CU-13; EAC-03 (Seguridad); PA-02 (Autenticación y autorización).

## Alternativas consideradas
1. **SSO institucional + enlace de un solo uso (elegida):** SSO contra el SIA (según el supuesto S2 de la Visión) para estudiantes y personal administrativo, más un enlace o token con vencimiento, sin contraseña, para los supervisores empresariales; validación por rol en cada operación.
2. **Exigir también cuenta institucional a los supervisores empresariales.**
3. **Autenticación propia del sistema** (usuario/contraseña gestionados por la aplicación) para todos los actores, sin integración con el SIA.

## Decisión
Se usa SSO institucional para los actores internos y un enlace de un solo uso con vencimiento para los supervisores.

La alternativa 2 se descarta porque contradice directamente RN-02 ("no deben ingresar al ERP").

La alternativa 3 se descarta porque obliga a construir y mantener un segundo sistema de credenciales paralelo al que ya gestiona la institución, duplicando el riesgo de seguridad sin necesidad, cuando el supuesto S2 ya establece que el SIA existe y está disponible para identificar a estos usuarios.

El control de acceso por roles sobre cada operación es el mecanismo que hace cumplir, en tiempo de ejecución, tanto RN-02 como la medida de respuesta de EAC-03.

## Consecuencias

### Positivas
- Los estudiantes y el personal administrativo heredan la gestión de identidad ya existente en la institución (menor superficie de ataque, sin contraseñas adicionales que administrar).
- Los supervisores pueden operar (CU-12, CU-13) sin que la Facultad tenga que crearles ni mantenerles una cuenta, cumpliendo RN-02.

### Negativas y costos aceptados
- Mantener dos mecanismos de acceso en paralelo (SSO + enlaces de un solo uso) aumenta la complejidad de implementación y de pruebas del módulo de autenticación, comparado con un único mecanismo uniforme para todos los actores.

### Riesgos asumidos
- Un enlace de un solo uso puede ser reenviado por el supervisor a un tercero antes de expirar, permitiendo que alguien distinto registre horas (CU-12) o una evaluación (CU-13) en su nombre. Se acepta este riesgo residual porque RN-02 impide una alternativa con credenciales propias verificables, y se mitiga parcialmente con el vencimiento del enlace y el registro de auditoría que exige EAC-03.
