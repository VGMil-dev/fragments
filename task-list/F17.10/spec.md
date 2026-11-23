# Especificación F17.10 — Dashboard Pixel Night

## Criterios de aceptación

- GIVEN un estudiante con `githubLogin` y `profileUrl`, WHEN abre el Dashboard, THEN el login es un enlace a la URL de perfil recibida.
- El enlace externo usa `target="_blank"` y `rel="noreferrer"`; conserva indicación de foco visible.
- GIVEN que existe login sin URL de perfil, WHEN se renderiza la identidad, THEN se muestra el login como texto, no un enlace construido por conjetura.
- No se modifican selección de siguiente paso, CTA, API, contratos o datos académicos.
