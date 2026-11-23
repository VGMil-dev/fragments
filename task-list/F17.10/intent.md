# F17.10 — Dashboard Pixel Night: identidad verificable

## Intento

Hacer accesible el perfil GitHub real desde la identidad mostrada en el centro de misiones del estudiante.

## Criterio técnico aplicado

Se revisó `vercel-react-best-practices`; el enlace se deriva de `profileUrl` del DTO ya cargado, sin nuevas consultas ni estado duplicado.

## Alcance

- Enlazar el login del estudiante a `profileUrl` solo cuando la URL real esté disponible.
- Mantener fallback textual con el login y el contenido/CTA real existente.
- No añadir métricas, progresos ficticios, rutas o datos al servidor.
- La pantalla continúa como candidata visual hasta revisión del propietario.
