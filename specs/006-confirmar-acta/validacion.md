# Validación de CU-06: Dar confirmación para la generación del acta final

## Salida de ejecución de la suite de pruebas (`test/probar-confirmar-acta.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-06 CONFIRMAR GENERACIÓN DE ACTA
====================================================================

TEST 1: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico)
[Nest] 202708  - 19/11/2026, 9:41:54 p.m.     LOG [AuditoriaService] Auditoría [CONFIRMACION_ACTA] Resultado: EXITOSO Actor: 30300300
  -> RESULTADO: CUMPLE (HTTP 200, acta-sol-001 pasa de SOLICITADA a CONFIRMADA sin generar PDF automáticamente y se audita con actor 30300300)

TEST 2: Intento de confirmar un acta que no se encuentra en estado solicitada (excepción)
  -> RESULTADO: CUMPLE (HTTP 409 Conflict cuando el acta ya está en CONFIRMADA o GENERADA, conservando su estado actual)

TEST 3: Confirmación de un registro de acta inexistente (excepción)
  -> RESULTADO: CUMPLE (HTTP 404 Not Found para identificador de acta inexistente)

TEST 4: Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
[Nest] 202708  - 19/11/2026, 9:41:54 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_NO_AUTENTICADO_SSO] Resultado: DENEGADO Actor: ANONIMO
[Nest] 202708  - 19/11/2026, 9:41:54 p.m.    WARN [RolesGuard] Acceso denegado: actor [1053800000] con rol [ESTUDIANTE] intentó acceder a recurso que exige [ADMINISTRATIVO]
[Nest] 202708  - 19/11/2026, 9:41:54 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 1053800000
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, acta conserva SOLICITADA y 2 eventos registrados en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Confirmación exitosa de una petición de acta en estado solicitada (flujo básico) | **Cumple** | **Prueba:** [test/probar-confirmar-acta.ts#L223-L253](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-confirmar-acta.ts#L223-L253) (TEST 1) envía `PATCH /actas/acta-sol-001/confirmar` con rol `ADMINISTRATIVO` (`30300300`), verificando respuesta HTTP 200, transición de `SOLICITADA` a `CONFIRMADA`, `rutaPdf: null` (sin generar el PDF automáticamente en este paso, `RN-01`) y evento `CONFIRMACION_ACTA` en `RegistroAuditoria` (`PA-04`).<br>**Código:** Endpoint `PATCH /actas/:id/confirmar` en [src/actas/actas.controller.ts#L53-L61](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.controller.ts#L53-L61) y método `confirmarActa` en [src/actas/actas.service.ts#L144-L180](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.service.ts#L144-L180). |
| Intento de confirmar un acta que no se encuentra en estado solicitada (excepción) | **Cumple** | **Prueba:** [test/probar-confirmar-acta.ts#L258-L283](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-confirmar-acta.ts#L258-L283) (TEST 2) intenta confirmar nuevamente un acta en estado `CONFIRMADA` y otra en estado `GENERADA`, comprobando rechazo con HTTP 409 Conflict e invariancia del estado actual.<br>**Código:** Validación `acta.estado !== EstadoActa.SOLICITADA` en [src/actas/actas.service.ts#L155-L159](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.service.ts#L155-L159) lanzando `TransicionEstadoActaInvalidaError` (HTTP 409) de [src/compartido/errores/dominio.error.ts#L109-L113](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/errores/dominio.error.ts#L109-L113). |
| Confirmación de un registro de acta inexistente (excepción) | **Cumple** | **Prueba:** [test/probar-confirmar-acta.ts#L288-L302](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-confirmar-acta.ts#L288-L302) (TEST 3) envía `PATCH /actas/acta-inexistente-999/confirmar`, verificando rechazo con HTTP 404 Not Found.<br>**Código:** Verificación de existencia en [src/actas/actas.service.ts#L149-L153](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.service.ts#L149-L153) lanzando `ActaNoEncontradaError` (HTTP 404) de [src/compartido/errores/dominio.error.ts#L103-L107](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/errores/dominio.error.ts#L103-L107). |
| Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-confirmar-acta.ts#L307-L343](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-confirmar-acta.ts#L307-L343) (TEST 4) prueba petición sin token (HTTP 401) y con rol `ESTUDIANTE` (HTTP 403); verifica bloqueo del 100%, invariancia del estado `SOLICITADA` y 2 registros en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')` en [src/actas/actas.controller.ts#L29-L55](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.controller.ts#L29-L55). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Sin acoplamiento de repositorios entre módulos:** `ActasService` ([src/actas/actas.service.ts#L35-L44](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/actas/actas.service.ts#L35-L44)) inyecta exclusivamente su propio repositorio `@InjectRepository(Acta)` y se comunica con los demás módulos a través de sus servicios exportados (`PostulacionService`, `HorasService`, `ConfiguracionService`, `AuditoriaService`).
  2. **Estructura interna limpia (`Controller -> Service -> Repository`):** Cumple con la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`).
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. La transición `SOLICITADA -> CONFIRMADA` exige una acción humana explícita del administrativo y no dispara automáticamente la generación del PDF (`RN-01`).
- **Control de acceso por roles institucionales (ADR-004, RN-02):** Cumple (`SsoAuthGuard`, `RolesGuard`, `@Roles('ADMINISTRATIVO')`).
- **Generación síncrona / transaccional si aplica (ADR-005):** Cumple al preparar la aprobación manual previa a la expedición síncrona de CU-07.
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple (`ActaNoEncontradaError` 404 y `TransicionEstadoActaInvalidaError` 409).
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-005`, `ADR-006`, `RN-01`, `EAC-03`, `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, nombres del glosario):** Cumple (`Acta`, `EstadoActa`, `RegistroAuditoria`).
