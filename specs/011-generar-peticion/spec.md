# language: es
# Traza: CU-11, CU-05, CU-07, EAC-03, RN-01, PA-04, ADR-001, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007

Característica: Generar petición del acta final (CU-11)
  Como estudiante activo de la Universidad de Caldas
  Quiero generar la petición formal del acta final de mi práctica empresarial una vez cumplidos mis requisitos
  Para solicitar a la Coordinación de Prácticas la revisión y expedición manual del acta de finalización sin automatizaciones (RN-01)

  Escenario: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico)
    Dado que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" ha iniciado sesión institucional mediante SSO con rol "ESTUDIANTE"
    Y que su postulación se encuentra en estado "VALIDADA" (ADR-003)
    Y que cuenta con 320 horas de práctica en estado "VERIFICADA", cumpliendo las 320 horas mínimas requeridas por su programa académico (CU-05, ADR-007)
    Y que no tiene una petición de acta final activa ni un acta ya expedida en estado "GENERADA"
    Cuando el estudiante solicita generar la petición del acta final invocando "POST /actas/solicitar"
    Entonces el sistema extrae la identidad del estudiante desde el token JWT institucional autenticado
    Y el sistema registra en la base de datos un registro de Acta en estado "SOLICITADA" asociada al estudiante "1053800000" con totalHoras acumuladas de 320
    Y el sistema no genera automáticamente el archivo PDF del acta, quedando a la espera de la confirmación manual y posterior generación por parte del personal administrativo (RN-01, CU-06, CU-07)
    Y el sistema registra el evento de solicitud de acta en la bitácora de auditoría con el actor "1053800000" (PA-04)
    Y el sistema responde confirmando la creación de la petición con código de estado HTTP 201 y los datos del acta en estado "SOLICITADA"

  Escenario: Rechazo de petición del acta final cuando la postulación no está validada (excepción)
    Dado que el estudiante con documento "1053800000" ha iniciado sesión institucional mediante SSO con rol "ESTUDIANTE"
    Y que su postulación no existe o se encuentra en estado "RECIBIDA", "EN_REVISION" o "RECHAZADA"
    Cuando el estudiante intenta generar la petición del acta final en "POST /actas/solicitar"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que la postulación aún no está validada (ADR-003, ADR-006)
    Y no se registra ninguna petición de acta final en la base de datos

  Escenario: Rechazo de petición del acta final cuando las horas verificadas son insuficientes (excepción)
    Dado que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" (que exige 320 horas mínimas) ha iniciado sesión institucional mediante SSO con rol "ESTUDIANTE"
    Y que su postulación se encuentra en estado "VALIDADA"
    Y que el estudiante solo acumula 180 horas de práctica en estado "VERIFICADA"
    Cuando el estudiante intenta generar la petición del acta final en "POST /actas/solicitar"
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que el estudiante no cumple con las horas mínimas verificadas requeridas por su programa académico (ADR-006, ADR-007)
    Y no se registra ninguna petición de acta final en la base de datos

  Escenario: Rechazo de petición duplicada cuando ya existe una petición en curso o un acta generada (flujo alterno - excepción)
    Dado que el estudiante con documento "1053800000" ha iniciado sesión institucional mediante SSO con rol "ESTUDIANTE"
    Y que ya cuenta con una petición previa en estado "SOLICITADA" o con un acta oficial en estado "GENERADA"
    Cuando el estudiante intenta registrar una nueva petición del acta final en "POST /actas/solicitar"
    Entonces el sistema rechaza la solicitud con código HTTP 409 impidiendo peticiones duplicadas (ADR-006)
    Y no se alteran los registros existentes del estudiante

  Escenario: Bloqueo de petición del acta final sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ESTUDIANTE" (como un supervisor externo o personal administrativo) intenta invocar "POST /actas/solicitar"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados denegando la petición con código HTTP 401 o 403 (ADR-004)
    Y no se crea ningún registro de petición en la base de datos
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
