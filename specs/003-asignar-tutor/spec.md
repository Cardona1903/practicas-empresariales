# language: es
# Traza: CU-03, EAC-03, RN-01, PA-01, PA-04, ADR-001, ADR-002, ADR-004, ADR-006

Característica: Asignar tutor al estudiante (CU-03)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero asignar o actualizar el supervisor/tutor empresarial asociado a un estudiante
  Para formalizar el vínculo entre el estudiante y su supervisor durante la práctica empresarial

  Escenario: Asignación inicial exitosa de tutor con nombre opcional (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que el estudiante con documento "1053800000" aún no tiene un tutor asignado
    Cuando el administrativo envía la solicitud a "POST /asignaciones-tutor" con estudianteId "1053800000", correoSupervisor "supervisor@empresa.com" y nombreSupervisor "Carlos Gómez"
    Entonces el sistema registra al supervisor con correo "supervisor@empresa.com" y crea la asignación de tutor para el estudiante "1053800000" con su fecha de asignación
    Y el sistema registra el evento de asignación en la bitácora de auditoría con el actor "30300300" (PA-04)
    Y el sistema responde confirmando la asignación con código de estado HTTP 201

  Escenario: Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que el estudiante con documento "1053800000" ya tiene asignado al supervisor con correo "anterior@empresa.com"
    Cuando el administrativo envía una nueva asignación en "POST /asignaciones-tutor" para el estudiante "1053800000" con correoSupervisor "nuevo.tutor@empresa.com" sin incluir nombreSupervisor
    Entonces el sistema actualiza la relación de asignación de tutor del estudiante "1053800000" asociándolo al supervisor con correo "nuevo.tutor@empresa.com"
    Y el sistema registra la actualización en la bitácora de auditoría con el actor "30300300" (PA-04)
    Y el sistema responde confirmando la asignación con código de estado HTTP 201

  Escenario: Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Cuando el administrativo envía una solicitud a "POST /asignaciones-tutor" con un correo inválido "correo-sin-arroba" o sin documento del estudiante
    Entonces el sistema rechaza la solicitud con código HTTP 400 indicando que los datos de entrada son inválidos
    Y no se registra ni modifica ninguna asignación en la base de datos

  Escenario: Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta asignar un tutor en "POST /asignaciones-tutor"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y no se crea ni modifica ninguna asignación de tutor
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
