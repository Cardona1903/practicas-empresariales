# Fase 2: Planear

Entrada: `AGENTS.md`, `docs/arquitectura.md`, `docs/vistas/03-desarrollo.md`, `README-backend.md` y el `spec.md` de la funcionalidad indicada.

Produce `plan.md` con estas secciones:

```text
# Plan: NNN <nombre>
## Decisiones que aplican   (ADR y vistas, con su ID)
## Componentes              (rutas de archivos en src/ según vistas/03-desarrollo.md y README-backend.md)
## Flujo                    (diagrama de secuencia de diagramas/secuencias/)
## Fuera de alcance
```

Reglas:
- Si `spec.md` todavía tiene marcas `[NECESITA ACLARACIÓN]`, no planear: avisar y detenerse.
- El plan no rehace la arquitectura: la aterriza en la funcionalidad respetando la estructura del monolito modular en NestJS (ADR-001) y el modelo de datos en PostgreSQL/TypeORM (ADR-002).
- No inventar componentes ni capas intermedias que no estén en las vistas: cada módulo consta de `Controller` (HTTP), `Service` (caso de uso y lógica) y acceso directo a su entidad mediante `@InjectRepository`, sin interfaces de puerto intermedias (Vista de desarrollo).
- Si el plan necesita comunicarse con otro módulo de negocio, hacerlo exclusivamente mediante el servicio exportado de ese módulo (`*Service`), nunca importando sus entidades ni repositorios directamente (ADR-001).
- Si el plan necesita una decisión arquitectónica que no existe en los ADRs, detenerse: primero se escribe el ADR.
- Al terminar, detenerse y esperar revisión de la persona.
