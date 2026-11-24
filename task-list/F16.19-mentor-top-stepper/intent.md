# F16.19 — Mentor: relación accesible del stepper superior

Mentor ya usa la ruta superior compacta de seis etapas y conserva el formulario y sus estados reales. Este incremento completa su semántica accesible al declarar que cada botón del stepper controla el formulario único que cambia de etapa.

## Objetivo

Mantener la ruta Pixel Night aprobada y relacionar cada control de etapa con el formulario activo para tecnologías de asistencia.

## No objetivos

- No rediseñar la ruta ni recuperar un submenú secundario “Tu propuesta”.
- No cambiar campos, validación, cálculo de completitud, guardado, contexto, evaluación, contratos, persistencia, rutas o APIs.
- No declarar aprobación visual ni estabilidad para piloto.

## Owner y criterio aplicado

F16 UX / Mentor. Implementación focal con prueba de componente: una única forma con ID estable y seis controles accesibles que declaran su relación con ella.
