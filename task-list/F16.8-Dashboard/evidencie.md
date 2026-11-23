# Evidencia F16.8

## Cambios
- `apps/web/src/features/student/StudentDashboard.tsx`: conserva el borrador como prioridad; agrega contexto de materia a la misión prioritaria y muestra hasta tres misiones secundarias auténticas. Las habilidades se presentan como lista etiquetada y solo si hay habilidades reales. El exceso se deriva del listado cargado y enlaza a Mis aulas. El estado vacío propone crear una propuesta sin atribuir historial falso.
- `apps/web/src/features/student/StudentDashboard.css`: tarjetas adaptables para misiones secundarias, foco visible, y corrección del color de texto del snapshot (`--dashboard-copy`).
- `apps/web/src/features/student/StudentDashboard.test.tsx`: casos de prioridad, contexto secundario, lista semántica de habilidades y ausencia de datos inventados.

## Verificación
- `pnpm --filter @fragments/contracts build` — completado.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 1 archivo, 9 pruebas aprobadas.
- `pnpm --filter @fragments/web typecheck` — completado.
- `git diff --check` — completado sin errores.
- Revisión reflexiva P2 de accesibilidad corregida: los chips son elementos `li` bajo un `ul` con nombre accesible y etiqueta visible; prueba estructural aprobada.

## Límites
Pruebas locales con fixtures sintéticos; no se usó Ego Lite ni sesión real. No se afirma verificación visual independiente, despliegue o comportamiento en producción. QA visual independiente pendiente según coordinación.

## Proceso
Se consultó la skill `vercel-react-best-practices`; se aplicaron únicamente recomendaciones pertinentes al cambio localizado. Contratos, rutas, tokens globales y tooling no fueron modificados.

## Commit
Implementación inicial: `8a05fe875ad87ec4fba794938201739100255ad3`.
La corrección semántica de accesibilidad y su evidencia se registran en un commit separado de la misma rama.
