# Evidencia F18.B.5

Estado: implementación local; integración PR y despliegue F14 pendientes.

## Hallazgo

La continuación enviaba a `/student/trainer` sin `reviewId`. `TrainerScreen` toma entonces el primer Review de la lista completada, que puede corresponder a un commit anterior y no a la entrega final de la misión. La API ya expone IDs y estados de intentos por entrega; no hace falta crear datos ni modificar persistencia.

## Cambio

- La lógica de continuidad selecciona la Review completada más reciente de la última entrega publicada cuando todas las entregas están completas.
- La ruta Trainer lleva `reviewId` explícito y la pantalla existente lo selecciona; las rutas de Mentor/Review siguen llevando el `proposalId`.
- Si una respuesta afirma completitud sin aportar un `reviewId` completado para la última entrega, continúa en Review en lugar de escoger un análisis no relacionado.
- La integración App y las pruebas usan fixtures locales; no hubo navegador, proveedores IA, red o escrituras productivas.

## Verificación local

- Ciclo rojo: `pnpm --filter @fragments/web exec vitest run src/features/student/mission-continuation.test.ts` — 6 fallos esperados antes de implementar porque el helper devolvía solo una ruta y no un Review ID.
- Focal final: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx src/features/student/mission-continuation.test.ts src/features/trainer/TrainerScreen.test.tsx` — 3 archivos, 37/37 PASS.
- Suite completa: `pnpm --filter @fragments/web test` — 57 archivos, 328/328 PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; persisten avisos existentes de bundle >500 kB y directivas `use client` de lucide-react.
- `git diff --check` — PASS.

Commit de implementación: `509992ce9325fba563adcabd96f6d4194f4cd0ca` (`feat(F18.B.5): selecciona Review final al continuar`).

CI del PR, merge, release, despliegue y comprobación productiva: pendientes. CU-20/CU-23/CU-24 globales siguen PARCIALES hasta pruebas con Review real autorizada; no se ejecutó evaluación IA.
