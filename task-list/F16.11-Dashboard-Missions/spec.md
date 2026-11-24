# Especificación F16.11

- Una acción prioritaria representa el siguiente paso real; preservar la prioridad del borrador propio y mostrar la misión solo cuando corresponda.
- Perfil, aulas, entregas, habilidades y snapshot de misión proceden de respuestas existentes; sin XP, recompensas, métricas o progreso inventados.
- Reutilizar identidad/tokens F16, reducir tarjetas y mantener estados loading/error/empty auténticos.
- Reflow a 320/390/768/1024/1440, foco/teclado/reduced-motion; tests de estados ya existentes.
- Sin tocar `App.tsx` ni contratos/rutas compartidas; sin escrituras en sesiones de usuario.
- Si la propuesta prioritaria y una misión visible comparten el `assignmentVersionId` exacto, conservar el contexto de misión y reemplazar solo la segunda CTA por un texto que indique que la propuesta ya está destacada. Una propuesta vinculada distinta del siguiente paso mantiene su acción independiente.
