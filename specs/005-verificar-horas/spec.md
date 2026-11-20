# language: es
# Traza: CU-05, EAC-03, RN-01, PA-04, ADR-001, ADR-004, ADR-005, ADR-006

Característica: Verificar horas de estudiantes (CU-05)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero consultar los registros de horas reportados por los supervisores y verificarlos manualmente
  Para consolidar las horas verificadas de cada estudiante antes de habilitar la generación del acta final (RN-01, ADR-005)

  Escenario: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que existen registros de horas del estudiante "1053800000" en estado "REGISTRADA" y en estado "VERIFICADA", y registros de otro estudiante "1053900000" en estado "REGISTRADA"
    Cuando el administrativo consulta los registros de horas filtrando por estado "REGISTRADA" en "GET /horas?estado=REGISTRADA"
    Entonces el sistema responde con código HTTP 200 y devuelve únicamente los registros de horas que están en estado "REGISTRADA"
    Y cuando consulta filtrando además por estudiante en "GET /horas?estado=REGISTRADA&estudianteId=1053800000", devuelve únicamente los registros pendientes del estudiante "1053800000"

  Escenario: Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que el estudiante "1053800000" tiene un registro de 6 horas ya en estado "VERIFICADA" y un segundo registro de 8 horas en estado "REGISTRADA"
    Cuando el administrativo verifica el segundo registro enviando "PATCH /horas/{id}" para cambiar su estado a "VERIFICADA"
    Entonces el registro de horas queda en estado "VERIFICADA"
    Y el total consolidado de horas verificadas del estudiante "1053800000" pasa de 6 a 14 horas (ADR-005)
    Y el sistema registra el cambio de estado en la bitácora de auditoría con el actor "30300300" (PA-04)
    Y el sistema responde confirmando la actualización con código de estado HTTP 200

  Escenario: Intento de verificar un registro de horas que ya estaba verificado (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existe un registro de horas que ya se encuentra en estado "VERIFICADA"
    Cuando el administrativo intenta volver a verificar ese mismo registro en "PATCH /horas/{id}"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que el registro de horas ya fue verificado previamente
    Y el registro conserva su estado "VERIFICADA"

  Escenario: Verificación de un registro de horas inexistente (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que no existe ningún registro de horas con el identificador indicado
    Cuando el administrativo solicita verificar ese registro en "PATCH /horas/{id}"
    Entonces el sistema rechaza la solicitud con código HTTP 404 indicando que el registro de horas no existe

  Escenario: Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante) intenta consultar "GET /horas" o verificar "PATCH /horas/{id}"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y ningún registro de horas cambia de estado
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
