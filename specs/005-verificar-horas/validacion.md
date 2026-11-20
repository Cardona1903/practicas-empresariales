# Validación de CU-05: Verificar horas de estudiantes

## Salida de ejecución de la suite de pruebas (`test/probar-verificar-horas.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-05 VERIFICAR HORAS DE ESTUDIANTES
====================================================================

TEST 1: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 200, filtrado por estado=REGISTRADA retorna 2 pendientes; filtrado con estudianteId=1053800000 retorna únicamente horas-002)

TEST 2: Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico)
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.     LOG [AuditoriaService] Auditoría [VERIFICACION_HORAS] Resultado: EXITOSO Actor: 30300300
  -> RESULTADO: CUMPLE (HTTP 200, horas-002 pasa a VERIFICADA, total consolidado sube de 6 a 14 horas y cambio auditado con actor 30300300)

TEST 3: Intento de verificar un registro de horas que ya estaba verificado (excepción)
  -> RESULTADO: CUMPLE (HTTP 409 Conflict retornado cuando el registro ya está en estado VERIFICADA)

TEST 4: Verificación de un registro de horas inexistente (excepción)
  -> RESULTADO: CUMPLE (HTTP 404 Not Found retornado para identificador inexistente)

TEST 5: Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad)
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_NO_AUTENTICADO_SSO] Resultado: DENEGADO Actor: ANONIMO
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.    WARN [RolesGuard] Acceso denegado: actor [1053800000] con rol [ESTUDIANTE] intentó acceder a recurso que exige [ADMINISTRATIVO]
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 1053800000
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.    WARN [RolesGuard] Acceso denegado: actor [1053800000] con rol [ESTUDIANTE] intentó acceder a recurso que exige [ADMINISTRATIVO]
[Nest] 154442  - 19/11/2026, 7:44:58 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 1053800000
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, registros sin cambios y 3 eventos en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 5/5 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico) | **Cumple** | **Prueba:** [test/probar-verificar-horas.ts#L309-L343](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-verificar-horas.ts#L309-L343) (TEST 1) consulta `GET /horas?estado=REGISTRADA` retornando únicamente los 2 registros pendientes con HTTP 200, y `GET /horas?estado=REGISTRADA&estudianteId=1053800000` retornando exclusivamente `horas-002`.<br>**Código:** Endpoint `GET /horas` en [src/horas/horas.controller.ts#L67-L76](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L67-L76), DTO [src/horas/dto/consultar-horas-filtro.dto.ts#L7-L19](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/dto/consultar-horas-filtro.dto.ts#L7-L19) y `listarRegistrosHoras` en [src/horas/horas.service.ts#L69-L84](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L69-L84). |
| Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico) | **Cumple** | **Prueba:** [test/probar-verificar-horas.ts#L348-L384](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-verificar-horas.ts#L348-L384) (TEST 2) verifica `horas-002` (8 horas) mediante `PATCH /horas/horas-002` con actor `"30300300"`, comprueba HTTP 200, estado `VERIFICADA`, aumento del consolidado `totalHorasValidadas('1053800000')` de 6 a 14 horas y registro `VERIFICACION_HORAS` en `RegistroAuditoria`.<br>**Código:** Endpoint `PATCH /horas/:id` en [src/horas/horas.controller.ts#L83-L92](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L83-L92), método `verificarRegistroHoras` en [src/horas/horas.service.ts#L90-L129](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L90-L129) y consolidación `totalHorasValidadas` en [src/horas/horas.service.ts#L135-L144](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L135-L144). |
| Intento de verificar un registro de horas que ya estaba verificado (excepción) | **Cumple** | **Prueba:** [test/probar-verificar-horas.ts#L389-L407](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-verificar-horas.ts#L389-L407) (TEST 3) intenta volver a verificar `horas-001` (que ya está en `VERIFICADA`), comprobando rechazo con HTTP 409 Conflict.<br>**Código:** Verificación en [src/horas/horas.service.ts#L101-L105](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L101-L105) lanzando `RegistroHorasYaVerificadoError` (HTTP 409) de [src/compartido/errores/dominio.error.ts#L66-L70](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/errores/dominio.error.ts#L66-L70). |
| Verificación de un registro de horas inexistente (excepción) | **Cumple** | **Prueba:** [test/probar-verificar-horas.ts#L412-L426](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-verificar-horas.ts#L412-L426) (TEST 4) envía `PATCH /horas/horas-inexistente-999` y comprueba rechazo con HTTP 404 Not Found.<br>**Código:** Verificación de existencia en [src/horas/horas.service.ts#L95-L99](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L95-L99) lanzando `RegistroHorasNoEncontradoError` (HTTP 404) de [src/compartido/errores/dominio.error.ts#L60-L64](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/errores/dominio.error.ts#L60-L64). |
| Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-verificar-horas.ts#L431-L482](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-verificar-horas.ts#L431-L482) (TEST 5) prueba petición sin token (HTTP 401) y con rol `ESTUDIANTE` tanto en `GET /horas` como en `PATCH /horas/horas-002` (HTTP 403); verifica que el 100% se bloquea, ningún registro cambia de estado y los 3 eventos quedan en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')` en [src/horas/horas.controller.ts#L67-L85](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L67-L85). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Sin acoplamiento de repositorios entre módulos:** `HorasService` ([src/horas/horas.service.ts#L24-L30](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L24-L30)) inyecta exclusivamente su propio repositorio `@InjectRepository(RegistroHoras)` y consume los servicios exportados `EnlaceAccesoService` y `AuditoriaService`. Además, exporta `totalHorasValidadas(estudianteId)` ([src/horas/horas.service.ts#L135-L144](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L135-L144)) para que el Módulo Actas (CU-07) obtenga el total consolidado de horas verificadas sin tocar jamás `Repository<RegistroHoras>`.
  2. **Estructura interna limpia (`Controller -> Service -> Repository`):** Cumple con la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`) sin capas ni puertos intermedios innecesarios.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. La transición `REGISTRADA -> VERIFICADA` solo ocurre mediante `PATCH /horas/:id` ejecutado por un usuario autenticado con rol `ADMINISTRATIVO`.
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple. `POST /horas` usa `SupervisorTokenGuard` para supervisores externos y `GET /horas` + `PATCH /horas/:id` usan `SsoAuthGuard` + `RolesGuard` con `@Roles('ADMINISTRATIVO')`.
- **Generación síncrona / consolidación transaccional si aplica (ADR-005):** Cumple. `totalHorasValidadas(estudianteId)` consolida síncronamente las horas en estado `VERIFICADA` listas para CU-07.
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple (`RegistroHorasNoEncontradoError` 404 y `RegistroHorasYaVerificadoError` 409).
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-005`, `ADR-006`, `RN-01`, `EAC-03` y `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario):** Cumple (`RegistroHoras`, `EstadoHoras`, `RegistroAuditoria`, `ConsultarHorasFiltroDto`).
