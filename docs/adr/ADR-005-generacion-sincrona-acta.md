# ADR-005: Generar el acta de finalización de forma síncrona, con consolidación transaccional de horas y bitácora de auditoría

## Estado
Aceptado

## Contexto
**CU-07** (Generar el acta final de la práctica en PDF) es, según su propia justificación, "la razón de ser del sistema" y está "atado a un atributo de calidad crítico (integridad/fiabilidad de los datos)": un error aquí obliga a reemitir el acta.

Antes de generarla, **CU-05** (Verificar horas de estudiantes) debe consolidar y cruzar los datos de horas provenientes del registro del supervisor (CU-12) y la revisión manual del personal administrativo.

El **EAC-01 – Eficiencia de desempeño** exige que, con hasta 30 solicitudes simultáneas durante el cierre de semestre, el sistema "consolide los datos de horas validadas y genere el documento PDF del acta... en menos de 5 segundos, en el 95% de las solicitudes".

La preocupación arquitectónica **PA-04 (Registro y trazabilidad)** exige definir qué eventos de generación de actas se registran y por cuánto tiempo.

**Drivers cubiertos:** CU-07; CU-05; EAC-01 (Eficiencia de desempeño); PA-04 (Registro y trazabilidad).

## Alternativas consideradas
1. **Generación síncrona (elegida):** al confirmarse la finalización, el módulo de Actas consolida las horas validadas en una sola transacción, genera el PDF con una librería embebida en el propio servidor de aplicación, y deja el resultado (éxito o fallo) y un registro de auditoría disponibles de inmediato.
2. **Generación asíncrona:** la solicitud se encola, se procesa en segundo plano, y se notifica al usuario cuando el acta está lista.
3. **Delegar la generación del PDF a un servicio externo (SaaS) de generación de documentos.**

## Decisión
Se genera el acta de forma síncrona.

La alternativa 2 (asíncrona con notificación) se descarta porque el Alcance de la Visión declara explícitamente que el sistema "no contará con funcionalidad de comunicación ni mensajería entre los usuarios", por lo que no hay un canal previsto para avisar al usuario cuando el proceso en segundo plano termine; además EAC-01 pide la medida de respuesta en segundos, no un tiempo de espera indefinido.

La alternativa 3 se descarta porque RT-01 prohíbe el uso de infraestructura externa y RN-02 restringe la salida de datos académicos sensibles fuera del entorno institucional.

La consolidación se hace en una sola transacción para que el acta nunca se genere con datos de horas parcialmente actualizados.

## Consecuencias

### Positivas
- El usuario recibe el acta o un mensaje de error en la misma interacción, sin depender de un canal de notificación que el sistema no tiene (coherente con el Alcance).
- Cada generación queda registrada, satisfaciendo la preocupación de trazabilidad.

### Negativas y costos aceptados
- Procesar hasta 30 solicitudes simultáneas de forma síncrona exige dimensionar cuidadosamente los recursos del servidor (hilos/conexiones) del módulo de Actas para no superar los 5 segundos de EAC-01; esto acopla el desempeño de este módulo al del resto del monolito (ADR-001) durante los picos de cierre de semestre.

### Riesgos asumidos
- Si el volumen de solicitudes simultáneas supera el supuesto de 30 (que el propio EAC-01 marca como "a validar con Coordinación de Prácticas"), la medida de respuesta podría incumplirse; no se adopta de entrada una cola asíncrona para no contradecir el Alcance, pero este riesgo debe revisarse si la concurrencia real resulta mayor.
