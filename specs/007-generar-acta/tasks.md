- [x] T-01 Errores de dominio para la expedición y validación de actas (ADR-006)
      Archivos: src/compartido/errores/dominio.error.ts
      Escenarios: Intento de generación de acta cuando la postulación no está validada (excepción), Intento de generación de acta con horas verificadas insuficientes (excepción), Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno), Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia)
      Depende de: ninguna

- [x] T-02 Método totalHorasValidadas en HorasService para consolidación de horas de práctica (ADR-001, ADR-005)
      Archivos: src/horas/horas.service.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Intento de generación de acta con horas verificadas insuficientes (excepción), Eficiencia de desempeño en la expedición síncrona del acta bajo carga concurrente (EAC-01 - Desempeño)
      Depende de: ninguna

- [x] T-03 Enum EstadoActa y entidad TypeORM Acta para almacenamiento en PostgreSQL (ADR-002, ADR-005, ADR-006)
      Archivos: src/actas/enums/estado-acta.enum.ts, src/actas/entities/acta.entity.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno), Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia)
      Depende de: ninguna

- [x] T-04 DTO GenerarActaDto con validación de estudianteId
      Archivos: src/actas/dto/generar-acta.dto.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico)
      Depende de: ninguna

- [x] T-05 Servicio ActasService con orquestación modular, renderizado en memoria PDFKit, almacenamiento local y persistencia transaccional (ADR-001, ADR-003, ADR-005, ADR-006, ADR-007, PA-04, EAC-01)
      Archivos: src/actas/actas.service.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Intento de generación de acta cuando la postulación no está validada (excepción), Intento de generación de acta con horas verificadas insuficientes (excepción), Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno), Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia), Eficiencia de desempeño en la expedición síncrona del acta bajo carga concurrente (EAC-01 - Desempeño)
      Depende de: T-01, T-02, T-03, T-04

- [x] T-06 Controlador ActasController con endpoint POST /actas y RBAC administrativo (ADR-004, EAC-03)
      Archivos: src/actas/actas.controller.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Bloqueo de generación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-05

- [x] T-07 Integración modular en ActasModule y registro en AppModule (ADR-001, ADR-002)
      Archivos: src/actas/actas.module.ts, src/app.module.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Bloqueo de generación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-06

- [x] T-08 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/007-generar-acta/validacion.md, test/probar-generar-acta.ts
      Escenarios: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico), Intento de generación de acta cuando la postulación no está validada (excepción), Intento de generación de acta con horas verificadas insuficientes (excepción), Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno), Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia), Eficiencia de desempeño en la expedición síncrona del acta bajo carga concurrente (EAC-01 - Desempeño), Bloqueo de generación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-07
