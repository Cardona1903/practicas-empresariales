# language: es
# Traza: CU-02, EAC-03, RN-01, PA-04, ADR-001, ADR-003, ADR-004, ADR-006

Característica: Revisar y validar la postulación del estudiante (CU-02)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero revisar cada postulación radicada y decidir explícitamente si la valido o la rechazo
  Para que solo las postulaciones aprobadas por una persona continúen el proceso de práctica (RN-01)

  Escenario: Tomar en revisión una postulación recibida (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que existe la postulación del estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" en estado "RECIBIDA"
    Cuando el administrativo solicita cambiar el estado de esa postulación a "EN_REVISION"
    Entonces la postulación queda en estado "EN_REVISION"
    Y el sistema responde confirmando la actualización con código de estado HTTP 200
    Y ninguna otra postulación cambia de estado

  Escenario: Validar una postulación en revisión (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que la postulación del estudiante con documento "1053800000" está en estado "EN_REVISION"
    Cuando el administrativo decide validarla y solicita cambiar su estado a "VALIDADA"
    Entonces la postulación queda en estado "VALIDADA"
    Y el sistema responde confirmando la actualización con código de estado HTTP 200
    Y la postulación no pasa a ningún otro estado sin una nueva acción humana explícita (RN-01, ADR-003)

  Escenario: Rechazar una postulación en revisión (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que la postulación del estudiante con documento "1053800000" está en estado "EN_REVISION"
    Cuando el administrativo decide rechazarla, solicita cambiar su estado a "RECHAZADA" y escribe el motivo "La carta de presentación no está firmada por la empresa"
    Entonces la postulación queda en estado "RECHAZADA"
    Y el motivo "La carta de presentación no está firmada por la empresa" queda guardado en la postulación
    Y el sistema responde confirmando la actualización con código de estado HTTP 200

  Escenario: Rechazo sin motivo (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que la postulación del estudiante con documento "1053800000" está en estado "EN_REVISION"
    Cuando el administrativo solicita cambiar su estado a "RECHAZADA" sin escribir un motivo
    Entonces el sistema rechaza la solicitud con código HTTP 400 indicando que el motivo del rechazo es obligatorio
    Y la postulación conserva el estado "EN_REVISION"

  Esquema del escenario: Transición de estado no permitida (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existe una postulación en estado "<estado_actual>"
    Cuando el administrativo solicita cambiar su estado a "<estado_solicitado>"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que la transición de estado es inválida
    Y la postulación conserva el estado "<estado_actual>"

    Ejemplos:
      | estado_actual | estado_solicitado |
      | RECIBIDA      | VALIDADA          |
      | RECIBIDA      | RECHAZADA         |
      | EN_REVISION   | RECIBIDA          |
      | VALIDADA      | RECHAZADA         |
      | VALIDADA      | EN_REVISION       |
      | RECHAZADA     | VALIDADA          |
      | RECHAZADA     | EN_REVISION       |

  Escenario: Estado solicitado que no pertenece a la máquina de estados (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existe una postulación en estado "EN_REVISION"
    Cuando el administrativo solicita cambiar su estado a "APROBADA"
    Entonces el sistema rechaza la solicitud con código HTTP 400 indicando los estados válidos (RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA)
    Y la postulación conserva el estado "EN_REVISION"

  Escenario: Revisión de una postulación inexistente (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que no existe ninguna postulación con el identificador indicado
    Cuando el administrativo solicita cambiar el estado de esa postulación a "EN_REVISION"
    Entonces el sistema rechaza la solicitud con código HTTP 404 indicando que la postulación no existe
    Y no se modifica ninguna postulación

  Escenario: Registro en bitácora de cada cambio de estado (PA-04)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que la postulación del estudiante con documento "1053800000" está en estado "EN_REVISION"
    Cuando el administrativo cambia su estado a "VALIDADA"
    Entonces queda un registro en la bitácora de auditoría con el actor "30300300", la postulación afectada, el estado anterior "EN_REVISION", el nuevo estado "VALIDADA" y la fecha del cambio
    Y una transición rechazada por inválida no deja registrada ninguna transición de estado en la bitácora

  Escenario: Bloqueo de la revisión sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta cambiar el estado de una postulación
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y la postulación no cambia de estado
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo
