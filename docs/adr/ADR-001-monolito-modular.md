# ADR-001: Adoptar un monolito modular organizado por módulos de negocio

## Estado
Aceptado

## Contexto
El sistema debe dividirse en módulos claros para que un cambio en una parte no obligue a tocar las demás. La preocupación arquitectónica **"Estructura general"** pregunta explícitamente cómo se divide el sistema en módulos (Postulación, Asignación de tutor, Horas, Evaluación, Actas, Administración) y cómo se comunican entre sí.

El **Escenario 2 – Mantenibilidad** exige que un desarrollador pueda modificar un requisito de validación de la postulación para un programa académico específico "sin alterar el módulo de asignación de tutor, el de horas ni el de generación de actas", con una medida de respuesta verificable: el cambio se implementa, prueba y despliega en **máximo 2 días/persona, modificando un (1) solo módulo del sistema**.

Al mismo tiempo, la escala declarada en el documento de visión (500 estudiantes y 50 tutores al año) y la restricción RT-01 (infraestructura institucional ya contratada) no generan una carga diferencial entre módulos que justifique, por sí sola, la complejidad operativa de una arquitectura distribuida.

**Drivers cubiertos:** PA-01 (Estructura general); EAC-02 (Mantenibilidad).

## Alternativas consideradas
1. **Monolito modular (elegida):** una sola unidad desplegable, pero con separación interna estricta en módulos de negocio (Postulación, Asignación de tutor, Horas, Evaluación, Actas, Administración), cada uno con sus propias reglas y acceso a datos encapsulado, comunicándose mediante interfaces internas definidas (sin acceso directo de un módulo a las tablas de otro).
2. **Microservicios:** un servicio independiente desplegable por cada módulo, con su propia base de datos y comunicación por red.
3. **Monolito sin separación modular explícita:** todo el código y los datos compartidos libremente entre funcionalidades, sin fronteras internas definidas.

## Decisión
Se adopta un **monolito modular**.

La opción de microservicios se descarta porque el equipo que mantendrá el sistema no tiene la madurez operativa (observabilidad distribuida, orquestación, manejo de fallos de red) que esa arquitectura exige, y porque la escala del sistema no genera carga diferencial entre módulos que la justifique; además duplicaría el esfuerzo de despliegue sobre una infraestructura institucional ya limitada (RT-01).

El monolito sin separación modular se descarta porque no cumple la medida de respuesta del Escenario 2 (modificar un módulo sin alterar los demás, en ≤2 días/persona).

El monolito modular es la opción que satisface el driver de mantenibilidad sin incurrir en la complejidad operativa de los microservicios.

## Consecuencias

### Positivas
- Un cambio como el descrito en el Escenario 2 queda contenido en el módulo de Postulación, sin riesgo de romper Asignación de tutor, Horas o Actas.
- Un solo despliegue simplifica la operación sobre la infraestructura institucional (RT-01).

### Negativas y costos aceptados
- Al ser una sola unidad desplegable, cualquier cambio —incluso en un módulo de bajo riesgo— obliga a redesplegar todo el sistema, generando una ventana de interrupción compartida por todos los módulos, incluidos los que están en uso durante los picos de cierre de semestre (Escenario 1).
- No es posible escalar un módulo bajo carga (p. ej. Actas en cierre de semestre) sin escalar el sistema completo.

### Riesgos asumidos
- Si no se impone disciplina de diseño (revisiones de código, pruebas de arquitectura), la separación modular puede erosionarse con el tiempo hacia un "monolito no modular" de facto, perdiendo el beneficio de mantenibilidad que motivó esta decisión.
