# Evidencia F18.B.7

Estado: implementado e integrado; producción pendiente de la ruta F14.

## Comportamiento y pruebas

- «Continuar» en Mis proyectos consulta las evaluaciones Mentor propias y el historial de Review cuando la propuesta está ligada a una misión; dirige a Mentor, Review o Trainer según el estado persistido.
- Si una consulta requerida no responde correctamente, conserva Mis proyectos, explica que no pudo verificar el estado y permite reintentar.
- Regresión hacia Trainer comprueba el `reviewId` final persistido. Dos regresiones de error verifican entregas/historial no disponibles.
- Prueba focal `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx`: 20/20 PASS.
- Suite web `pnpm --filter @fragments/web test`: 57 archivos, 332/332 PASS.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS; permanecen avisos del bundle >500 kB y directivas `use client` en lucide-react.
- `git diff --check`: PASS.

El historial fake común se actualizó a disponible. Las regresiones de error configuran respuestas fallidas de forma explícita.

## Integración y límites

- Commit de implementación: `bced45c10ad93ca3a88650c3d09d9a267422df0c`.
- PR [#299](https://github.com/VGMil-dev/fragments/pull/299), integrado por merge normal en `f9f78c77817d7122bfc3b77ca504522a56409abd`.
- CI [#45651545958](https://github.com/VGMil-dev/fragments/actions/runs/45651545958): SUCCESS.
- CI confirma build y pruebas, incluidos servicios PostgreSQL efímeros; no equivale a navegación autenticada real.
- F14 v0.5.85 sigue bloqueado durante publicación por HTTP 500 de GitHub al crear el release; no se creó otra tag ni se eludieron controles. Esta implementación no está desplegada.
- Ego Lite autenticado, uso de un Review real y recorrido productivo: NO COMPROBADOS. Los Spaces autorizados previamente no aparecen en la enumeración actual.
- No se ejecutaron llamadas IA ni escrituras de producción.

La tarea F18.B.7 no se marca completa hasta desplegar por F14 cuando el bloqueo externo se resuelva y verificar el resultado en Ego Lite autorizado.

## Corrección de continuidad Mentor · PR #301

La revisión de la API comprobó que los borradores sin evaluación Mentor no necesitan el historial de entregas para reanudar en Mentor. F18.B.7 consulta ahora ese historial solo tras confirmar evaluación propia; si esta consulta sí requerida falla, conserva Mis proyectos y muestra Reintentar.

- Commit: `7eea37ceccd57c0e67d94b1e1ca95892cb7e863f`.
- PR #301 merge normal en `038be1f2df8afa55de4b140ef992f3f7e7c826a7`.
- CI #45653052899 SUCCESS.
- Prueba focal 21/21; suite web 333/333; typecheck/build/diff-check PASS.
- Este commit tampoco está desplegado. F14 v0.5.85 sigue bloqueado en GitHub HTTP 500; Ego Lite NO COMPROBADO.