# Mensaje de arranque

Se copia al inicio de cada sesión, en cualquier agente. Una sesión nueva por fase o por tarea: en conversaciones largas el agente olvida lo que leyó al inicio.

```text
Antes de hacer cualquier cosa, lee estos archivos:
1. AGENTS.md
2. docs/arquitectura.md

Resume en tres líneas las reglas que vas a respetar.

Después ejecuta prompts/1-especificar.md para specs/007-generar-acta/ y detente al terminar.
```

Para otra fase o funcionalidad se cambia solo la última línea: el archivo de `prompts/` y la carpeta de `specs/`. El número de la carpeta es el del caso de uso en el catálogo de `docs/drivers.md` (p. ej. CU-09 → `specs/009-postularse/`, CU-02 → `specs/002-revisar-postulacion/`, CU-05 → `specs/005-verificar-horas/`, CU-07 → `specs/007-generar-acta/`, CU-12 → `specs/012-ingresar-horas/`, CU-13 → `specs/013-evaluar-desempeno/`).
