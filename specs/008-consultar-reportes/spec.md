# language: es
# Traza: CU-08, EAC-03, PA-01, PA-04, ADR-001, ADR-004, ADR-006

Característica: Consultar reportes/indicadores del estado de las prácticas en curso (CU-08)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero consultar un reporte consolidado con los indicadores de postulaciones y el avance de horas verificadas de las prácticas
  Para hacer seguimiento al estado general de las prácticas empresariales sin depender de hojas de cálculo de Excel

  Escenario: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que existen postulaciones en distintos estados ("RECIBIDA", "EN_REVISION", "VALIDADA", "RECHAZADA") y horas verificadas para los estudiantes con postulación validada
    Cuando el administrativo solicita el reporte del estado de las prácticas en "GET /administracion/reportes"
    Entonces el sistema responde con código HTTP 200
    Y entrega el conteo total de postulaciones y el desglose por cada estado ("RECIBIDA", "EN_REVISION", "VALIDADA", "RECHAZADA")
    Y entrega el listado de prácticas con el documento del estudiante, su programa académico, su estado de postulación, si está validada y su total de horas verificadas consolidadas

  Escenario: Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que no existen postulaciones ni horas registradas en el sistema
    Cuando el administrativo solicita el reporte en "GET /administracion/reportes"
    Entonces el sistema responde con código HTTP 200 devolviendo todos los contadores en cero y la lista de prácticas vacía

  Escenario: Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta consultar "GET /administracion/reportes"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
