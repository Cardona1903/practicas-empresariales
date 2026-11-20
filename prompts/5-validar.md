# Fase 5: Validar

Entrada: `AGENTS.md`, `docs/arquitectura.md`, `spec.md`, `plan.md`, `tasks.md` y el código de `src/`.

Genera un archivo de código con las pruebas ejecutables (por ejemplo `test/probar-<nombre-cu>.ts`) que instancie los servicios o componentes necesarios, ejecute cada uno de los escenarios definidos en `spec.md` e imprima por consola el resultado de cada prueba.

Produce `validacion.md` con:

```text
## Validación funcional
| Escenario | Resultado (Cumple o No cumple) | Evidencia |

## Validación arquitectónica
- Regla estricta de modularidad (ADR-001): ningún módulo importa ni inyecta el Repository de otro módulo (solo servicios exportados).
- Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01).
- Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02).
- Generación síncrona / transaccional si aplica (ADR-005).
- Manejo de excepciones tipadas con DominioError y filtro global (ADR-006).
- Cada ADR citado en el plan se ve reflejado en el código.
- Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario).
```

Reglas:
- Ejecutar el archivo de prueba generado y registrar su salida real de ejecución en `validacion.md`.
- Un resultado por cada escenario de `spec.md`, con evidencia concreta (salida de ejecución del archivo de prueba, archivo y número de línea).
- No dar un escenario por cumplido sin evidencia verificable.
- Si algo no coincide o falla, informarlo claramente; no corregirlo en esta fase.
- Al terminar, detenerse: la persona verifica la evidencia.


# Fase 5: Validar

Entrada: `AGENTS.md`, `docs/arquitectura.md`, `spec.md`, `plan.md`, `tasks.md` y el código de `src/`.

Genera un script de ejecución (por ejemplo `test/probar-<nombre-cu>.ts`) que valide el caso de uso **escenario por escenario según `spec.md`**, no tarea por tarea:
- NO construir una suite de pruebas unitarias sobre las tareas técnicas de `tasks.md`.
- El script debe instanciar los componentes necesarios y reproducir uno a uno los **escenarios descritos en `spec.md`** (el flujo básico, cada flujo alterno o excepción, y el EAC con su medida cuantitativa).
- Por cada escenario, el script ejecuta la acción con datos concretos e imprime en consola el resultado obtenido (código HTTP, estado resultante, mensaje de error o tiempo de respuesta).

Produce `validacion.md` con:

```text
## Validación funcional
| Escenario | Resultado (Cumple o No cumple) | Evidencia |

## Validación arquitectónica
- Regla estricta de modularidad (ADR-001): ningún módulo importa ni inyecta el Repository de otro módulo (solo servicios exportados).
- Máquina de estados explícita y transiciones manuales humanas (ADR-003, RN-01).
- Control de acceso por roles institucionales y enlaces de un solo uso para supervisores (ADR-004, RN-02).
- Generación síncrona / transaccional si aplica (ADR-005).
- Manejo de excepciones tipadas con DominioError y filtro global (ADR-006).
- Cada ADR citado en el plan se ve reflejado en el código.
- Se cumplen las convenciones de AGENTS.md (NestJS 10, TypeScript, DTOs con class-validator, nombres del glosario).
```

Reglas:
- La validación se hace **escenario por escenario de `spec.md`**, con evidencia: ejecutar el script de prueba y registrar la salida real de consola de cada escenario en la tabla funcional.
- No evaluar tareas técnicas individuales de `tasks.md`; el foco exclusivo son los comportamientos observables y medibles definidos en los escenarios de `spec.md`.
- Un resultado por cada escenario de `spec.md`, con evidencia concreta (salida de ejecución del script, archivo y número de línea).
- No dar un escenario por cumplido sin evidencia verificable.
- Si algo no coincide o falla, informarlo claramente; no corregirlo en esta fase.
- Al terminar, detenerse: la persona verifica la evidencia.