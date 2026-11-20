# Validación de CU-13: Evaluar el desempeño del estudiante en práctica

## Salida de ejecución de la suite de pruebas (`test/probar-evaluar-desempeno.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-13 EVALUAR DESEMPEÑO
====================================================================

TEST 1: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 201, Evaluacion creada para 1053800000 con calificación 4.5, comentarios y enlace marcado como usado)

TEST 2: Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno)
  -> RESULTADO: CUMPLE (HTTP 201, Evaluacion creada para 1053900000 con calificación 4.2 sin comentarios y enlace marcado como usado)

TEST 3: Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción)
  -> RESULTADO: CUMPLE (HTTP 409 Conflict ante segunda evaluación para el mismo estudiante; evaluación original intacta y enlace no consumido)

TEST 4: Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción)
  -> RESULTADO: CUMPLE (HTTP 400 ante calificación < 0.0 o > 5.0, 0 evaluaciones creadas y enlace no consumido)

TEST 5: Esquema del escenario: Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)
[Nest] 159963  - 19/11/2026, 7:58:56 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-eval-inexistente-999
[Nest] 159963  - 19/11/2026, 7:58:56 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-eval-usado-004
[Nest] 159963  - 19/11/2026, 7:58:56 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-eval-vencido-005
  -> RESULTADO: CUMPLE (3/3 ejemplos [inexistente, usado, vencido] bloqueados con HTTP 401 "enlace inválido, usado o vencido" y auditados en < 1 s)

TEST 6: Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
[Nest] 159963  - 19/11/2026, 7:58:56 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_AUSENTE] Resultado: DENEGADO Actor: ANONIMO
  -> RESULTADO: CUMPLE (HTTP 401 sin encabezado enlace-token, 0 evaluaciones creadas y evento ENLACE_SUPERVISOR_AUSENTE registrado en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 6/6 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L283-L315](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L283-L315) (TEST 1) envía `POST /evaluaciones` con `enlace-token: "token-eval-valido-001"`, `calificacion: 4.5` y comentarios; verifica HTTP 201, creación de la `Evaluacion` para `"1053800000"` y consumo del enlace (`usado = true`).<br>**Código:** Endpoint `POST /evaluaciones` en [src/evaluacion/evaluacion.controller.ts#L34-L48](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.controller.ts#L34-L48) y método `registrarEvaluacion` en [src/evaluacion/evaluacion.service.ts#L27-L63](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.service.ts#L27-L63). |
| Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L320-L348](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L320-L348) (TEST 2) envía `POST /evaluaciones` con `calificacion: 4.2` sin comentarios; verifica HTTP 201, `comentarios: null` y enlace marcado como usado.<br>**Código:** Propiedad `@IsOptional() @IsString() comentarios?: string` en [src/evaluacion/dto/registrar-evaluacion.dto.ts#L19-L21](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/dto/registrar-evaluacion.dto.ts#L19-L21) y columna `nullable: true` en [src/evaluacion/entities/evaluacion.entity.ts#L27-L28](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/entities/evaluacion.entity.ts#L27-L28). |
| Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L353-L396](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L353-L396) (TEST 3) intenta registrar una segunda evaluación para `"1053800000"` con un nuevo enlace válido, comprobando rechazo con HTTP 409 Conflict, invariancia de la evaluación original (`4.5`) y no consumo del enlace.<br>**Código:** Verificación en [src/evaluacion/evaluacion.service.ts#L42-L50](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.service.ts#L42-L50) lanzando `EvaluacionYaRegistradaError` (HTTP 409) de [src/compartido/errores/dominio.error.ts#L72-L76](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/errores/dominio.error.ts#L72-L76). |
| Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L401-L438](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L401-L438) (TEST 4) prueba con `calificacion: -0.5` y `calificacion: 5.5`, comprobando HTTP 400, 0 evaluaciones creadas y enlace no consumido.<br>**Código:** Validadores `@Min(0)` y `@Max(5)` en [src/evaluacion/dto/registrar-evaluacion.dto.ts#L14-L17](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/dto/registrar-evaluacion.dto.ts#L14-L17) ejecutados por `ValidationPipe` en [src/evaluacion/evaluacion.controller.ts#L37](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.controller.ts#L37). |
| Esquema del escenario: Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L443-L477](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L443-L477) (TEST 5) recorre los 3 ejemplos (`inexistente`, `usado`, `vencido`), verificando HTTP 401 `"enlace inválido, usado o vencido"`, 0 evaluaciones creadas y 3 registros en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `SupervisorTokenGuard` en [src/compartido/auth/guards/supervisor-token.guard.ts#L35-L45](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/guards/supervisor-token.guard.ts#L35-L45). |
| Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-evaluar-desempeno.ts#L482-L505](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-evaluar-desempeno.ts#L482-L505) (TEST 6) envía `POST /evaluaciones` sin encabezado `enlace-token`, verificando HTTP 401, 0 evaluaciones creadas y evento `ENLACE_SUPERVISOR_AUSENTE` en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** Validación de presencia del encabezado en [src/compartido/auth/guards/supervisor-token.guard.ts#L23-L33](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/guards/supervisor-token.guard.ts#L23-L33). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Sin acoplamiento de repositorios entre módulos:** `EvaluacionModule` ([src/evaluacion/evaluacion.module.ts#L14-L20](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.module.ts#L14-L20)) registra únicamente su entidad `TypeOrmModule.forFeature([Evaluacion])` e importa `AuthModule`. `EvaluacionService` ([src/evaluacion/evaluacion.service.ts#L17-L21](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/evaluacion/evaluacion.service.ts#L17-L21)) solo inyecta `@InjectRepository(Evaluacion)` y consume el servicio exportado `EnlaceAccesoService` para consumir el enlace temporal, sin importar ni inyectar nunca `Repository<EnlaceAcceso>` ni `Repository<RegistroAuditoria>`.
  2. **Estructura interna limpia (`Controller -> Service -> Repository`):** Cumple con la Vista de Desarrollo (`docs/vistas/03-desarrollo.md`) sin capas ni puertos intermedios innecesarios.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. La evaluación requiere la acción explícita del supervisor externo sobre el enlace temporal.
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple. Reutiliza `SupervisorTokenGuard` y `EnlaceAccesoService` de `compartido/auth` para garantizar un único uso por enlace y auditoría del 100% de los rechazos en $< 1\text{ s}$ (`EAC-03`, `PA-04`).
- **Generación síncrona / transaccional si aplica (ADR-005):** No aplica a CU-13 (aplica a CU-07).
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple (`EvaluacionYaRegistradaError` HTTP 409, `BadRequestException` HTTP 400, `UnauthorizedException` HTTP 401).
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-006`, `RN-02`, `EAC-03` y `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario):** Cumple (`Evaluacion`, `EnlaceAcceso`, `RegistroAuditoria`, `RegistrarEvaluacionDto`).
