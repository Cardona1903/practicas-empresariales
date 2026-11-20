# Fase 3: Descomponer

Entrada: `AGENTS.md`, `docs/arquitectura.md`, `spec.md` y `plan.md` de la funcionalidad indicada.

Produce `tasks.md` con este formato:

```text
- [ ] T-NN Título corto
      Archivos: rutas que se crean o cambian en src/
      Escenarios: los de spec.md que atiende
      Depende de: T-NN o "ninguna"
```

Reglas:
- Cada tarea toca una sola clase, archivo o unidad atómica de cambio.
- Orden de construcción recomendado para NestJS:
  1. Entidades, enums de máquina de estados y constantes (`*.entity.ts`).
  2. DTOs de entrada y salida con validaciones de `class-validator` (`dto/*.dto.ts`).
  3. Lógica del caso de uso y reglas de negocio en el servicio (`*.service.ts`).
  4. Endpoints, decoradores de roles y guards en el controlador (`*.controller.ts`).
  5. Registro de dependencias y exportación de servicios en el módulo NestJS (`*.module.ts`).
- Cada escenario de `spec.md` debe aparecer cubierto en al menos una tarea.
- Incluir una tarea final de validación que produce `validacion.md`.
- No escribir código en esta fase.
- Al terminar, detenerse y esperar revisión de la persona.
