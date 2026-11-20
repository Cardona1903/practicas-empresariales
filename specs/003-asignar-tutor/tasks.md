- [x] T-01 Entidades Supervisor y AsignacionTutor (ADR-002, Vista Lógica)
      Archivos: src/asignacion-tutor/entities/supervisor.entity.ts, src/asignacion-tutor/entities/asignacion-tutor.entity.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)
      Depende de: ninguna

- [x] T-02 DTO AsignarTutorDto con validaciones de estudianteId, correoSupervisor y nombreSupervisor opcional
      Archivos: src/asignacion-tutor/dto/asignar-tutor.dto.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno), Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción)
      Depende de: ninguna

- [ ] T-03 Servicio AsignacionTutorService para asignación, actualización de relación estudiante-tutor y auditoría (ADR-001, PA-04)
      Archivos: src/asignacion-tutor/asignacion-tutor.service.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)
      Depende de: T-01, T-02

- [ ] T-04 Controlador AsignacionTutorController con endpoint POST /asignaciones-tutor y RBAC administrativo (ADR-004, EAC-03)
      Archivos: src/asignacion-tutor/asignacion-tutor.controller.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno), Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción), Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-03

- [ ] T-05 Integración modular en AsignacionTutorModule y AppModule (ADR-001, ADR-002)
      Archivos: src/asignacion-tutor/asignacion-tutor.module.ts, src/app.module.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)
      Depende de: T-04

- [ ] T-06 Validación de escenarios en validacion.md y script ejecutable de prueba
      Archivos: specs/003-asignar-tutor/validacion.md, test/probar-asignar-tutor.ts
      Escenarios: Asignación inicial exitosa de tutor con nombre opcional (flujo básico), Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno), Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción), Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
      Depende de: T-05
