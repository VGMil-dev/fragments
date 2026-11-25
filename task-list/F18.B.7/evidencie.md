# Evidencia F18.B.7

Estado: implementación local verificada; integración y despliegue pendientes.

## Comportamiento y pruebas

- Añadida prueba de recorrido desde Mis proyectos con propuesta propia vinculada a misión, evaluación Mentor persistida e historial final completo. Aserciones verifican consultas al API, ruta Trainer y el `reviewId` final.
- Añadidas regresiones para respuesta fallida de entregas y para historial de misión no disponible; ambas comprueban que no se navega a una etapa asumida y se presenta reintento/error.
- Prueba focal: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — 20/20 PASS.
- Suite web: `pnpm --filter @fragments/web test` — 57 archivos, 332/332 PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; persisten avisos del bundle >500 kB y directivas `use client` en lucide-react.
- `git diff --check` — PASS.

El mock común de historial se cambió a un historial fake disponible. Las regresiones de error configuran respuestas fallidas explícitas, para que los flujos de éxito no dependan de un estado simulado inaccesible.

## Límites

- No se hicieron llamadas IA, escrituras productivas ni pruebas autenticadas con Ego Lite.
- Los Spaces estudiantil/docente autorizados previamente no están disponibles en la enumeración actual; la navegación real en QA/producción permanece NO COMPROBADA.
- F14 está bloqueado al publicar v0.5.85 por HTTP 500 de GitHub en creación de release. No se creó tag adicional ni se omitieron controles. Este cambio tampoco está desplegado.
- Commit, CI y PR se añadirán tras integración normal. La tarea no se marca completa hasta verificar el proceso acordado.
