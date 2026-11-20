# language: es
# Traza: CU-06, CU-07, CU-11, EAC-03, RN-01, PA-04, ADR-001, ADR-004, ADR-005, ADR-006

Característica: Dar confirmación para la generación del acta final (CU-06)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero revisar y dar confirmación manual de aprobación a una petición de acta final radicada por un estudiante
  Para autorizar explícitamente la generación del documento PDF del acta sin automatizaciones (RN-01)

  Escenario: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que existe una petición de acta final para el estudiante "1053800000" en estado "SOLICITADA" con 320 horas verificadas
    Cuando el administrativo da su confirmación enviando "PATCH /actas/{id}/confirmar"
    Entonces el registro del acta pasa del estado "SOLICITADA" al estado "CONFIRMADA"
    Y el sistema no genera el archivo PDF automáticamente en este paso (RN-01), quedando lista para su expedición en CU-07
    Y el sistema registra el cambio de estado en la bitácora de auditoría con el actor "30300300" (PA-04)
    Y el sistema responde confirmando la aprobación con código de estado HTTP 200

  Escenario: Intento de confirmar un acta que no se encuentra en estado solicitada (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existe un registro de acta que ya se encuentra en estado "CONFIRMADA" o "GENERADA"
    Cuando el administrativo intenta confirmar nuevamente ese registro en "PATCH /actas/{id}/confirmar"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que el acta solo puede confirmarse cuando está en estado "SOLICITADA"
    Y el registro conserva su estado actual

  Escenario: Confirmación de un registro de acta inexistente (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que no existe ningún registro de acta con el identificador indicado
    Cuando el administrativo solicita confirmar esa acta en "PATCH /actas/{id}/confirmar"
    Entonces el sistema rechaza la solicitud con código HTTP 404 indicando que la petición de acta no existe

  Escenario: Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta invocar "PATCH /actas/{id}/confirmar"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y ningún registro de acta cambia de estado
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
