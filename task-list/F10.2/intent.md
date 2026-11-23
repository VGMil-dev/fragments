# F10.2 — Continuidad Review → Trainer

## Problema

Review y Trainer son herramientas del recorrido académico, pero una revisión completada termina sin un acceso directo a la práctica. Además, el estado vacío de Trainer informa que se necesita Review, pero no ofrece un enlace accionable; el estado de error del feed no debe presentarse como ausencia de revisiones.

## Objetivo

Conectar las pantallas existentes con navegación accesible en ambos sentidos: del Trainer vacío a Review y de una revisión completada a Trainer. Trainer seguirá leyendo únicamente revisiones completadas persistidas del estudiante autenticado.

## No objetivos

- Cambiar contratos, endpoints, rúbricas, IA, migraciones o persistencia.
- Crear Review, retos, progreso o fixtures de producción.
- Rediseñar visualmente Trainer ni inventar contenido académico.

## Owner y criterio

Owner: PLANNER. Aplicar TDD manual y la skill `vercel-react-best-practices` selectivamente. Usar el patrón de enlaces/navegación existente, foco visible y textos en español; la skill TDD y `web-design-guidelines` no están instaladas en este entorno.
