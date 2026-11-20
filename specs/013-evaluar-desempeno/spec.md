# language: es
# Traza: CU-13, EAC-03, RN-02, PA-02, PA-04, ADR-001, ADR-004, ADR-006

Característica: Evaluar el desempeño del estudiante en práctica (CU-13)
  Como supervisor de práctica (actor externo de la empresa sin cuenta institucional)
  Quiero registrar la calificación y los comentarios opcionales de evaluación de desempeño del estudiante mediante un enlace temporal de un solo uso
  Para dejar constancia formal de su desempeño empresarial sin ingresar al ERP institucional (RN-02)

  Escenario: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico)
    Dado que existe un enlace de acceso temporal vigente, no usado y no vencido para el supervisor empresarial asociado al estudiante con documento "1053800000"
    Y que el estudiante "1053800000" aún no tiene una evaluación de desempeño registrada
    Cuando el supervisor abre el enlace y envía la evaluación en "POST /evaluaciones" con calificación 4.5 y comentarios "Excelente desempeño técnico, compromiso y trabajo en equipo"
    Entonces el sistema crea la evaluación de desempeño asociada al estudiante "1053800000" con calificación 4.5 y los comentarios indicados
    Y el enlace de acceso utilizado queda marcado como usado para que no pueda reutilizarse (ADR-004)
    Y el sistema responde confirmando la creación con código de estado HTTP 201

  Escenario: Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno)
    Dado que existe un enlace de acceso temporal vigente, no usado y no vencido para el supervisor empresarial asociado al estudiante con documento "1053900000"
    Y que el estudiante "1053900000" aún no tiene una evaluación de desempeño registrada
    Cuando el supervisor abre el enlace y envía la evaluación en "POST /evaluaciones" únicamente con calificación 4.2, sin incluir comentarios
    Entonces el sistema crea la evaluación de desempeño asociada al estudiante "1053900000" con calificación 4.2
    Y el enlace de acceso utilizado queda marcado como usado para que no pueda reutilizarse (ADR-004)
    Y el sistema responde confirmando la creación con código de estado HTTP 201

  Escenario: Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción)
    Dado que el estudiante con documento "1053800000" ya tiene una evaluación de desempeño registrada
    Y que el supervisor empresarial utiliza un nuevo enlace de acceso temporal válido, no usado y no vencido asociado al estudiante "1053800000"
    Cuando el supervisor intenta registrar una segunda evaluación para el mismo estudiante en "POST /evaluaciones"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que el estudiante ya tiene una evaluación de desempeño registrada
    Y no se modifica la evaluación existente
    Y el enlace de acceso no se consume (permanece como no usado)

  Escenario: Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción)
    Dado que el supervisor empresarial cuenta con un enlace de acceso temporal válido, no usado y no vencido asociado al estudiante "1053800000"
    Cuando el supervisor intenta registrar una calificación menor a 0.0 o mayor a 5.0
    Entonces el sistema rechaza la solicitud con código HTTP 400 indicando que la calificación debe estar entre 0.0 y 5.0
    Y no se crea ninguna evaluación en la base de datos
    Y el enlace de acceso no se consume (permanece como no usado)

  Esquema del escenario: Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)
    Dado que un actor externo intenta registrar una evaluación en "POST /evaluaciones" presentando un token de enlace "<estado_enlace>"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados rechazando la solicitud con código HTTP 401 y el mensaje "enlace inválido, usado o vencido"
    Y no se crea ninguna evaluación en la base de datos
    Y el sistema registra el intento rechazado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)

    Ejemplos:
      | estado_enlace |
      | inexistente   |
      | usado         |
      | vencido       |

  Escenario: Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)
    Dado que una solicitud a "POST /evaluaciones" se envía sin el encabezado "enlace-token"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados rechazando la solicitud con código HTTP 401
    Y no se crea ninguna evaluación en la base de datos
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
