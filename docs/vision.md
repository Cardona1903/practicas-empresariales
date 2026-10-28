# Documento de visión: Sistema de Gestión de Prácticas Empresariales

> **Enunciado.** La Facultad de Ingenierías quiere un sistema para gestionar las prácticas empresariales de los estudiantes: postulación, asignación de tutor, seguimiento de horas, evaluación de la empresa y generación del acta final. Hoy todo se maneja en Excel y correo electrónico. Hay 500 estudiantes en práctica al año y 50 tutores.

## 1. Problema u oportunidad

Actualmente la Facultad de Inteligencia Artificial e Ingenierías gestiona toda la información de sus estudiantes que se encuentran en fase de prácticas universitarias empresariales, con más de 500 estudiantes y 50 tutores al año. Guardan toda esa información en un Excel y se comunican por correo electrónico; en el Excel gestionan la postulación, la asignación de tutor, el seguimiento de horas, la evaluación de la empresa y la generación del acta final, lo cual son procesos complejos y de gran volumen de datos, por lo que se tiene ineficiencia al gestionar múltiples etapas que causan riesgos en la generación de entregables como actas de grado, al tener todos los datos concentrados en archivos de Excel, con el peligro incluso de perder los datos de sus estudiantes y convenios con empresas colaboradoras. Aquí nace una oportunidad de mejorar el sistema y evitar futuros errores, creando una plataforma de gestión —un ERP— donde se facilite el uso, acceso, administración y generación de documentos a los administrativos de la universidad, ahorrando tiempo, accediendo fácilmente a información y con un uso y respuesta grato.

## 2. Objetivos de negocio

| ID | Objetivo de negocio (qué gana la Facultad, medible) | Atributo de calidad que implica |
|---|---|---|
| **OB-01** | Reducir en un 75% el tiempo total dedicado por los usuarios administrativos operando el sistema (procesamiento de postulaciones, visualización de datos, y generación de Actas de grado). | Eficiencia de desempeño |
| **OB-02** | El tiempo promedio de expedición del acta de grado será como máximo de 24 horas hábiles una vez finalizada la fase de prácticas empresariales. | Eficiencia de desempeño |
| **OB-03** | Alcanzar un 90% de satisfacción en la experiencia de usuario de al menos 500 estudiantes y el personal administrativo durante el proceso operativo completo del sistema. | Usabilidad |

*Nota: el documento original no numeraba los objetivos ni les asignaba un atributo de calidad; se agregaron los ID (OB-01 a OB-03) y la columna de atributo para ajustarse a la plantilla y poder referenciarlos desde `drivers.md` y los ADR. Revisa que la asignación de atributo te haga sentido antes de entregarlo.*

## 3. Alcance

### Qué SÍ incluye

- Sección donde el estudiante en práctica ingresa sus datos y carga los requisitos o documentos iniciales requeridos por la facultad.
- Funcionalidad para consolidar los datos de las prácticas completadas y generar automáticamente el archivo/PDF del acta de finalización.

### Qué NO incluye

- No cuenta con automatización, por ejemplo, validaciones automáticas de horas o alertas de vencimiento.
- No contará con funcionalidad de comunicación ni mensajería entre los usuarios, estudiantes, tutores, etc.

## 4. Stakeholders

| Stakeholder | Tipo | Preocupación | Nivel de importancia |
|---|---|---|---|
| Personal Administrativo / Coordinación de Prácticas | Negocio | Operatividad fluida al recibir postulaciones, asignar tutores, verificar horas, gestionar convenios y emitir actas de grado sin depender de hojas de cálculo propensas a errores. | Alto |
| Decanatura y Directivos de la Facultad | Negocio | Mitigar riesgos operativos (pérdida de datos o retrasos en graduaciones), garantizar el cumplimiento de convenios institucionales y mejorar los indicadores de eficiencia de la facultad. | Alto |
| Estudiante | Negocio | Facilidad para postularse, claridad en la asignación de tutor y registro ágil e intuitivo de sus horas de práctica. | Medio |
| Equipo desarrollador | Técnico | Mantenibilidad del código, evaluar y probar requerimientos y funcionalidades. | Medio |
| Desarrolladores Externos Competidores | Negocio/Técnico | Analizar nuestras funcionalidades que hacen destacar la aplicación sobre las demás para convertirlas en el estándar. | Bajo |
| Supervisores Empresariales de Prácticas | Negocio | Seguimiento de horas prácticas hechas por postulantes. | Medio |

## 5. Restricciones

| ID | Restricción | Quién la impone | Por qué |
|---|---|---|---|
| **RT-01** | Despliegue en infraestructura institucional (PostgreSQL) | Departamento de TI de la Universidad | Exige reutilizar la infraestructura de servidores y el motor de base de datos relacional (PostgreSQL) ya contratados e implementados por la institución, evitando costos adicionales de nube externa y garantizando el cumplimiento de las políticas de seguridad de la información. |
| **RN-01** | Exclusión de automatizaciones en flujos de trabajo | Coordinación Administrativa de la Facultad | El personal administrativo exige mantener la validación humana directa para la aprobación de documentos antes de la generación del acta final. |
| **RN-02** | Acceso restringido de roles en el sistema | Decanatura / Gobierno de datos de la facultad | Los tutores y empresas externas no deben ingresar al ERP; la carga y consulta de datos sensibles de prácticas debe quedar limitada estrictamente a estudiantes (postulación) y administrativos (gestión y actas). |

## 6. Supuestos y riesgos iniciales

### Supuestos

| ID | Lo que el enunciado no dice | Supuesto adoptado | Validar con |
|---|---|---|---|
| **S1** | Si los documentos cargados por el estudiante requieren validación automática en tiempo real. | Se asume que la información cargada por los estudiantes en el módulo de postulación es correcta y no requiere validaciones automatizadas en tiempo real. | Coordinación de Prácticas |
| **S2** | Qué sistema de identificación de usuarios usa la universidad. | Se asume que la Universidad cuenta con un Sistema de Información Académica (SIA) que mantiene actualizados los datos de sus estudiantes y tutores, y que el sistema desarrollado tendrá acceso a dicha información para identificar y validar a los usuarios. | Departamento de TI / Administrador del SIA |

### Riesgos

| ID | Riesgo inicial | Objetivo afectado | Mitigación |
|---|---|---|---|
| **R1** | Al no existir automatizaciones ni comunicación dentro de la plataforma, el volumen de verificación manual (500 estudiantes al año) puede causar demoras en la fase previa a la emisión del acta. | OB-02 (expedición del acta en máximo 24 horas hábiles) | Por definir con Coordinación de Prácticas (p. ej., dimensionar el equipo administrativo en los periodos de cierre de semestre). |

*Nota: el documento original no traía la tabla de Supuestos/Riesgos con estas columnas; se formalizó su contenido (S1, S2, R1) al esquema de la plantilla. La columna "Mitigación" de R1 queda explícitamente pendiente de validar con el cliente.*
