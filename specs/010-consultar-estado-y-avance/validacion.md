# Validación de CU-10: Consultar el estado de la postulación y el avance de horas

## Salida de ejecución de la suite de pruebas (`test/probar-consultar-estado-y-avance.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-10 ESTADO Y AVANCE DE HORAS
====================================================================

TEST 1: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 200 en ambas consultas: postulación VALIDADA, 40h verificadas, 8h registradas, 48h totales y 2 registros propios)

TEST 2: Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno)
  -> RESULTADO: CUMPLE (HTTP 200 con 0h verificadas, 0h pendientes, 0h totales y lista vacía)

TEST 3: Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad)
  -> RESULTADO: CUMPLE (Extracción de documento desde JWT institucional garantiza aislamiento total respecto a 1053999999)

TEST 4: Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
[Nest] 181586  - 19/11/2026, 8:56:05 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_NO_AUTENTICADO_SSO] Resultado: DENEGADO Actor: ANONIMO
[Nest] 181586  - 19/11/2026, 8:56:05 p.m.    WARN [RolesGuard] Acceso denegado: actor [30300300] con rol [ADMINISTRATIVO] intentó acceder a recurso que exige [ESTUDIANTE]
[Nest] 181586  - 19/11/2026, 8:56:05 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 30300300
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403 y 2 eventos en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico) | **Cumple** | **Prueba:** [test/probar-consultar-estado-y-avance.ts#L317-L347](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-estado-y-avance.ts#L317-L347) (TEST 1) consulta `GET /postulaciones/mi-postulacion` y `GET /horas/mi-avance` con el token SSO del estudiante `"1053800000"`, verificando respuesta HTTP 200 en ambas, estado de postulación `VALIDADA`, `totalHorasVerificadas: 40`, `totalHorasRegistradas: 8`, `totalHorasReportadas: 48` y 2 registros propios.<br>**Código:** Endpoint `GET /postulaciones/mi-postulacion` en [src/postulacion/postulacion.controller.ts#L57-L63](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/postulacion/postulacion.controller.ts#L57-L63), endpoint `GET /horas/mi-avance` en [src/horas/horas.controller.ts#L84-L92](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L84-L92) y método `consultarAvanceEstudiante` en [src/horas/horas.service.ts#L151-L176](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L151-L176). |
| Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno) | **Cumple** | **Prueba:** [test/probar-consultar-estado-y-avance.ts#L352-L371](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-estado-y-avance.ts#L352-L371) (TEST 2) consulta `GET /horas/mi-avance` con el estudiante `"1053900000"` sin registros previos, comprobando HTTP 200 con `totalHorasVerificadas: 0`, `totalHorasRegistradas: 0`, `totalHorasReportadas: 0` y `registros: []`.<br>**Código:** Inicialización en 0 en [src/horas/horas.service.ts#L159-L175](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L159-L175). |
| Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-consultar-estado-y-avance.ts#L376-L403](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-estado-y-avance.ts#L376-L403) (TEST 3) verifica que al consultar `GET /horas/mi-avance` con el token de `"1053800000"` no se expone ningún registro del estudiante `"1053999999"`.<br>**Código:** Extracción de `usuario.documento` desde `@UsuarioActual()` en [src/horas/horas.controller.ts#L88-L91](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L88-L91) y filtro `where: { estudianteId }` en [src/horas/horas.service.ts#L154-L157](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L154-L157). |
| Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-consultar-estado-y-avance.ts#L408-L434](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-consultar-estado-y-avance.ts#L408-L434) (TEST 4) prueba petición sin token (HTTP 401) y con rol `ADMINISTRATIVO` (HTTP 403), comprobando bloqueo del 100% y 2 eventos en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ESTUDIANTE')` en [src/horas/horas.controller.ts#L84-L87](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L84-L87). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Cero acoplamiento entre `PostulacionModule` y `HorasModule`:** Cada módulo responde sobre su propia entidad (`GET /postulaciones/mi-postulacion` en `PostulacionModule` y `GET /horas/mi-avance` en `HorasModule`), preservando intacto el grafo de dependencias de [docs/diagramas/03-desarrollo.puml](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/docs/diagramas/03-desarrollo.puml).
  2. **Estructura interna limpia (`Controller -> Service -> Repository`):** Cumple con la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`) sin capas intermedias innecesarias.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. Es una consulta de solo lectura que muestra por separado las horas `VERIFICADA` y `REGISTRADA`.
- **Control de acceso por roles institucionales y aislamiento del estudiante (ADR-004, RN-02, Vista Lógica):** Cumple (`SsoAuthGuard`, `RolesGuard`, `@Roles('ESTUDIANTE')` y filtrado estricto por `usuario.documento`).
- **Generación síncrona / transaccional si aplica (ADR-005):** No aplica a CU-10.
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple.
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-006`, `RN-02`, `EAC-03`, `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs, nombres del glosario):** Cumple (`AvanceHorasEstudianteDto`, `RegistroHoras`, `EstadoHoras`, `Postulacion`, `EstadoPostulacion`).
