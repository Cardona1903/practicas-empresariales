# Contexto del sistema

> El contexto encuadra las cuatro vistas de 4+1; no es, en sí mismo, una de ellas (ver `6._Vistas_arquitectonicas.pdf`, diapositiva 25). Se dibuja con **C4 nivel 1**.

## 1. Presentación principal

Diagrama: [`diagramas/contexto.puml`](../diagramas/contexto.puml)

El sistema se trata como una caja negra: qué actores lo usan y con qué sistema externo se integra, sin mostrar su estructura interna.

## 2. Catálogo de elementos

| Elemento | Tipo | Rol o responsabilidad | Interacción con el sistema |
|---|---|---|---|
| Estudiante | Persona | Se postula a la práctica, carga los documentos requeridos y consulta el avance de su proceso. | Aplicación web (HTTPS) |
| Personal Administrativo (Coordinación de Prácticas) | Persona | Revisa y valida postulaciones, verifica horas consolidadas y genera el acta final. | Aplicación web (HTTPS) |
| Supervisor empresarial | Persona | Ingresa las horas de práctica del estudiante y evalúa su desempeño, sin tener cuenta institucional. | Aplicación web, vía enlace de un solo uso (HTTPS) |
| Sistema de Gestión de Prácticas Empresariales | Sistema en alcance | Centraliza postulación, asignación de tutor, horas, evaluación y generación del acta de finalización. | Con todos los demás elementos |
| SIA (Sistema de Información Académica) | Sistema externo | Mantiene los datos de estudiantes y personal administrativo; fuente de identidad para el SSO (supuesto S2 de `vision.md`). | Consulta por el sistema (SSO) |

**Nota.** A diferencia de otros sistemas de este tipo, no hay pasarela de pagos ni proveedor externo de firma digital: `vision.md` no menciona cobro del trámite ni firma digital del acta, y ningún ADR introduce esas integraciones. El acta se genera como PDF dentro del propio sistema (ADR-005) y no requiere actores ni sistemas externos adicionales.

## 3. Justificación

- **Tres actores, no más:** se derivan directamente de la tabla de Stakeholders de `vision.md`. "Decanatura y Directivos", "Equipo desarrollador" y "Desarrolladores Externos Competidores" no interactúan en tiempo de ejecución con el sistema, por lo que no aparecen como actores del contexto (son stakeholders, no usuarios).
- **RN-02** (Acceso restringido de roles): es la razón por la que el Supervisor aparece como un actor con un canal de interacción distinto (enlace de un solo uso) en vez de una cuenta institucional como los otros dos.
- **CU-09, CU-02, CU-05, CU-07, CU-12, CU-13** (los seis casos de uso primarios): todos definen interacciones entre estos tres actores y el sistema; ninguno requiere un sistema externo adicional al SIA.
- **Supuesto S2** de `vision.md`: el SIA existe y el sistema tendrá acceso a él para identificar y validar usuarios; de ahí que aparezca como único sistema externo.

## 4. Comportamiento

El contexto no muestra orden ni tiempo (eso lo hacen los escenarios del +1). Los tres primeros escenarios de la tabla de `drivers.md` (CU-09, CU-02, CU-12/CU-13) arrancan precisamente en los actores dibujados aquí; el CU-07 (generación del acta) lo dispara el Personal Administrativo, también desde este mismo contexto.

## 5. Vistas relacionadas

- **Procesos:** abre la caja del sistema y muestra los contenedores (aplicación web, API, PostgreSQL) que atienden a estos mismos tres actores y se comunican con el SIA.
- **Física:** muestra en qué nodo de la infraestructura institucional corre cada contenedor y por qué protocolo sale cada conexión dibujada aquí.
