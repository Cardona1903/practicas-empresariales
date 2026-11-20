# Validación de CU-03: Asignar tutor al estudiante

## Salida de ejecución de la suite de pruebas (`test/probar-asignar-tutor.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-03 ASIGNAR TUTOR AL ESTUDIANTE
====================================================================

TEST 1: Asignación inicial exitosa de tutor con nombre opcional (flujo básico)
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.     LOG [AuditoriaService] Auditoría [ASIGNACION_TUTOR] Resultado: EXITOSO Actor: 30300300
  -> RESULTADO: CUMPLE (HTTP 201, AsignacionTutor creada para 1053800000 con supervisor@empresa.com, fecha asignadaEn y evento auditado con actor 30300300)

TEST 2: Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.     LOG [AuditoriaService] Auditoría [ASIGNACION_TUTOR] Resultado: EXITOSO Actor: 30300300
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.     LOG [AuditoriaService] Auditoría [ASIGNACION_TUTOR] Resultado: EXITOSO Actor: 30300300
  -> RESULTADO: CUMPLE (HTTP 201, relación estudiante-tutor actualizada a nuevo.tutor@empresa.com y auditada con actor 30300300)

TEST 3: Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción)
  -> RESULTADO: CUMPLE (HTTP 400 ante correo inválido o estudiante vacío y 0 asignaciones creadas)

TEST 4: Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_NO_AUTENTICADO_SSO] Resultado: DENEGADO Actor: ANONIMO
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.    WARN [RolesGuard] Acceso denegado: actor [1053800000] con rol [ESTUDIANTE] intentó acceder a recurso que exige [ADMINISTRATIVO]
[Nest] 170595  - 19/11/2026, 8:30:09 p.m.     LOG [AuditoriaService] Auditoría [ACCESO_ROL_NO_AUTORIZADO] Resultado: DENEGADO Actor: 1053800000
  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, 0 asignaciones creadas y 2 eventos en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Asignación inicial exitosa de tutor con nombre opcional (flujo básico) | **Cumple** | **Prueba:** [test/probar-asignar-tutor.ts#L261-L291](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-asignar-tutor.ts#L261-L291) (TEST 1) envía `POST /asignaciones-tutor` con rol `ADMINISTRATIVO` (`30300300`), `estudianteId: "1053800000"`, `correoSupervisor: "supervisor@empresa.com"` y `nombreSupervisor: "Carlos Gómez"`; verifica HTTP 201, creación de `Supervisor` y `AsignacionTutor` con `asignadaEn` y evento `ASIGNACION_TUTOR` en `RegistroAuditoria`.<br>**Código:** Endpoint `POST /asignaciones-tutor` en [src/asignacion-tutor/asignacion-tutor.controller.ts#L39-L48](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.controller.ts#L39-L48) y método `asignarTutor` en [src/asignacion-tutor/asignacion-tutor.service.ts#L28-L88](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.service.ts#L28-L88). |
| Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno) | **Cumple** | **Prueba:** [test/probar-asignar-tutor.ts#L296-L337](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-asignar-tutor.ts#L296-L337) (TEST 2) asigna primero `anterior@empresa.com` y luego `nuevo.tutor@empresa.com` al estudiante `"1053800000"`, comprobando HTTP 201, actualización de la relación existente sin duplicados y registro en `RegistroAuditoria`.<br>**Código:** Actualización de la entidad `AsignacionTutor` existente en [src/asignacion-tutor/asignacion-tutor.service.ts#L60-L74](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.service.ts#L60-L74). |
| Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción) | **Cumple** | **Prueba:** [test/probar-asignar-tutor.ts#L342-L375](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-asignar-tutor.ts#L342-L375) (TEST 3) envía `correoSupervisor: "correo-sin-arroba"` y `estudianteId: ""`, verificando rechazo con HTTP 400 y 0 asignaciones creadas.<br>**Código:** Validadores `@IsNotEmpty()` y `@IsEmail()` en [src/asignacion-tutor/dto/asignar-tutor.dto.ts#L12-L20](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/dto/asignar-tutor.dto.ts#L12-L20) junto con `ValidationPipe` en [src/asignacion-tutor/asignacion-tutor.controller.ts#L42](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.controller.ts#L42). |
| Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-asignar-tutor.ts#L380-L418](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-asignar-tutor.ts#L380-L418) (TEST 4) prueba petición sin token (HTTP 401) y con rol `ESTUDIANTE` (HTTP 403), verificando bloqueo del 100%, 0 asignaciones creadas y 2 registros en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** `@UseGuards(SsoAuthGuard, RolesGuard)` y `@Roles('ADMINISTRATIVO')` en [src/asignacion-tutor/asignacion-tutor.controller.ts#L28-L40](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.controller.ts#L28-L40). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Sin acoplamiento de repositorios entre módulos:** `AsignacionTutorModule` ([src/asignacion-tutor/asignacion-tutor.module.ts#L17-L26](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.module.ts#L17-L26)) registra únicamente sus propias entidades `TypeOrmModule.forFeature([Supervisor, AsignacionTutor])` e importa `AuthModule` y `AuditoriaModule`, coincidiendo exactamente con la Vista de Desarrollo (`docs/vistas/03-desarrollo.md` y `docs/diagramas/03-desarrollo.puml`). `AsignacionTutorService` ([src/asignacion-tutor/asignacion-tutor.service.ts#L16-L22](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/asignacion-tutor/asignacion-tutor.service.ts#L16-L22)) solo inyecta `@InjectRepository(Supervisor)`, `@InjectRepository(AsignacionTutor)` y el servicio exportado `AuditoriaService`, sin importar jamás repositorios de otros módulos.
  2. **Estructura interna limpia (`Controller -> Service -> Repository`):** Cumple sin capas ni puertos intermedios innecesarios.
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. La asignación o actualización del tutor se ejecuta solo bajo acción explícita de un administrativo autenticado.
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple (`SsoAuthGuard`, `RolesGuard`, `@Roles('ADMINISTRATIVO')`).
- **Generación síncrona / transaccional si aplica (ADR-005):** No aplica a CU-03 (aplica a CU-07).
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple (`BadRequestException` 400, `UnauthorizedException` 401, `ForbiddenException` 403).
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-006`, `PA-01`, `PA-04`, `EAC-03`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario):** Cumple (`Supervisor`, `AsignacionTutor`, `RegistroAuditoria`, `AsignarTutorDto`).
