# Drivers arquitectónicos: Sistema de Gestión de Prácticas Empresariales

A continuación se extraen los drivers arquitectónicos del sistema a partir del documento de visión (`vision.md`): casos de uso primarios, escenarios de atributos de calidad, restricciones, preocupaciones arquitectónicas y la matriz de priorización.

## 1. Casos de uso y casos de uso primarios

Se listan 13 casos de uso agrupados por actor. Se marcan como primarios (máximo 6) los que cumplen alguno de los cinco criterios vistos en clase: importancia para el negocio, complejidad técnica, alta frecuencia de uso, riesgo, o estar atado a un atributo de calidad crítico.

| ID | Actor | Caso de uso | ¿Primario? | Justificación (criterio) | Se especifica en |
|---|---|---|---|---|---|
| CU-01 | Personal Administrativo | Visualizar peticiones de postulación | No | Consulta estándar sobre datos ya existentes en el sistema; no estructura la arquitectura. | [specs/001-visualizar-peticiones](../specs/001-visualizar-peticiones/) |
| **CU-02** | Personal Administrativo | Revisar y validar la postulación del estudiante | **Sí** | Riesgo: los requisitos de validación varían por programa académico y aún no están estandarizados; es el filtro de entrada a todo el proceso. | [specs/002-revisar-postulacion](../specs/002-revisar-postulacion/) |
| CU-03 | Personal Administrativo | Asignar tutor al estudiante | No | Actualización simple de una relación estudiante-tutor; sin complejidad ni riesgo relevante. | [specs/003-asignar-tutor](../specs/003-asignar-tutor/) |
| CU-04 | Personal Administrativo | Visualización de datos de postulantes | No | Consulta estándar, similar a CU-01. | (sin especificar) |
| **CU-05** | Personal Administrativo | Verificar horas de estudiantes | **Sí** | Complejidad técnica: consolida y cruza datos provenientes de múltiples fuentes (registro del supervisor y revisión manual) antes de habilitar el acta. | [specs/005-verificar-horas](../specs/005-verificar-horas/) |
| CU-06 | Personal Administrativo | Dar confirmación para la generación del acta final | No | Es un cambio de estado (aprobación); la complejidad real está en CU-07, que genera el documento. | (sin especificar) |
| **CU-07** | Personal Administrativo | Generar el acta final de la práctica (PDF) | **Sí** | Atado a un atributo de calidad crítico (integridad/fiabilidad de los datos) y es la razón de ser del sistema según el enunciado; un error aquí obliga a reemitir el acta. | (sin especificar) |
| CU-08 | Personal Administrativo | Consultar reportes/indicadores del estado de las prácticas en curso | No | Valioso para el negocio, pero no estructura el sistema; depende de datos ya consolidados por otros casos de uso. | [specs/008-consultar-reportes](../specs/008-consultar-reportes/) |
| **CU-09** | Estudiante | Realizar postulación a la práctica (cargar datos y documentos requeridos) | **Sí** | Importancia para el negocio: es la puerta de entrada y la razón de ser del sistema. | [specs/009-postularse](../specs/009-postularse/) |
| CU-10 | Estudiante | Consultar el estado de la postulación y el avance de horas | No | Consulta de solo lectura sobre datos ya gestionados por otros casos de uso. | [specs/010-consultar-estado-y-avance](../specs/010-consultar-estado-y-avance/) |
| CU-11 | Estudiante | Generar petición del acta final | No | Es un disparador simple (solicitud) que activa CU-07; en sí mismo no tiene complejidad. | (sin especificar) |
| **CU-12** | Supervisor de práctica | Ingresar horas de práctica de los estudiantes | **Sí** | Alta frecuencia de uso: se repite semanalmente, por cientos de estudiantes, durante los 4 a 6 meses de cada práctica. | [specs/012-ingresar-horas](../specs/012-ingresar-horas/) |
| **CU-13** | Supervisor de práctica | Evaluar el desempeño del estudiante en práctica | **Sí** | Atado a un atributo de calidad crítico: capacidad de interacción para un actor externo sin cuenta institucional (RN-02); condiciona el mecanismo de acceso. | [specs/013-evaluar-desempeno](../specs/013-evaluar-desempeno/) |

