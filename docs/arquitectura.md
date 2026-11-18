# Documento de arquitectura: Sistema de Gestión de Prácticas Empresariales

## 1. Introducción y objetivos

El sistema centraliza y gestiona el ciclo completo de prácticas empresariales para los estudiantes de la Facultad de Inteligencia Artificial e Ingenierías de la Universidad de Caldas: postulación, asignación de tutor, seguimiento y verificación de horas, evaluación del supervisor empresarial y expedición del acta final de finalización en PDF. Reemplaza el flujo manual soportado en hojas de cálculo de Excel y correos electrónicos para ~500 estudiantes y 50 tutores al año.

Los tres objetivos de negocio (OB-01 a OB-03) buscan reducir en un 75% el tiempo operativo del personal administrativo, garantizar la expedición del acta de finalización en un plazo máximo de 24 horas hábiles tras concluir la práctica, y alcanzar al menos un 90% de satisfacción en la experiencia de usuario.

Detalle: [Visión](vision.md)

Funcionalidades: [Catálogo de casos de uso](drivers.md#1-casos-de-uso-y-casos-de-uso-primarios) (CU-01 a CU-13), destacando los seis casos de uso primarios (CU-02, CU-05, CU-07, CU-09, CU-12 y CU-13).

## 2. Restricciones

Tres restricciones institucionales y de negocio gobiernan la arquitectura:

1. **RT-01 (Técnica):** Despliegue obligatorio en la infraestructura institucional de la Universidad de Caldas, utilizando el motor de base de datos relacional PostgreSQL y almacenamiento local on-premise, descartando servicios en nube pública.
2. **RN-01 (Negocio):** Exclusión de automatizaciones en los flujos de trabajo; el personal administrativo exige mantener la validación humana directa para la aprobación de documentos antes de expedir el acta final.
3. **RN-02 (Negocio):** Acceso restringido de roles en el sistema; los tutores y supervisores empresariales externos no tienen cuenta en el ERP institucional, interactuando únicamente mediante enlaces temporales de un solo uso.

Detalle: [Restricciones](drivers.md#3-restricciones) y [vision.md](vision.md#5-restricciones).

## 3. Contexto del sistema

El sistema interactúa con tres actores humanos (Estudiante, Personal Administrativo de la Coordinación de Prácticas y Supervisor Empresarial) y un único sistema externo (SIA - Sistema de Información Académica). No incluye pasarelas de pago ni servicios externos de firma digital, ya que el acta se genera localmente en PDF.

Detalle: [Contexto](contexto.md) | Diagrama: [`diagramas/contexto.puml`](diagramas/contexto.puml)

## 4. Estrategia de solución

| Driver | Enfoque | ADR |
|---|---|---|
| PA-01, EAC-02 | Monolito modular por módulos de negocio en NestJS; comunicación exclusiva mediante servicios exportados | [ADR-001](adr/ADR-001-monolito-modular.md) |
| RT-01 | PostgreSQL y repositorio de archivos sobre servidores on-premise institucionales | [ADR-002](adr/ADR-002-postgresql-infraestructura-institucional.md) |
| RN-01, CU-02 | Máquina de estados finita con aprobaciones manuales explícitas para la postulación | [ADR-003](adr/ADR-003-maquina-estados-postulacion.md) |
| RN-02, PA-02, EAC-03, CU-12, CU-13 | SSO + RBAC para usuarios institucionales; Magic Links temporales de un solo uso para supervisores | [ADR-004](adr/ADR-004-sso-rbac-acceso-externo.md) |
| EAC-01, CU-05, CU-07, PA-04 | Generación síncrona del acta PDF en memoria (PDFKit) con consolidación transaccional | [ADR-005](adr/ADR-005-generacion-sincrona-acta.md) |
| PA-03 | Filtro global de excepciones y errores de dominio tipados, con reintento manual (sin reintentos automáticos) | [ADR-006](adr/ADR-006-manejo-errores-centralizado.md) |
| PA-05, EAC-02, CU-09 | Parametrización de requisitos y horas mínimas por programa académico en base de datos (`requisito_programa`) | [ADR-007](adr/ADR-007-configuracion-requisitos-programa.md) |

## 5. Vistas (4+1)

[Lógica](vistas/01-logica.md) | [Procesos](vistas/02-procesos.md) | [Desarrollo](vistas/03-desarrollo.md) | [Física](vistas/04-fisica.md)

Escenarios (+1): [diagramas/secuencias/](diagramas/secuencias/) y tabla de escenarios en [drivers.md](drivers.md#7-escenarios-el-1-del-modelo-de-vistas).

### Matriz de cobertura: drivers y ADR por vista

Ninguna fila queda vacía: todo driver y todo ADR se ven reflejados en al menos una vista arquitectónica.

| Driver o ADR | Contexto (marco) | Lógica | Procesos | Desarrollo | Física |
|---|:---:|:---:|:---:|:---:|:---:|
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

Nota: EAC-01 se valida en el escenario [CU-07](diagramas/secuencias/cu07-generar-acta.puml); EAC-03 se valida en el escenario [CU-12](diagramas/secuencias/cu12-ingresar-horas.puml); EAC-02 (Mantenibilidad) es una propiedad en tiempo de diseño validable en la separación modular de la [Vista de desarrollo](vistas/03-desarrollo.md).

## 6. Conceptos transversales

| Concepto | Cómo se resuelve | Dónde se ve |
|---|---|---|
| Autenticación y autorización | JWT institucional para estudiantes/administrativos; token de un solo uso con vencimiento para supervisores | [ADR-004](adr/ADR-004-sso-rbac-acceso-externo.md), [Desarrollo](vistas/03-desarrollo.md) |
| Manejo de errores | `HttpExceptionFilter` unifica respuestas HTTP; errores de negocio tipados con `DominioError` sin reintentos automáticos | [ADR-006](adr/ADR-006-manejo-errores-centralizado.md), [Desarrollo](vistas/03-desarrollo.md) |
| Registro y trazabilidad | Entidad `RegistroAuditoria` desacoplada para registrar 100% de accesos denegados y transiciones de estado | [ADR-004](adr/ADR-004-sso-rbac-acceso-externo.md), [ADR-005](adr/ADR-005-generacion-sincrona-acta.md), [Lógica](vistas/01-logica.md) |
| Configuración y parametrización | Requisitos y horas mínimas en base de datos (`requisito_programa`); variables de entorno (`.env`) para infraestructura | [ADR-007](adr/ADR-007-configuracion-requisitos-programa.md), [Desarrollo](vistas/03-desarrollo.md) |
| Estructura y modularidad | Monolito modular en NestJS; prohibición de compartir repositorios entre módulos; comunicación vía interfaces de servicio | [ADR-001](adr/ADR-001-monolito-modular.md), [Desarrollo](vistas/03-desarrollo.md) |
| Generación de documentos | Consolidación de horas y renderizado síncrono del PDF mediante PDFKit dentro de una única transacción | [ADR-005](adr/ADR-005-generacion-sincrona-acta.md), [Procesos](vistas/02-procesos.md), [Física](vistas/04-fisica.md) |
| Persistencia y datos | Base de datos relacional PostgreSQL institucional on-premise con acceso mediante TypeORM | [ADR-002](adr/ADR-002-postgresql-infraestructura-institucional.md), [Física](vistas/04-fisica.md) |

## 7. Decisiones de diseño

| ADR | Decisión | Estado | Drivers |
|---|---|---|---|
| [ADR-001](adr/ADR-001-monolito-modular.md) | Monolito modular por módulos de negocio | Aceptado | PA-01, EAC-02 |
| [ADR-002](adr/ADR-002-postgresql-infraestructura-institucional.md) | PostgreSQL en infraestructura institucional | Aceptado | RT-01 |
| [ADR-003](adr/ADR-003-maquina-estados-postulacion.md) | Máquina de estados con aprobación manual en la postulación | Aceptado | RN-01, CU-02 |
| [ADR-004](adr/ADR-004-sso-rbac-acceso-externo.md) | SSO + RBAC, con acceso de un solo uso para actores externos | Aceptado | RN-02, PA-02, EAC-03, CU-12, CU-13 |
| [ADR-005](adr/ADR-005-generacion-sincrona-acta.md) | Generación síncrona del acta con consolidación transaccional | Aceptado | EAC-01, CU-05, CU-07, PA-04 |
| [ADR-006](adr/ADR-006-manejo-errores-centralizado.md) | Manejo de errores centralizado con reintento manual | Aceptado | PA-03 |
| [ADR-007](adr/ADR-007-configuracion-requisitos-programa.md) | Requisitos de postulación como configuración por programa | Aceptado | PA-05, EAC-02, CU-09 |

Los 7 ADRs cubren el 100% de los drivers definidos (17 de 17) según se detalla en el [README de trazabilidad](adr/README-trazabilidad.md).

## 8. Requisitos de calidad

| EAC | Atributo | Prioridad | ADR | Se verifica en |
|---|---|---|---|---|
| EAC-01 | Eficiencia de desempeño | Alta | ADR-005 | Diagrama de secuencia [CU-07](diagramas/secuencias/cu07-generar-acta.puml) y prueba de carga ($\le$ 5 s en 95% con 30 solicitudes concurrentes) |
| EAC-02 | Mantenibilidad | Alta | ADR-001, ADR-007 | Inspección de dependencias en [Vista de desarrollo](vistas/03-desarrollo.md) y prueba de cambio sobre `requisito_programa` ($\le$ 2 días/persona, 1 módulo) |
| EAC-03 | Seguridad | Alta | ADR-004 | Diagrama de secuencia [CU-12](diagramas/secuencias/cu12-ingresar-horas.puml) y pruebas de autorización (100% accesos bloqueados y log en $\le$ 1 s) |

Los tres escenarios quedan trazados directamente hacia los casos de uso primarios o la estructura modular del sistema: EAC-01 con CU-07, EAC-03 con CU-12/CU-13, y EAC-02 con la modularidad arquitectónica.

## 9. Riesgos y deuda técnica

| ID | Riesgo o deuda | Origen | Impacto | Respuesta |
|---|---|---|---|---|
| R-01 | Cuello de botella en validación manual durante picos de postulación (500 estudiantes al inicio de periodo) | RN-01, ADR-003, [vision.md](vision.md#riesgos) | Retrasos en el flujo previo a la práctica y riesgo sobre OB-02 | Dimensionar turnos del personal administrativo y escalonar fechas límite de recepción por programa |
| R-02 | Indisponibilidad o latencia excesiva del SIA en la validación SSO | Supuesto S2, [vision.md](vision.md#supuestos) | Bloqueo en inicio de sesión institucional | Timeout estricto con mensaje claro al usuario y registro de falla en auditoría |
| R-03 | Concurrencia de solicitudes de generación de actas en cierre de semestre superior a 30 simultáneas | EAC-01, [drivers.md](drivers.md#eac-01-eficiencia-de-desempeno-comportamiento-temporal) | Posible degradación temporal de EAC-01 en el servidor de aplicaciones | Monitoreo de recursos y ajuste del pool de conexiones TypeORM/PostgreSQL |
| R-04 | Reenvío no autorizado del enlace de acceso del supervisor a terceros | RN-02, ADR-004 | Potencial intento de alteración de horas o evaluación | Token de un solo uso con corta expiración (24-48 h), invalidación tras uso y registro de IP/User-Agent en auditoría |
| DT-01 | Despliegue conjunto obligatorio ante cambios en módulos independientes | ADR-001 | Ventana de mantenimiento compartida para todo el monolito | Programar despliegues en horarios de bajo impacto y pipelines de build automatizados |
| DT-02 | Posible inconsistencia entre archivo PDF en almacenamiento y registro de acta en base de datos si el disco falla | ADR-005 | Acta registrada como GENERADA sin archivo disponible | Transacción en dos fases: si falla la escritura del archivo, el acta queda en estado `FALLIDA` para reintento manual |
| DT-03 | Interfaz web de usuario (SPA) pendiente de desarrollo | [02-procesos.md](vistas/02-procesos.md) | El sistema cuenta actualmente solo con backend y especificación de endpoints | Desarrollar frontend desacoplado consumiendo los contratos REST de la API |
| DT-04 | Ausencia de migraciones automatizadas iniciales en PostgreSQL | [README-backend.md](../README-backend.md#como-correr) | Creación manual de tablas sujeta a desalineación | Implementar scripts de migración versionados con TypeORM una vez validado el esquema con TI |

## 10. Glosario

| Término | Definición | Nombre en el código |
|---|---|---|
| Estudiante | Estudiante que realiza la postulación y cursa la práctica empresarial | `Estudiante` |
| Postulación | Trámite formal de solicitud de inicio de práctica con sus documentos adjuntos | `Postulacion` |
| Estado de postulación | Estados de la máquina: RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA | `EstadoPostulacion` |
| Requisito de programa | Parámetros de validación y horas mínimas configuradas por programa académico | `RequisitoPrograma` |
| Supervisor | Supervisor o tutor empresarial externo asignado por la empresa | `Supervisor` |
| Asignación de tutor | Vínculo formal entre el estudiante postulado y su supervisor/tutor | `AsignacionTutor` |
| Registro de horas | Entrada periódica de horas reportadas por el supervisor empresarial | `RegistroHoras` |
| Estado de horas | Estados de verificación: REGISTRADA, VERIFICADA | `EstadoHoras` |
| Evaluación | Calificación y concepto valorativo final emitido por el supervisor | `Evaluacion` |
| Acta de finalización | Documento oficial generado en PDF que acredita la culminación de la práctica | `Acta` |
| Estado del acta | Estados de emisión: GENERADA, FALLIDA | `EstadoActa` |
| Enlace de acceso | Token temporal firmado de un solo uso para acceso externo sin cuenta institucional | `EnlaceAcceso` |
| Registro de auditoría | Bitácora persistente de intentos de acceso denegados y transiciones de estado críticas | `RegistroAuditoria` |
| SIA | Sistema de Información Académica institucional para validación SSO de identidad | `SiaClient` / `SiaService` |
