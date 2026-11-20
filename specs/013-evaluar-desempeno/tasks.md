- [x] T-01 Error de dominio EvaluacionYaRegistradaError (ADR-006)
      Archivos: src/compartido/errores/dominio.error.ts
      Escenarios: Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción)
      Depende de: ninguna

- [ ] T-02 Entidad Evaluacion (ADR-002, Vista Lógica)
      Archivos: src/evaluacion/entities/evaluacion.entity.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno)
      Depende de: ninguna

- [ ] T-03 DTO RegistrarEvaluacionDto con validación de calificación entre 0.0 y 5.0 y comentarios opcionales
      Archivos: src/evaluacion/dto/registrar-evaluacion.dto.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno), Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción)
      Depende de: ninguna

- [ ] T-04 Servicio EvaluacionService con verificación de evaluación única y consumo del enlace vía EnlaceAccesoService (ADR-001, ADR-004)
      Archivos: src/evaluacion/evaluacion.service.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno), Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción), Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción)
      Depende de: T-01, T-02, T-03

- [ ] T-05 Controlador EvaluacionController con endpoint POST /evaluaciones protegido por SupervisorTokenGuard (ADR-004, EAC-03)
      Archivos: src/evaluacion/evaluacion.controller.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno), Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción), Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción), Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad), Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
      Depende de: T-04

- [ ] T-06 Integración modular en EvaluacionModule y AppModule (ADR-001, ADR-002)
      Archivos: src/evaluacion/evaluacion.module.ts, src/app.module.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno)
      Depende de: T-05

- [ ] T-07 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/013-evaluar-desempeno/validacion.md, test/probar-evaluar-desempeno.ts
      Escenarios: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico), Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno), Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción), Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción), Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad), Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
      Depende de: T-06