**Nota:** en el borrador inicial dos casos de uso mencionaban "certificado"; se ajustó la redacción a "acta" (CU-06, CU-07 y CU-11) para mantener consistencia con el alcance definido en `vision.md`, que habla de "acta de finalización".

## 2. Escenarios de atributos de calidad

Se presentan tres escenarios completos (seis partes cada uno), sobre atributos distintos. El escenario EAC-02 corresponde a mantenibilidad, como exige la guía del taller.

### EAC-01: Eficiencia de desempeño (comportamiento temporal)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Un miembro del personal administrativo autenticado en el sistema |
| Estímulo | Confirma la finalización de una práctica y solicita la generación del acta |
| Artefacto | El módulo de generación de actas |
| Entorno | Operación normal, durante los periodos de cierre de semestre, con hasta 30 solicitudes de generación simultáneas (supuesto a validar con Coordinación de Prácticas, ya que `vision.md` no especifica la concurrencia esperada) |
| Respuesta | El sistema consolida los datos de horas validadas y genera el documento PDF del acta, dejándolo disponible para descarga |
| **Medida de respuesta** | **En menos de 5 segundos, en el 95% de las solicitudes** |

**Escenario redactado.** Un miembro del personal administrativo autenticado (1) confirma la finalización de una práctica y solicita la generación del acta (2) al módulo de generación de actas (3), en operación normal con hasta 30 solicitudes simultáneas durante el cierre de semestre (4). El sistema consolida los datos de horas validadas y genera el PDF del acta, dejándolo disponible para descarga (5), en menos de 5 segundos en el 95% de las solicitudes (6).

### EAC-02: Mantenibilidad (modificabilidad)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Un desarrollador del equipo de mantenimiento |
| Estímulo | Recibe el requerimiento de modificar un requisito de validación de la postulación para un programa académico específico (p. ej., cambiar el número mínimo de créditos aprobados exigido) |
| Artefacto | El módulo de postulación y validación de requisitos |
| Entorno | En tiempo de diseño/mantenimiento, con el sistema en producción y datos históricos existentes |
| Respuesta | El desarrollador localiza y modifica la regla de validación sin alterar el módulo de asignación de tutor, el de horas ni el de generación de actas |
| **Medida de respuesta** | **El cambio se implementa, prueba y despliega en máximo 2 días/persona, modificando un (1) solo módulo del sistema** |

**Escenario redactado.** Un desarrollador del equipo de mantenimiento (1) recibe el requerimiento de cambiar un requisito de validación de la postulación para un programa académico (2) en el módulo de postulación y validación de requisitos (3), con el sistema en producción (4). El desarrollador modifica la regla sin alterar los módulos de asignación de tutor, horas o generación de actas (5), en máximo 2 días/persona y modificando un solo módulo (6).

### EAC-03: Seguridad (control de acceso)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Un supervisor empresarial (actor externo, sin cuenta institucional) o un estudiante autenticado |
| Estímulo | Intenta consultar o registrar información de una práctica que no le pertenece, o acceder a una funcionalidad fuera de su rol |
| Artefacto | El módulo de control de acceso (autorización por roles) |
| Entorno | Operación normal |
| Respuesta | El sistema rechaza la solicitud y registra el intento en la bitácora de auditoría |
| **Medida de respuesta** | **El 100% de los accesos no autorizados son bloqueados, y el intento queda registrado en la bitácora en menos de 1 segundo** |

**Escenario redactado.** Un supervisor empresarial sin cuenta institucional o un estudiante autenticado (1) intenta consultar o registrar información de una práctica que no le pertenece (2) en el módulo de control de acceso (3), en operación normal (4). El sistema rechaza la solicitud y registra el intento en la bitácora de auditoría (5), bloqueando el 100% de los accesos no autorizados y registrándolos en menos de 1 segundo (6).

## 3. Restricciones

Las restricciones provienen de `vision.md` (RT-01, RN-01, RN-02); aquí se agrega el impacto arquitectónico esperado de cada una.

