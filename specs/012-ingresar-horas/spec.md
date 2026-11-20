# language: es
# Traza: CU-12, EAC-03, RN-01, RN-02, PA-02, PA-04, ADR-001, ADR-004, ADR-006

Característica: Ingresar horas de práctica de los estudiantes (CU-12)
  Como supervisor de práctica (actor externo de la empresa sin cuenta institucional)
  Quiero ingresar las horas de práctica realizadas por el estudiante mediante un enlace temporal de un solo uso
  Para llevar el seguimiento periódico de sus horas practicadas sin ingresar al ERP institucional (RN-02)

  Escenario: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico)
    Dado que existe un enlace de acceso temporal vigente, no usado y no vencido para el supervisor empresarial asociado al estudiante con documento "1053800000"
    Cuando el supervisor abre el enlace y envía un registro de horas con fecha "2026-04-15", cantidad de horas 8 y descripción "Desarrollo de pruebas e integración de servicios"
    Entonces el sistema crea un nuevo registro de horas para el estudiante "1053800000" con fecha "2026-04-15", 8 horas y la descripción indicada
    Y el registro de horas queda explícitamente en estado "REGISTRADA", sin verificarse automáticamente (RN-01)
    Y el enlace de acceso utilizado queda marcado como usado para que no pueda reutilizarse (ADR-004)
    Y el sistema responde confirmando la creación con código de estado HTTP 201

  Escenario: Registro exitoso de horas sin descripción (flujo alterno)
    Dado que existe un enlace de acceso temporal vigente, no usado y no vencido para el supervisor empresarial asociado al estudiante con documento "1053800000"
    Cuando el supervisor abre el enlace y envía un registro de horas únicamente con fecha "2026-04-16" y cantidad de horas 6, sin incluir descripción
    Entonces el sistema crea un nuevo registro de horas para el estudiante "1053800000" con fecha "2026-04-16" y 6 horas
    Y el registro de horas queda explícitamente en estado "REGISTRADA"
    Y el enlace de acceso utilizado queda marcado como usado para que no pueda reutilizarse (ADR-004)
    Y el sistema responde confirmando la creación con código de estado HTTP 201

  Escenario: Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción)
    Dado que el supervisor empresarial cuenta con un enlace de acceso temporal válido, no usado y no vencido asociado al estudiante "1053800000"
    Cuando el supervisor intenta registrar una cantidad de horas menor o igual a 0, o con un formato de fecha inválido
    Entonces el sistema rechaza la solicitud con código HTTP 400 indicando que los datos de fecha u horas son inválidos
    Y no se crea ningún registro de horas en la base de datos
    Y el enlace de acceso no se consume (permanece como no usado)

  Esquema del escenario: Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)
    Dado que un actor externo intenta ingresar horas en "POST /horas" presentando un token de enlace "<estado_enlace>"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados rechazando la solicitud con código HTTP 401 y el mensaje "enlace inválido, usado o vencido"
    Y no se crea ningún registro de horas en la base de datos
    Y el sistema registra el intento rechazado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)

    Ejemplos:
      | estado_enlace |
      | inexistente   |
      | usado         |
      | vencido       |

  Escenario: Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
    Dado que una solicitud a "POST /horas" se envía sin el encabezado "enlace-token" (por ejemplo, por un estudiante o un usuario anónimo)
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados rechazando la solicitud con código HTTP 401
    Y no se crea ningún registro de horas en la base de datos
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
