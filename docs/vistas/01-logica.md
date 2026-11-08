# Vista lógica: modelo de dominio

> C4 no tiene un nivel para esta vista: se usa **UML** (modelo de análisis), igual que en Fundamentos. Para: usuarios finales y analistas.

## 1. Presentación principal

Diagrama: [`diagramas/01-logica.puml`](../../diagramas/01-logica.puml)

Muestra los conceptos del negocio y cómo se relacionan — no las clases del código. Solo atributos clave, sin tipos, visibilidad ni métodos.

## 2. Catálogo de elementos

| Entidad | Qué representa | Atributos clave | Regla del negocio |
|---|---|---|---|
| Estudiante | Quien se postula y realiza la práctica. | documento, programaAcademico | Solo gestiona su propia postulación y horas. |
| Postulacion | El trámite de ingreso a la práctica. | estado, documentosAdjuntos | Estados: RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA (ADR-003); cada transición requiere una acción humana (RN-01). |
| RequisitoPrograma | Los requisitos y horas mínimas vigentes para un programa académico. | programaAcademico, horasMinimas, documentosRequeridos | Es configuración, no código (ADR-007); una Postulación se valida contra el requisito vigente de su programa. |
| Supervisor | El supervisor empresarial que acompaña la práctica. | correo | No tiene cuenta institucional (RN-02); entra por un EnlaceAcceso. |
| AsignacionTutor | La relación entre un Estudiante y su Supervisor. | asignadaEn | Solo existe una vez que la Postulación fue VALIDADA. |
| RegistroHoras | Una entrada de horas practicadas, reportada por el Supervisor. | fecha, horas, estado | Estados: REGISTRADA, VERIFICADA; CU-05 consolida las VERIFICADA antes del acta. |
| Evaluacion | La evaluación de desempeño del estudiante por su Supervisor. | calificacion, comentarios | La realiza el mismo Supervisor asignado al estudiante. |
| Acta | El documento final de la práctica. | estado, totalHoras, rutaPdf | Solo se genera si la Postulación está VALIDADA y las horas, VERIFICADA (CU-05, CU-07); estado GENERADA o FALLIDA (ADR-006). |
| EnlaceAcceso | El token temporal que habilita a un Supervisor sin cuenta institucional. | token, expiraEn, usado | Vencimiento y marca de uso (ADR-004); mitiga, sin eliminar, el riesgo de reenvío a terceros. |
| RegistroAuditoria | Un evento de acceso o de cambio de estado, exitoso o rechazado. | evento, actorId, resultado, fecha | Registra el 100% de los accesos no autorizados (EAC-03) y los cambios de estado relevantes (PA-04); independiente de los logs de la aplicación. |

## 3. Justificación

- **CU-09, CU-02:** de ellas salen Estudiante, Postulacion y RequisitoPrograma.
- **CU-12, CU-13:** de ellas salen RegistroHoras, Evaluacion, Supervisor y AsignacionTutor.
- **CU-05, CU-07:** de ellas sale Acta, que depende de que Postulacion y RegistroHoras estén en su estado válido.
- **EAC-03 (Seguridad) y RN-02:** EnlaceAcceso existe específicamente porque el Supervisor no tiene cuenta institucional; sin esta entidad no habría forma de controlar ni expirar su acceso.
- **ADR-007:** RequisitoPrograma es la entidad que materializa "requisitos como configuración", no como reglas embebidas en código.
- **Mantenibilidad (EAC-02):** RequisitoPrograma está separado de Postulacion precisamente para que cambiar un requisito por programa no toque la entidad ni el módulo de Postulación.
- **PA-04 (Registro y trazabilidad):** RegistroAuditoria existe como entidad propia, y no como una columna más de Postulacion o Acta, porque la preocupación pide definir explícitamente "qué eventos se registran... y por cuánto tiempo se conservan"; separarla permite responder esa pregunta sin acoplarla a ningún módulo de negocio.

## 4. Comportamiento

Los diagramas de secuencia de `diagramas/secuencias/` recorren estas entidades y cambian sus estados: `cu02-revisar-postulacion.puml` mueve a Postulacion entre EN_REVISION, VALIDADA y RECHAZADA; `cu12-ingresar-horas.puml` crea RegistroHoras validando primero EnlaceAcceso; `cu07-generar-acta.puml` crea Acta a partir de Postulacion y RegistroHoras ya validados.

## 5. Vistas relacionadas

- **Desarrollo:** estas entidades viven dentro de cada módulo de la API (Postulación, Horas, Evaluación, Actas, Compartido/Auth) y los módulos las usan sin exponer sus tablas a otros módulos (ADR-001).
- **Procesos:** se guardan en PostgreSQL; `rutaPdf` apunta a un archivo en el almacenamiento institucional, no al contenido del PDF.
