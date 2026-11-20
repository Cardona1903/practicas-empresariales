# language: es
# Traza: CU-07, CU-05, EAC-01, EAC-03, RN-01, RT-01, PA-01, PA-04, ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007

Característica: Generar el acta final de la práctica en PDF (CU-07)
  Como personal administrativo de la Coordinación de Prácticas
  Quiero confirmar la finalización y generar el acta final oficial de la práctica en formato PDF
  Para consolidar de forma síncrona las horas verificadas del estudiante y expedir el documento oficial en menos de 24 horas hábiles (OB-02) sin requerir servicios externos en la nube (RT-01, ADR-005)

  Escenario: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico)
    Dado que un usuario con rol "ADMINISTRATIVO" y documento "30300300" ha iniciado sesión institucional mediante SSO
    Y que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" tiene una postulación en estado "VALIDADA"
    Y que el estudiante tiene 320 horas de práctica en estado "VERIFICADA", cumpliendo las 320 horas mínimas requeridas por su programa
    Cuando el administrativo confirma la finalización y solicita generar el acta en "POST /actas" enviando { "estudianteId": "1053800000" }
    Entonces el sistema consolida las horas validadas y renderiza el PDF del acta en memoria de forma síncrona en el propio servidor
    Y el archivo PDF queda guardado en el almacenamiento institucional local on-premise
    Y el sistema registra en la base de datos PostgreSQL un registro de Acta en estado "GENERADA" con totalHoras igual a 320 y la ruta del archivo generado
    Y el sistema responde confirmando la expedición con código de estado HTTP 201 y los datos del acta generada
    Y el evento de generación exitosa queda registrado en la bitácora de auditoría (PA-04)

  Escenario: Intento de generación de acta cuando la postulación no está validada (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que existe una postulación para el estudiante con documento "1053800000" en estado "RECIBIDA" o "EN_REVISION"
    Cuando el administrativo solicita generar el acta en "POST /actas" enviando { "estudianteId": "1053800000" }
    Entonces el sistema rechaza la solicitud con código HTTP 409 y el mensaje "la postulación aún no está validada" (ADR-003)
    Y no se genera ningún archivo PDF ni se crea ningún registro de Acta en la base de datos

  Escenario: Intento de generación de acta con horas verificadas insuficientes (excepción)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" (que exige 320 horas mínimas) tiene postulación en estado "VALIDADA"
    Y que el estudiante solo cuenta con 180 horas de práctica en estado "VERIFICADA"
    Cuando el administrativo solicita generar el acta en "POST /actas" enviando { "estudianteId": "1053800000" }
    Entonces el sistema rechaza la solicitud con código HTTP 409 y el mensaje "El estudiante no cumple con las horas mínimas requeridas por su programa académico"
    Y no se genera ningún archivo PDF ni se crea un registro de Acta en estado "GENERADA"

  Escenario: Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que para el estudiante "1053800000" ya existe un acta previa registrada en estado "GENERADA"
    Cuando el administrativo solicita generar el acta en "POST /actas" enviando { "estudianteId": "1053800000" }
    Entonces el sistema rechaza la solicitud con código HTTP 409 impidiendo duplicados y reporta "Ya existe un acta oficial generada para este estudiante"
    Y no se sobrescribe el archivo existente ni se alteran los registros previos

  Escenario: Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia)
    Dado que un usuario con rol "ADMINISTRATIVO" ha iniciado sesión institucional mediante SSO
    Y que el estudiante con documento "1053800000" cumple con postulación "VALIDADA" y horas verificadas requeridas
    Pero ocurre una falla durante la renderización del PDF con PDFKit o su almacenamiento en disco local
    Cuando el módulo de Actas procesa la solicitud
    Entonces el sistema registra el Acta en la base de datos con estado "FALLIDA" y el detalle del error (ADR-005, ADR-006)
    Y el sistema responde con código HTTP 500 y el mensaje "no se pudo generar el acta, reintentar manualmente"
    Y el sistema no realiza reintentos automáticos en segundo plano (RN-01, ADR-006)
    Y el fallo queda registrado en la bitácora de auditoría (PA-04)

  Escenario: Eficiencia de desempeño en la expedición síncrona del acta bajo carga concurrente (EAC-01 - Desempeño)
    Dado que el sistema se encuentra en operación normal durante el periodo de cierre de semestre
    Y se reciben hasta 30 solicitudes simultáneas de generación de actas enviadas por personal administrativo autenticado
    Cuando el módulo de actas consolida las horas, renderiza el PDF en memoria mediante PDFKit y almacena el documento localmente
    Entonces el 95% de las solicitudes completan la respuesta exitosa (código HTTP 201) en menos de 5 segundos
    Y todas las transacciones de base de datos se ejecutan de forma íntegra y síncrona sin encolamiento asíncrono (ADR-005)

  Escenario: Bloqueo de generación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
    Dado que una solicitud a "POST /actas" es enviada por un usuario no autenticado, un estudiante o un supervisor externo sin credenciales administrativas
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos no autorizados respondiendo con código HTTP 401 o 403 (ADR-004)
    Y no se genera ningún documento PDF ni se altera la base de datos
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo (EAC-03, PA-04)