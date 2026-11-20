- [x] T-01 Extender enum EstadoActa con el estado SOLICITADA (ADR-002, ADR-005, RN-01)
      Archivos: src/actas/enums/estado-acta.enum.ts
      Escenarios: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico), Rechazo de petición duplicada cuando ya existe una petición en curso o un acta generada (flujo alterno - excepción)
      Depende de: ninguna

- [ ] T-02 Método solicitarActa en ActasService con validación de postulación, horas mínimas, duplicados y auditoría (ADR-001, ADR-003, ADR-005, ADR-006, ADR-007, RN-01, PA-04)
      Archivos: src/actas/actas.service.ts
      Escenarios: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico), Rechazo de petición del acta final cuando la postulación no está validada (excepción), Rechazo de petición del acta final cuando las horas verificadas son insuficientes (excepción), Rechazo de petición duplicada cuando ya existe una petición en curso o un acta generada (flujo alterno - excepción)
      Depende de: T-01

- [ ] T-03 Endpoint POST /actas/solicitar con autenticación SSO y autorización para rol ESTUDIANTE en ActasController (ADR-004, EAC-03)
      Archivos: src/actas/actas.controller.ts
      Escenarios: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico), Bloqueo de petición del acta final sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
      Depende de: T-02

- [ ] T-04 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/011-generar-peticion/validacion.md, test/probar-generar-peticion.ts
      Escenarios: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico), Rechazo de petición del acta final cuando la postulación no está validada (excepción), Rechazo de petición del acta final cuando las horas verificadas son insuficientes (excepción), Rechazo de petición duplicada cuando ya existe una petición en curso o un acta generada (flujo alterno - excepción), Bloqueo de petición del acta final sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
      Depende de: T-03
