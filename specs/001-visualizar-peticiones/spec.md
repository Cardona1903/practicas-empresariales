# language: es
# Traza: CU-01, EAC-03, ADR-001, ADR-003, ADR-004, ADR-006

Característica: Visualizar peticiones de postulación (CU-01)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero consultar el listado de peticiones de postulación radicadas por los estudiantes
  Para conocer su estado actual y gestionar la revisión y validación de las solicitudes

  Escenario: Consulta exitosa del listado general de peticiones (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existen postulaciones registradas en el sistema con estados "RECIBIDA" y "EN_REVISION"
    Cuando el administrativo solicita consultar el listado de peticiones sin filtros
    Entonces el sistema retorna la lista con las peticiones de postulación registradas
    Y cada elemento del listado contiene el identificador de la postulación, el documento del estudiante, el programa académico, la fecha de radicación, los documentos adjuntos y el estado actual de la postulación
    Y los resultados se entregan ordenados cronológicamente por fecha de radicación descendente
    Y el sistema responde con código de estado HTTP 200

  Escenario: Consulta de peticiones cuando no existen registros en el sistema (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y no existe ninguna postulación registrada en el sistema
    Cuando el administrativo solicita consultar el listado de peticiones de postulación
    Entonces el sistema retorna una lista vacía
    Y el sistema responde con código de estado HTTP 200

  Escenario: Filtrado opcional de peticiones por estado de postulación (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y existen postulaciones registradas en estados "RECIBIDA", "EN_REVISION" y "VALIDADA"
    Cuando el administrativo solicita consultar las peticiones filtrando por el parámetro de estado "RECIBIDA"
    Entonces el sistema retorna únicamente las postulaciones cuyo estado actual coincida con "RECIBIDA"
    Y los resultados mantienen el ordenamiento cronológico descendente por fecha de radicación
    Y el sistema responde con código de estado HTTP 200

  Escenario: Bloqueo de consulta de postulaciones sin autenticación o rol no administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta acceder a "GET /postulaciones"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo
