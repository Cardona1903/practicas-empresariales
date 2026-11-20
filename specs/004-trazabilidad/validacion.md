# Validación de CU-04: Visualización de datos y trazabilidad de postulantes

## Salida de ejecución de la suite de pruebas (`test/probar-trazabilidad.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-04 TRAZABILIDAD DE POSTULANTES
====================================================================

TEST 1: Consulta exitosa de los datos y trazabilidad de un postulante existente (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 200, retorna estudiante, detalle de postulación y 2 eventos de auditoría asociados al trámite)

TEST 2: Consulta de un postulante inexistente por documento (flujo alterno)
  -> RESULTADO: CUMPLE (HTTP 404 retornado con mensaje indicando que el postulante 9999999999 no fue encontrado)

TEST 3: Bloqueo de consulta de datos y trazabilidad sin rol administrativo (EAC-03 - Seguridad)
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, sin entrega de datos sensibles y 3 eventos en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 3/3 ESCENARIOS CUMPLIDOS
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Consulta exitosa de los datos y trazabilidad de un postulante existente (flujo básico) | **Cumple** | **Prueba:** [test/probar-trazabilidad.ts#L285-L347](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/test/probar-trazabilidad.ts#L285-L347) (TEST 1) consulta `"GET /postulaciones/estudiante/1053800000"` con rol `ADMINISTRATIVO` (`30300300`), verifica código HTTP 200, datos de `estudiante` (`documento`, `programaAcademico`), detalle de `postulacion` (`id`, `estado`, `documentosAdjuntos`, `motivoRechazo`, `creadaEn`, `actualizadaEn`) y lista `trazabilidad` con los eventos de auditoría asociados (`evento`, `resultado`, `fecha`).<br>**Código:** Endpoint `GET /postulaciones/estudiante/:documento` en [src/postulacion/postulacion.controller.ts#L101-L114](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.controller.ts#L101-L114), método `obtenerTrazabilidadPorEstudiante` en [src/postulacion/postulacion.service.ts#L269-L318](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.service.ts#L269-L318) y consulta en [src/compartido/auditoria/auditoria.service.ts#L50-L75](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/compartido/auditoria/auditoria.service.ts#L50-L75). |
| Consulta de un postulante inexistente por documento (flujo alterno) | **Cumple** | **Prueba:** [test/probar-trazabilidad.ts#L349-L372](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/test/probar-trazabilidad.ts#L349-L372) (TEST 2) consulta `"GET /postulaciones/estudiante/9999999999"`, verifica respuesta HTTP 404 y mensaje indicando que el postulante no fue encontrado.<br>**Código:** Validación de existencia en [src/postulacion/postulacion.service.ts#L286-L293](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.service.ts#L286-L293) lanzando `PostulacionNoEncontradaError` (HTTP 404) de [src/compartido/errores/dominio.error.ts#L42-L46](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/compartido/errores/dominio.error.ts#L42-L46). |
| Bloqueo de consulta de datos y trazabilidad sin rol administrativo (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-trazabilidad.ts#L374-L433](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/test/probar-trazabilidad.ts#L374-L433) (TEST 3) intenta acceder a `"GET /postulaciones/estudiante/1053800000"` sin autenticación (HTTP 401), con rol `ESTUDIANTE` (HTTP 403) y con rol `SUPERVISOR` (HTTP 403); comprueba bloqueo del 100%, ausencia de filtración de datos sensibles y registro de los 3 eventos en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` en [src/postulacion/postulacion.controller.ts#L33](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.controller.ts#L33), `@Roles('ADMINISTRATIVO')` en [src/postulacion/postulacion.controller.ts#L108](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.controller.ts#L108) y auditoría en `SsoAuthGuard` y `RolesGuard`. |

---

## Validación arquitectónica

- **Regla estricta de modularidad (ADR-001):** Cumple. Ningún módulo importa ni inyecta el `Repository<T>` de otro módulo. `PostulacionService` ([src/postulacion/postulacion.service.ts#L43-L50](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.service.ts#L43-L50)) inyecta únicamente sus propios repositorios (`Postulacion` y `Estudiante`) y obtiene la trazabilidad de auditoría invocando el método exportado `AuditoriaService.consultarPorTramite()` ([src/postulacion/postulacion.service.ts#L295-L300](file:///c:/Users/The%20Real/Desktop/S7/Arq_software/Talleres/Taller2/practicas-empresariales/src/postulacion/postulacion.service.ts#L295-L300)), sin tocar `Repository<RegistroAuditoria>`.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. La consulta de trazabilidad es estrictamente de lectura y expone fielmente el estado actual de `EstadoPostulacion` (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`), el `motivoRechazo` y la bitácora de transiciones manuales aprobadas por humanos.
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple. El endpoint `GET /postulaciones/estudiante/:documento` exige sesión SSO institucional (`SsoAuthGuard`) y rol `ADMINISTRATIVO` (`RolesGuard`), bloqueando a estudiantes y supervisores externos.
- **Generación síncrona / transaccional si aplica (ADR-005):** No aplica a CU-04 (aplica a CU-07: Generar el acta final de la práctica en PDF).
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple. Cuando no existe el postulante consultado, se lanza `PostulacionNoEncontradaError` (que hereda de `DominioError` con HTTP 404) y es capturado por `HttpExceptionFilter`.
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple. ADR-001 (comunicación vía `AuditoriaService`), ADR-002 (consultas TypeORM sobre PostgreSQL), ADR-003 (exposición de `EstadoPostulacion` y sus eventos), ADR-004 (`SsoAuthGuard` + `RolesGuard` + auditoría EAC-03/PA-04) y ADR-006 (`PostulacionNoEncontradaError` + `HttpExceptionFilter`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario):** Cumple. Nombres alineados con el glosario (`Estudiante`, `Postulacion`, `EstadoPostulacion`, `RegistroAuditoria`) y arquitectura directa `Controller -> Service -> Repository` sin capas intermedias innecesarias.
