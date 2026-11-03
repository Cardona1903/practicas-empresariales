# Backend - Sistema de Gestion de Practicas Empresariales

Monolito modular en NestJS + TypeScript + PostgreSQL, construido siguiendo
las 7 decisiones registradas en `docs/adr/`. Este README explica como el
codigo de `src/` implementa cada ADR, no repite su contenido completo.

## Como correr

```
npm install
cp .env.example .env   # completar con las credenciales reales (RT-01)
npm run start:dev
```

Necesita una base PostgreSQL accesible (RT-01, ADR-002). No se incluyen
migraciones todavia: es el siguiente paso una vez se valide el modelo de
datos con el equipo.

## Modulos de negocio y su driver principal (ADR-001, PA-01)

| Modulo | Carpeta | Casos de uso que resuelve | Se conecta con |
|---|---|---|---|
| Postulacion | `src/postulacion/` | CU-02, CU-09 | Configuracion (ADR-007), Auth (ADR-004) |
| Asignacion de tutor | `src/asignacion-tutor/` | CU-03 (no primario, pero necesario) | - |
| Horas | `src/horas/` | CU-05, CU-12 | Auth (ADR-004, token de supervisor) |
| Evaluacion | `src/evaluacion/` | CU-13 | Auth (ADR-004) |
| Actas | `src/actas/` | CU-07 | Postulacion y Horas, **solo via sus servicios exportados** |
| Administracion | `src/administracion/` | CU-08 (reportes) | Postulacion y Horas, solo via servicios exportados |

**Regla de ADR-001 que se respeta en el codigo:** ningun modulo importa el
`Repository<T>` de otro modulo. Si `actas` necesita datos de `horas`,
inyecta `HorasService` (que `horas.module.ts` exporta explicitamente) y
llama a su metodo publico `totalHorasValidadas(...)`. Nunca accede a la
tabla `registro_horas` directamente. Esto es lo que permite que, segun
EAC-02, se pueda modificar un modulo sin romper los demas.

## `src/compartido/` (transversal, no es un modulo de negocio)

- **`auth/`** implementa ADR-004: `SsoAuthGuard` valida el JWT institucional
  (estudiantes/administrativos) y `SupervisorTokenGuard` valida el enlace de
  un solo uso con vencimiento para los supervisores (RN-02). `RolesGuard` +
  `@Roles(...)` aplican el control de acceso que pide EAC-03.
- **`errores/`** implementa ADR-006: un `HttpExceptionFilter` global que
  normaliza cualquier error a una respuesta consistente, y una clase
  `DominioError` para errores de negocio (p. ej. transicion de estado
  invalida en Postulacion). No hay reintentos automaticos (coherente con
  RN-01): si `POST /actas/:id/generar` falla, el acta queda en estado
  `FALLIDA` y un administrativo debe volver a llamar al mismo endpoint.
- **`configuracion/`** implementa ADR-007: los requisitos de postulacion y
  las horas minimas por programa academico se leen de la tabla
  `requisito_programa`, no de codigo. `PostulacionService` llama a
  `ConfiguracionService.obtenerVigente(programa)` antes de aceptar una
  postulacion (CU-09).

## Decisiones que todavia no estan en el codigo

- **ADR-002 (PostgreSQL institucional):** la conexion esta parametrizada en
  `src/config/database.config.ts` via variables de entorno; falta que TI
  entregue las credenciales reales y correr las migraciones.
- **Diagramas y el resto de `docs/arquitectura.md`:** pendientes, se arman
  en una siguiente sesion.
