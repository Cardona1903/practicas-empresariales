# ADR-003: Modelar la postulación como una máquina de estados con transiciones aprobadas manualmente

## Estado
Aceptado

## Contexto
La restricción **RN-01** ("Exclusión de automatizaciones en flujos de trabajo"), impuesta por la Coordinación Administrativa de la Facultad, exige mantener "validación humana directa para la aprobación de documentos antes de la generación del acta final".

El caso de uso primario **CU-02** (Revisar y validar la postulación del estudiante) señala que "los requisitos de validación varían por programa académico y aún no están estandarizados".

**Drivers cubiertos:** RN-01; CU-02.

## Alternativas consideradas
1. **Máquina de estados explícita (elegida):** transiciones (p. ej. "Postulación recibida" → "En revisión" → "Validada/Rechazada") disparadas únicamente por una acción humana autenticada, cada transición registrada.
2. **Motor de reglas de negocio** que apruebe automáticamente las postulaciones que cumplan ciertos criterios predefinidos, dejando a un humano solo los casos excepcionales.
3. **Aprobación implícita (sin estado explícito):** el acta se genera directamente si existen suficientes horas registradas, sin un paso de validación de la postulación como tal.

## Decisión
Se modela la postulación como una **máquina de estados con transiciones manuales**.

La alternativa 2 (motor de reglas automático) se descarta porque contradice directamente RN-01: el personal administrativo exige la validación humana, no una aprobación automática aunque sea parcial.

La alternativa 3 se descarta porque elimina el único punto de control de calidad de la entrada (CU-02), y los criterios de validación "varían por programa académico y aún no están estandarizados", por lo que automatizarlos o eliminarlos sería prematuro y riesgoso.

## Consecuencias

### Positivas
- Cada cambio de estado de una postulación queda explícito y trazable.
- El personal administrativo mantiene control total sobre el punto del proceso donde la información es más heterogénea (CU-02).

### Negativas y costos aceptados
- Cada una de las aproximadamente 500 postulaciones anuales requiere al menos una acción humana explícita; esto no reduce la carga operativa del personal administrativo en ese paso, a diferencia de otros procesos del sistema. Se acepta este costo porque lo exige RN-01.

### Riesgos asumidos
- El riesgo **R1**, ya identificado en el documento de visión ("el volumen de verificación manual puede causar demoras en la fase previa a la emisión del acta"), aplica directamente aquí: si el número de postulaciones crece o se concentra en periodos cortos, la validación manual de CU-02 puede convertirse en un cuello de botella que esta decisión no resuelve por diseño.
