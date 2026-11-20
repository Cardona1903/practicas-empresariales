# language: es
# Traza: CU-04, PA-04, EAC-03, ADR-001, ADR-003, ADR-004, ADR-006

Característica: Visualización de datos y trazabilidad de postulantes (CU-04)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero consultar los datos detallados de un estudiante postulante y la trazabilidad de su postulación
  Para verificar la información del estudiante, el estado actual de su trámite y los eventos registrados en su proceso

  Escenario: Consulta exitosa de los datos y trazabilidad de un postulante existente (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que existe el estudiante postulante con documento "1053800000" del programa "Ingeniería de Sistemas" con una postulación registrada
    Cuando el administrativo solicita consultar el detalle en "GET /postulaciones/estudiante/1053800000"
    Entonces el sistema retorna los datos del estudiante postulante ("documento", "programaAcademico")
    Y el detalle de su postulación ("id", "estado", "documentosAdjuntos", "motivoRechazo", "creadaEn", "actualizadaEn")
    Y la lista de eventos de auditoría asociados a dicho trámite ("evento", "resultado", "fecha")
    Y el sistema responde con código de estado HTTP 200

  Escenario: Consulta de un postulante inexistente por documento (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que no existe ningún estudiante ni postulación registrada con el documento "9999999999"
    Cuando el administrativo solicita consultar el detalle en "GET /postulaciones/estudiante/9999999999"
    Entonces el sistema rechaza la solicitud indicando que el postulante no fue encontrado
    Y el sistema responde con código de estado HTTP 404

  Escenario: Bloqueo de consulta de datos y trazabilidad sin rol administrativo (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a "ADMINISTRATIVO" (como un estudiante o un supervisor externo) intenta acceder a "GET /postulaciones/estudiante/1053800000"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados denegando la petición con código HTTP 401 o 403 (ADR-004)
    Y no se entrega ninguna información sensible del estudiante
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)