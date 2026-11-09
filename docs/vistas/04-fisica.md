# Vista física: diagrama de despliegue

> Complementario a C4 (no es uno de sus cuatro niveles, pero usa su misma notación). Para: ingenieros de infraestructura.

## 1. Presentación principal

Diagrama: [`diagramas/04-fisica.puml`](../diagramas/04-fisica.puml)

## 2. Catálogo de elementos

| Nodo | Contenedor que aloja | Características | Conexiones |
|---|---|---|---|
| Servidor web | Aplicación web | Sirve los archivos estáticos de la interfaz. | Navegadores de estudiantes, personal administrativo y supervisores (HTTPS) |
| Servidor de aplicaciones | API de prácticas | Monolito modular (ADR-001); un único proceso desplegable. | PostgreSQL (SQL), Almacenamiento de PDFs, SIA (HTTPS) |
| Servidor de base de datos | PostgreSQL | Accesible solo desde la red interna. | API de prácticas (SQL) |
| Almacenamiento institucional | Almacenamiento de PDFs | Ubicado dentro del centro de datos, no en nube externa. | API de prácticas (lee y escribe) |

Todos los nodos están en el centro de datos de la Universidad de Caldas.

## 3. Justificación

- **RT-01:** todos los nodos están en la infraestructura institucional; no hay nube pública.
- **RN-02:** al no salir ningún dato fuera del centro de datos, se cumple la restricción de que los datos sensibles de prácticas queden limitados a estudiantes y administrativos dentro del entorno institucional.
- **ADR-002:** PostgreSQL y el almacenamiento de PDFs corren sobre la infraestructura ya contratada, sin introducir un segundo proveedor.
- **ADR-005:** al no haber generación asíncrona, no existe un nodo de mensajería (broker) ni un worker separado — un único servidor de aplicaciones basta.

## 4. Comportamiento

La secuencia de `cu07-generar-acta.puml` cruza tres nodos: el servidor de aplicaciones consulta el servidor de base de datos y escribe en el almacenamiento institucional, todo dentro de la misma transacción (ADR-005).

## 5. Vistas relacionadas

- **Procesos:** cada contenedor de esa vista aparece aquí en un nodo concreto.
- **Contexto:** el SIA aparece aquí con su protocolo (HTTPS), igual que en el contexto.
