# language: es
# Traza: CU-09, EAC-02, EAC-03, ADR-001, ADR-003, ADR-004, ADR-006, ADR-007
Característica: Realizar postulación a la práctica (CU-09)
  Como estudiante activo de la Universidad de Caldas
  Quiero cargar mis datos y documentos requeridos según mi programa académico
  Para formalizar mi solicitud de inicio de práctica empresarial

  Escenario: Carga exitosa de postulación con requisitos completos (flujo básico)
    Dado que el estudiante con documento "1053800000" del programa "Ingeniería de Sistemas" ha iniciado sesión institucional mediante SSO
    Y que el programa "Ingeniería de Sistemas" tiene configurados como vigentes los documentos "hoja_vida.pdf" y "carta_presentacion.pdf"
    Y que la postulación contiene únicamente los documentos adjuntos requeridos por su programa (los datos de documento y programa del estudiante se obtienen de su sesión SSO)
    Cuando el estudiante envía su postulación adjuntando "hoja_vida.pdf" y "carta_presentacion.pdf" válidos y legibles
    Entonces el sistema registra una nueva postulación asociada al estudiante
    Y el estado inicial de la postulación queda explícitamente en "RECIBIDA"
    Y la postulación no realiza ninguna transición automática de aprobación ni validación
    Y el sistema responde confirmando la recepción exitosa con código de estado HTTP 201

  Escenario: Rechazo de postulación por documentos incompletos (flujo alterno - excepción)
    Dado que el estudiante del programa "Ingeniería de Sistemas" ha iniciado sesión institucional
    Y que el programa exige como obligatorios los documentos "hoja_vida.pdf" y "carta_presentacion.pdf"
    Cuando el estudiante envía la postulación adjuntando únicamente "hoja_vida.pdf"
    Entonces el sistema rechaza la postulación
    Y no se crea ningún registro de postulación en la base de datos
    Y el sistema retorna un error HTTP 422 con un mensaje claro indicando que la documentación está incompleta

  Escenario: Rechazo de postulación por archivo corrupto o ilegible (flujo alterno - excepción)
    Dado que el estudiante del programa "Ingeniería de Sistemas" ha iniciado sesión institucional
    Cuando el estudiante envía su postulación con un archivo "carta_presentacion.pdf" corrupto o cuyo formato no corresponde a un PDF válido
    Entonces el sistema rechaza la carga de la postulación
    Y el sistema retorna un error HTTP 422 indicando que el documento está corrupto o es inválido
    Y no se realiza ningún cambio en el estado de las postulaciones

  Escenario: Intento de postulación cuando ya existe una postulación activa (flujo alterno - excepción)
    Dado que el estudiante con documento "1053800000" ya tiene una postulación registrada en estado "RECIBIDA"
    Cuando el estudiante intenta registrar una nueva postulación
    Entonces el sistema rechaza la solicitud con código HTTP 409 indicando que ya cuenta con un trámite de postulación activo en curso

  Escenario: Bloqueo de postulación sin autenticación o rol indebido (EAC-03 - Seguridad)
    Dado que un usuario no autenticado o con rol distinto a estudiante (por ejemplo, supervisor externo) intenta enviar una postulación a "POST /postulaciones"
    Cuando la solicitud llega al sistema
    Entonces el sistema bloquea el 100% de los accesos denegando la petición con código HTTP 401 o 403
    Y el sistema registra el intento de acceso no autorizado en la bitácora de auditoría en menos de 1 segundo

  Escenario: Modificación de requisitos de postulación sin tocar código ni redesplegar (EAC-02 - Mantenibilidad)
    Dado que un administrador actualiza en la base de datos los requisitos del programa "Ingeniería de Sistemas" agregando el documento "acuerdo_confidencialidad.pdf"
    Cuando un estudiante de "Ingeniería de Sistemas" envía una nueva postulación sin "acuerdo_confidencialidad.pdf"
    Entonces el sistema rechaza de inmediato la postulación con código HTTP 422 reconociendo la nueva regla
    Y la modificación de los requisitos se realizó en máximo 2 días/persona modificando únicamente la parametrización de requisitos sin alterar el código de los módulos de postulación, asignación de tutor, horas ni actas