| ID | Restricción | Tipo | Origen | Impacto arquitectónico esperado |
|---|---|---|---|---|
| RT-01 | Despliegue en infraestructura institucional (PostgreSQL) | Técnica | Departamento de TI de la Universidad | Descarta bases de datos NoSQL/documentales y despliegues en nube pública; obliga a un modelo relacional en PostgreSQL. |
| RN-01 | Exclusión de automatizaciones en flujos de trabajo | Negocio | Coordinación Administrativa de la Facultad | Descarta motores de reglas o flujos de aprobación automáticos; cada transición de estado (validación, confirmación, generación de acta) requiere una acción humana explícita. |
| RN-02 | Acceso restringido de roles en el sistema | Negocio | Decanatura / gobierno de datos de la Facultad | Obliga a un mecanismo de control de acceso por rol (RBAC) y a que el supervisor empresarial interactúe por un canal alterno (enlace o formulario) sin necesidad de cuenta en el sistema. |

## 4. Preocupaciones arquitectónicas

| ID | Preocupación | Qué hay que decidir | Por qué importa en este sistema |
|---|---|---|---|
| PA-01 | Estructura general | Cómo se divide el sistema en módulos (p. ej., Postulación, Asignación de tutor, Horas, Evaluación, Actas, Administración) y cómo se comunican entre sí. | Condiciona directamente la mantenibilidad (EAC-02) y el esfuerzo de evolución del sistema. |
| PA-02 | Autenticación y autorización | Inicio de sesión institucional (SSO) para estudiantes y personal administrativo; mecanismo de acceso sin cuenta (enlace/token) para los supervisores empresariales, según RN-02. | Es la restricción de negocio más fuerte sobre quién puede entrar al sistema y cómo; afecta directamente a CU-12 y CU-13. |
| PA-03 | Manejo de errores y excepciones | Estrategia unificada para documentos incompletos o corruptos al cargar requisitos, y para fallos en la generación del PDF del acta. | Un acta mal generada obliga a reemitirla (CU-07); un documento de postulación corrupto bloquea la entrada del proceso (CU-09). |
| PA-04 | Registro y trazabilidad | Qué eventos se registran (accesos, cambios de estado, generación de actas), dónde se almacenan y por cuánto tiempo se conservan. | Necesario para auditar el proceso de aprobación manual (RN-01) y los intentos de acceso no autorizado (EAC-03). |
| PA-05 | Configuración | Cómo se parametrizan los requisitos de postulación y las horas mínimas exigidas, que pueden variar entre programas académicos, sin modificar el código ni volver a desplegar. | Afecta directamente a CU-09; sin esto, cada cambio de requisito por programa exige un despliegue. |

## 5. Matriz de priorización de drivers

La importancia la asigna el cliente (negocio); la dificultad técnica la asigna el equipo arquitecto. Se ubican los casos de uso primarios, los escenarios, las restricciones y las preocupaciones arquitectónicas en los cuatro cuadrantes.

### Alta importancia, baja dificultad: hacer ya
CU-09, CU-12, EAC-01, RT-01, RN-01, PA-02

### Alta importancia, alta dificultad: atender primero
CU-02, CU-05, CU-07, CU-13, EAC-02, EAC-03, RN-02, PA-01

### Baja importancia, baja dificultad: hacer si sobra tiempo
PA-03, PA-05

### Baja importancia, alta dificultad: cuestionar
PA-04 (evaluar si se requiere bitácora detallada de cada consulta, o solo de cambios de estado)

Los siete casos de uso no marcados como primarios (CU-01, CU-03, CU-04, CU-06, CU-08, CU-10, CU-11) no se incluyen en la matriz: al no ser drivers (no superan ninguno de los cinco criterios de la sección 1), no condicionan el diseño de la arquitectura.

## 6. Trazabilidad hacia los ADR

Ver `docs/adr/README-trazabilidad.md` para la tabla completa que mapea cada uno de estos 17 drivers al ADR que lo cubre.

## 7. Escenarios (el "+1" del modelo de vistas)

Siguiendo el criterio de la clase de Vistas arquitectónicas: un escenario por cada caso de uso primario (máximo 6), más uno adicional por cada EAC que no quede cubierto dentro de esos primarios. Cada escenario se describe aquí y se representa con su propio diagrama de secuencia arquitectónico en `diagramas/secuencias/`.

