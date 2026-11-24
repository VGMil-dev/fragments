# Especificación F17.12

- Un borrador propio conserva prioridad sobre todas las misiones.
- Sin borrador y con exactamente una misión publicada, conservar el siguiente paso y el inicio directo de esa misión.
- Sin borrador y con varias misiones, no seleccionar una misión como prioritaria por `createdAt`; explicar que el estudiante puede elegir y ofrecer una CTA primaria a Mis aulas.
- Mostrar las misiones y sus objetivos/habilidades auténticos como opciones secundarias existentes. Conservar su límite y el enlace para ver las demás.
- Mantener loading, error, recuperación, estados vacíos, accesibilidad y reflow actuales.
- No cambiar contratos, APIs, rutas, persistencia ni navegación global. No añadir datos ficticios ni dependencias.
- Cubrir con pruebas la elección entre varias misiones, la misión única y la precedencia de borrador; ejecutar suite focal, typecheck y build.
- QA de navegador Ego Lite requiere sesión estudiante existente. Si no está disponible, dejarla NO COMPROBADA; no crear/cerrar sesiones.
