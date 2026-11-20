# Validación de CU-12: Ingresar horas de práctica de los estudiantes

## Salida de ejecución de la suite de pruebas (`test/probar-ingresar-horas.ts`)

```text
====================================================================
 EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-12 INGRESAR HORAS DE PRÁCTICA
====================================================================

TEST 1: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico)
  -> RESULTADO: CUMPLE (HTTP 201, RegistroHoras creado para 1053800000 con 8h, descripción, estado REGISTRADA y enlace marcado como usado)

TEST 2: Registro exitoso de horas sin descripción (flujo alterno)
  -> RESULTADO: CUMPLE (HTTP 201, RegistroHoras creado para 1053800000 con 6h sin descripción, estado REGISTRADA y enlace marcado como usado)

TEST 3: Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción)
  -> RESULTADO: CUMPLE (HTTP 400 ante horas <= 0 o fecha inválida, 0 registros creados y el enlace permanece como no usado)

TEST 4: Esquema del escenario: Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)
[Nest] 146465  - 19/11/2026, 7:19:03 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-que-no-existe-999
[Nest] 146465  - 19/11/2026, 7:19:03 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-usado-003
[Nest] 146465  - 19/11/2026, 7:19:03 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_RECHAZADO] Resultado: DENEGADO Actor: token-vencido-004
  -> RESULTADO: CUMPLE (3/3 ejemplos [inexistente, usado, vencido] bloqueados con HTTP 401 "enlace inválido, usado o vencido" y auditados en < 1 s)

TEST 5: Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
[Nest] 146465  - 19/11/2026, 7:19:03 p.m.     LOG [AuditoriaService] Auditoría [ENLACE_SUPERVISOR_AUSENTE] Resultado: DENEGADO Actor: ANONIMO
  -> RESULTADO: CUMPLE (HTTP 401 sin encabezado enlace-token, 0 registros creados y evento ENLACE_SUPERVISOR_AUSENTE registrado en RegistroAuditoria en < 1 s)

====================================================================
 RESUMEN DE PRUEBAS: 5/5 ESCENARIOS CUMPLIDOS (100%)
====================================================================
```

---

## Validación funcional

