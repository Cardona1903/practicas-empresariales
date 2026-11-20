# Validación de CU-08: Consultar reportes/indicadores del estado de las prácticas en curso

## Salida de ejecución de la suite de pruebas (`test/probar-consultar-reportes.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-08 CONSULTAR REPORTES
====================================================================

TEST 1: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 200, indicadores por estado [total=4, 1 por estado] y horas verificadas consolidadas [64h para 1053800000])

TEST 2: Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno)
  -> RESULTADO: CUMPLE (HTTP 200, contadores en 0 y lista de prácticas vacía)

TEST 3: Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
[Nest] 173550  - 19/11/2026, 8:39:54 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_NO_AUTENTICADO_SSO] Resultado: DENEGADO Actor: ANONIMO
[Nest] 173550  - 19/11/2026, 8:39:54 p.m.    WARN [RolesGuard] Acceso denegado: actor [1053800000] con rol [ESTUDIANTE] intentó acceder a recurso que exige [ADMINISTRATIVO]
[Nest] 173550  - 19/11/2026, 8:39:54 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 1053800000
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403 y 2 eventos en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 3/3 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico) | **Cumple** | **Prueba:** [test/probar-consultar-reportes.ts#L225-L343](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-reportes.ts#L225-L343) (TEST 1) consulta `GET /administracion/reportes` con rol `ADMINISTRATIVO` (`30300300`), verificando respuesta HTTP 200, conteo global `totalPostulaciones: 4` (1 `RECIBIDA`, 1 `EN_REVISION`, 1 `VALIDADA`, 1 `RECHAZADA`) y consolidación de `totalHorasValidadas: 64` (40 + 24 verificadas, ignorando 8 en `REGISTRADA`) para el estudiante `"1053800000"`.<br>**Código:** Endpoint `GET /administracion/reportes` en [src/administracion/reportes.controller.ts#L29-L34](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/reportes.controller.ts#L29-L34) y método `consultarReporteEstadoPracticas` en [src/administracion/reportes.service.ts#L25-L75](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/reportes.service.ts#L25-L75). |
| Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno) | **Cumple** | **Prueba:** [test/probar-consultar-reportes.ts#L348-L370](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-reportes.ts#L348-L370) (TEST 2) consulta `GET /administracion/reportes` sin postulaciones ni horas registradas, verificando HTTP 200 con todos los contadores en 0 y `practicas: []`.<br>**Código:** Inicialización en cero de los contadores en [src/administracion/reportes.service.ts#L28-L33](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/reportes.service.ts#L28-L33). |
| Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-consultar-reportes.ts#L375-L401](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-reportes.ts#L375-L401) (TEST 3) envía solicitud sin token (HTTP 401) y con rol `ESTUDIANTE` (HTTP 403), comprobando bloqueo del 100% y 2 eventos en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')` en [src/administracion/reportes.controller.ts#L19-L31](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/reportes.controller.ts#L19-L31). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple al 100%, materializando exactamente lo descrito en [docs/vistas/03-desarrollo.md](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/docs/vistas/03-desarrollo.md#L20) y [docs/diagramas/03-desarrollo.puml](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/docs/diagramas/03-desarrollo.puml#L34-L35):
  1. **Sin acceso directo a repositorios de otros módulos:** `AdministracionModule` ([src/administracion/administracion.module.ts#L15-L20](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/administracion.module.ts#L15-L20)) no importa `TypeOrmModule.forFeature` ni entidades ajenas; importa únicamente `PostulacionModule`, `HorasModule` y `AuthModule`.
  2. **Comunicación exclusiva mediante servicios exportados:** `ReportesService` ([src/administracion/reportes.service.ts#L17-L21](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/administracion/reportes.service.ts#L17-L21)) inyecta exclusivamente `PostulacionService` y `HorasService` y llama a sus métodos exportados (`listarPostulaciones`, `estaValidada`, `totalHorasValidadas`).
  3. **Grafo de dependencias acíclico (`EAC-02`):** Ningún módulo depende de `AdministracionModule`.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. Es una consulta de solo lectura que refleja los estados reales (`RECIBIDA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`) y horas en estado `VERIFICADA`.
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple (`SsoAuthGuard`, `RolesGuard`, `@Roles('ADMINISTRATIVO')`).
- **Generación síncrona / transaccional si aplica (ADR-005):** Reutiliza la consolidación síncrona `HorasService.totalHorasValidadas(estudianteId)`.
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple.
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-004`, `ADR-006`, `EAC-02`, `EAC-03`, `PA-01`, `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs, nombres del glosario):** Cumple (`ReportePracticasDto`, `ReportesService`, `ReportesController`, `AdministracionModule`).