| ID | Escenario | Origen | Por qué es escenario | EAC que cubre | Archivo en `secuencias/` |
|---|---|---|---|---|---|
| ESC-01 | Postularse a la práctica | CU-09 | Caso de uso primario; es la puerta de entrada al sistema. | — | `cu09-postularse.puml` |
| ESC-02 | Revisar y validar la postulación | CU-02 | Caso de uso primario; filtro de entrada con requisitos variables por programa (ADR-003, ADR-007). | — | `cu02-revisar-postulacion.puml` |
| ESC-03 | Ingresar horas de práctica | CU-12 | Caso de uso primario; actor externo sin cuenta institucional (ADR-004). | EAC-03 (seguridad): el enlace vencido o inválido se rechaza y queda en bitácora. | `cu12-ingresar-horas.puml` |
| ESC-04 | Evaluar el desempeño del estudiante | CU-13 | Caso de uso primario; mismo mecanismo de acceso que CU-12 (ADR-004). | — (EAC-03 ya se demuestra en ESC-03; no hace falta repetirlo) | `cu13-evaluar-desempeno.puml` |
| ESC-05 | Verificar horas de estudiantes | CU-05 | Caso de uso primario; consolida datos de múltiples fuentes antes del acta. | — | `cu05-verificar-horas.puml` |
| ESC-06 | Generar el acta final | CU-07 | Caso de uso primario; "la razón de ser del sistema" (drivers.md, sección 1). | EAC-01 (eficiencia): responde en menos de 5 s, en el 95% de las solicitudes, con hasta 30 simultáneas. | `cu07-generar-acta.puml` |

**EAC-02 (Mantenibilidad) no tiene un diagrama de secuencia propio.** A diferencia de EAC-01 y EAC-03, que describen una respuesta del sistema en tiempo de ejecución, EAC-02 describe un cambio en tiempo de diseño/mantenimiento ("un desarrollador... modifica la regla sin alterar los módulos de asignación de tutor, horas o generación de actas"). Esa propiedad no se puede recorrer con un diagrama de secuencia porque no hay una interacción en ejecución que mostrar; se valida inspeccionando la estructura, concretamente la separación de módulos en la Vista de desarrollo (`docs/vistas/03-desarrollo.md`) y la decisión de ADR-001. Esto es intencional, no un escenario pendiente.

### Recorrido de validación (qué elementos de cada vista toca cada escenario)

| Escenario | Contexto | Lógica | Procesos | Desarrollo | Física |
|---|---|---|---|---|---|
| ESC-01 Postularse | Estudiante, sistema | Estudiante, Postulacion, RequisitoPrograma | Aplicación web, API | Módulo Postulación, Compartido/Configuración | Servidor web, servidor de aplicaciones, servidor de BD |
| ESC-02 Revisar postulación | Personal Administrativo, sistema | Postulacion | Aplicación web, API | Módulo Postulación, Compartido/Auth | Servidor de aplicaciones, servidor de BD |
| ESC-03 Ingresar horas | Supervisor, sistema | Supervisor, EnlaceAcceso, RegistroHoras | Aplicación web, API | Módulo Horas, Compartido/Auth | Servidor de aplicaciones, servidor de BD |
| ESC-04 Evaluar desempeño | Supervisor, sistema | Supervisor, EnlaceAcceso, Evaluacion | Aplicación web, API | Módulo Evaluación, Compartido/Auth | Servidor de aplicaciones, servidor de BD |
| ESC-05 Verificar horas | Personal Administrativo, sistema | RegistroHoras | Aplicación web, API | Módulo Horas | Servidor de aplicaciones, servidor de BD |
| ESC-06 Generar acta | Personal Administrativo, sistema | Postulacion, RegistroHoras, Acta | Aplicación web, API, almacenamiento de PDFs | Módulo Actas → Postulación, Horas (ADR-001) | Servidor de aplicaciones, servidor de BD, almacenamiento institucional |

**Verificación.** Los seis casos de uso primarios tienen su escenario; EAC-01 y EAC-03 aparecen cada uno en al menos uno; cada vista es recorrida por al menos un escenario (Contexto, Lógica, Procesos y Desarrollo por los seis; Física por los seis también, ya que todos terminan en el servidor de aplicaciones y la base de datos). Ningún escenario quedó sin poder recorrerse por las vistas existentes, por lo que no fue necesario corregir ninguna vista.