| Escenario | Resultado (Cumple o No cumple) | Evidencia |
|---|:---:|---|
| Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico) | **Cumple** | **Prueba:** [test/probar-ingresar-horas.ts#L276-L315](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-ingresar-horas.ts#L276-L315) (TEST 1) envía `POST /horas` con `enlace-token: "token-valido-001"`, `fecha: "2026-04-15"`, `horas: 8` y `descripcion: "Desarrollo de pruebas e integración de servicios"`; comprueba respuesta HTTP 201, creación del `RegistroHoras` para `"1053800000"` en estado `REGISTRADA` (`RN-01`) y actualización del enlace a `usado = true` (`ADR-004`).<br>**Código:** Endpoint `POST /horas` en [src/horas/horas.controller.ts#L34-L48](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L34-L48), creación y consumo del enlace en [src/horas/horas.service.ts#L27-L55](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L27-L55) y [src/compartido/auth/enlace-acceso.service.ts#L49-L60](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/enlace-acceso.service.ts#L49-L60). |
| Registro exitoso de horas sin descripción (flujo alterno) | **Cumple** | **Prueba:** [test/probar-ingresar-horas.ts#L320-L347](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-ingresar-horas.ts#L320-L347) (TEST 2) envía `POST /horas` con `fecha: "2026-04-16"` y `horas: 6` sin descripción; verifica HTTP 201, `descripcion: null`, estado `REGISTRADA` y enlace marcado como usado.<br>**Código:** Propiedad opcional `@IsOptional() @IsString() descripcion?: string` en [src/horas/dto/registrar-horas.dto.ts#L25-L27](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/dto/registrar-horas.dto.ts#L25-L27) y columna `nullable: true` en [src/horas/entities/registro-horas.entity.ts#L31-L32](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/entities/registro-horas.entity.ts#L31-L32). |
| Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción) | **Cumple** | **Prueba:** [test/probar-ingresar-horas.ts#L352-L409](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-ingresar-horas.ts#L352-L409) (TEST 3) intenta registrar con `horas: 0`, `horas: -4` y `fecha: "fecha-no-valida"`, verificando que todos responden HTTP 400, no se crea ningún `RegistroHoras` y el `EnlaceAcceso` conserva `usado = false`.<br>**Código:** Validadores `@IsDateString()` y `@IsPositive()` en [src/horas/dto/registrar-horas.dto.ts#L16-L23](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/dto/registrar-horas.dto.ts#L16-L23) ejecutados por `ValidationPipe` en [src/horas/horas.controller.ts#L37](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.controller.ts#L37) antes de invocar al servicio. |
| Esquema del escenario: Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-ingresar-horas.ts#L414-L465](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-ingresar-horas.ts#L414-L465) (TEST 4) recorre los 3 ejemplos (`inexistente`, `usado`, `vencido`), verificando HTTP 401 con el mensaje `"enlace inválido, usado o vencido"`, 0 registros de horas creados y 3 eventos persistidos en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** Verificación en [src/compartido/auth/enlace-acceso.service.ts#L22-L44](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/enlace-acceso.service.ts#L22-L44) y bloqueo con auditoría en [src/compartido/auth/guards/supervisor-token.guard.ts#L35-L45](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/guards/supervisor-token.guard.ts#L35-L45). |
| Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad) | **Cumple** | **Prueba:** [test/probar-ingresar-horas.ts#L470-L497](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/test/probar-ingresar-horas.ts#L470-L497) (TEST 5) envía `POST /horas` sin encabezado `enlace-token`, verificando HTTP 401, 0 registros de horas y evento `ENLACE_SUPERVISOR_AUSENTE` en `RegistroAuditoria` en $< 1\text{ s}$.<br>**Código:** Validación de presencia del encabezado `enlace-token` y registro en auditoría en [src/compartido/auth/guards/supervisor-token.guard.ts#L23-L33](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/guards/supervisor-token.guard.ts#L23-L33). |

---

## Validación arquitectónica

- **Regla estricta de modularidad / regla de dependencia (ADR-001):** Cumple.
  1. **Sin acoplamiento de repositorios entre módulos:** `HorasModule` ([src/horas/horas.module.ts#L14-L20](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.module.ts#L14-L20)) registra únicamente su propia entidad `TypeOrmModule.forFeature([RegistroHoras])` e importa `AuthModule`. `HorasService` ([src/horas/horas.service.ts#L16-L20](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L16-L20)) solo inyecta `@InjectRepository(RegistroHoras)` y se comunica con el módulo de autenticación exclusivamente mediante el servicio exportado `EnlaceAccesoService`, sin importar ni inyectar jamás `Repository<EnlaceAcceso>` ni `Repository<RegistroAuditoria>`.
  2. **Dirección limpia de dependencias dentro del módulo (`Controller -> Service -> Repository/Entity`):** `HorasController` depende de `HorasService`, y `HorasService` depende de `Repository<RegistroHoras>`, sin capas intermedias ficticias (`docs/vistas/03-desarrollo.md`).
- **Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01):** Cumple. Cada registro de horas creado en CU-12 queda fijado en `EstadoHoras.REGISTRADA` ([src/horas/horas.service.ts#L46](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/horas/horas.service.ts#L46)), sin ninguna verificación ni transición automática a `VERIFICADA` (`RN-01`).
- **Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02):** Cumple. El supervisor externo opera sin cuenta institucional mediante `EnlaceAcceso` validado en `SupervisorTokenGuard` ([src/compartido/auth/guards/supervisor-token.guard.ts](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/guards/supervisor-token.guard.ts)) y consumido tras un único uso exitoso en `EnlaceAccesoService.consumirEnlace` ([src/compartido/auth/enlace-acceso.service.ts#L49-L60](file:///home/jacobo-arroyave/Universidad/arquitectura-software/trabajo-final/practicas-empresariales/src/compartido/auth/enlace-acceso.service.ts#L49-L60)).
- **Generación síncrona / transaccional si aplica (ADR-005):** No aplica directamente a la generación del PDF en CU-12 (aplica en CU-07), aunque los registros `REGISTRADA` alimentan la posterior verificación en CU-05 y consolidación en CU-07.
- **Manejo de excepciones tipadas con DominioError y filtro global (ADR-006):** Cumple. Las excepciones de autorización (`UnauthorizedException` 401) y validación (`BadRequestException` 400) se integran con `HttpExceptionFilter`.
- **Cada ADR citado en el plan se ve reflejado en el código:** Cumple (`ADR-001`, `ADR-002`, `ADR-004`, `ADR-006`, además de `RN-01`, `RN-02`, `EAC-03` y `PA-04`).
- **Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario):** Cumple. Uso de `RegistrarHorasDto` con decoradores `class-validator` y nombres exactos del glosario (`RegistroHoras`, `EstadoHoras`, `EnlaceAcceso`, `RegistroAuditoria`).
