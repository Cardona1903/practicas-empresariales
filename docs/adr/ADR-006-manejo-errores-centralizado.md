# ADR-006: Centralizar el manejo de errores de carga de documentos y de generación del acta, con reintento manual

## Estado
Aceptado

## Contexto
La preocupación arquitectónica **"Manejo de errores y excepciones"** exige "una estrategia unificada para documentos incompletos o corruptos al cargar requisitos, y para fallos en la generación del PDF del acta".

En la matriz de priorización, este driver queda en el cuadrante de baja importancia / baja dificultad ("hacer si sobra tiempo"), por lo que se decide una estrategia simple y consistente con las demás decisiones, en vez de invertir en un mecanismo sofisticado.

**Drivers cubiertos:** PA-03 (Manejo de errores y excepciones).

## Alternativas consideradas
1. **Manejo centralizado (elegida):** una capa de validación explícita rechaza de inmediato un documento incompleto o corrupto (con mensaje claro al estudiante en CU-09), y un fallo en la generación del acta deja la solicitud en estado "fallida", visible para que un administrativo la reintente manualmente.
2. **Reintentos automáticos en segundo plano** ante un fallo de generación, sin intervención humana.
3. **Manejo ad-hoc:** cada módulo decide por su cuenta cómo reportar y recuperarse de sus propios errores, sin una convención común.

## Decisión
Se centraliza el manejo de errores con reintento manual.

La alternativa 2 se descarta porque un reintento automático es, en los hechos, una forma de automatización de un flujo de generación/aprobación, lo que entra en tensión con el espíritu de RN-01 (intervención humana explícita ante excepciones del proceso de actas).

La alternativa 3 se descarta porque, dado que ya existen varios módulos (ADR-001), un manejo ad-hoc produciría mensajes y comportamientos inconsistentes entre ellos, en contra del driver de mantenibilidad (EAC-02): cada módulo tendría su propia lógica de errores que mantener por separado.

## Consecuencias

### Positivas
- El estudiante recibe retroalimentación inmediata y consistente si su documento está incompleto o corrupto (CU-09).
- Una falla en la generación del acta nunca queda en un estado ambiguo, porque siempre es visible y accionable por el personal administrativo.

### Negativas y costos aceptados
- Al no haber reintento automático, cada fallo en la generación del acta requiere que un administrativo lo note y lo reintente; si la causa raíz no se corrige (p. ej. un problema recurrente con cierto tipo de documento), el mismo caso puede requerir varias intervenciones manuales.

### Riesgos asumidos
- Al quedar en el cuadrante "hacer si sobra tiempo" de la matriz de priorización, existe el riesgo de que esta estrategia se implemente de forma mínima y quede pendiente de profundizar (p. ej. categorización más fina de tipos de error); se declara explícitamente como riesgo de alcance a revisar si el tiempo del proyecto es limitado.
