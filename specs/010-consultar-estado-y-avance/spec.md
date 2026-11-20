# language: es
# Traza: CU-10, EAC-03, RN-02, PA-02, PA-04, ADR-001, ADR-004, ADR-006

Característica: Consultar el estado de la postulación y el avance de horas (CU-10)
  Como estudiante activo de la Universidad de Caldas
  Quiero consultar el estado actual de mi postulación y mi avance de horas de práctica registradas y verificadas
  Para hacer seguimiento a mi proceso de práctica empresarial sin depender de consultas manuales por correo

  Escenario: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico)
    Dado que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" ha iniciado sesión institucional mediante SSO
    Y que el estudiante "1053800000" tiene una postulación en estado "VALIDADA", 40 horas en estado "VERIFICADA" y 8 horas en estado "REGISTRADA"
    Cuando el estudiante consulta su postulación en "GET /postulaciones/mi-postulacion" y su avance de horas en "GET /horas/mi-avance"
    Entonces el sistema responde con código HTTP 200 en ambas consultas
    Y entrega su postulación en estado "VALIDADA"
    Y entrega en su avance de horas 40 horas verificadas, 8 horas pendientes en estado "REGISTRADA", 48 horas totales reportadas y la lista de sus propios registros de horas

  Escenario: Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno)
    Dado que el estudiante con documento "1053900000" del programa "Ingeniería de Sistemas" ha iniciado sesión institucional mediante SSO
    Y que el estudiante "1053900000" aún no tiene registros de horas reportados por un supervisor
    Cuando el estudiante consulta su avance de horas en "GET /horas/mi-avance"
    Entonces el sistema responde con código HTTP 200 indicando 0 horas verificadas, 0 horas pendientes, 0 horas totales y la lista de registros vacía

  Escenario: Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad)
    Dado que existen registros de horas tanto del estudiante "1053800000" como de otro estudiante "1053999999"
    Cuando el estudiante con documento "1053800000" autenticado mediante SSO consulta "GET /horas/mi-avance"
    Entonces el sistema extrae el documento "1053800000" directamente del token JWT de su sesión y devuelve únicamente los registros del estudiante "1053800000", sin exponer ningún dato del estudiante "1053999999" (Vista Lógica, EAC-03)

  Escenario: Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con un rol distinto a "ESTUDIANTE" intenta acceder a "GET /horas/mi-avance"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)
