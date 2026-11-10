# F10.1 — Evidencia de implementación

Estado: COMPLETADA.

Rama: `codex/v0.3.0-trainer`, base preservada desde `origin/main`; no se creó otra rama.

## Cambios

- Bancos de hasta cinco funcionalidades verificadas distintas; deduplicación de funcionalidad y texto de tarea; reuso tras primer sorteo.
- Migraciones SQLite v7/v8: marca de banco listo, dueño y lease de generación. Se amplía el banco F10 anterior sin borrar el reto histórico.
- `bankSize` en respuesta/UI; mensaje cuando solo hay una opción, con repaso habilitado.
- Fixture Ego Lite fake con tres funcionalidades. Sin cambio de contratos compartidos. Regla de `.gitignore` existente confirmada: `/task-list/F10/evidence/`.

## Verificación fresca — 2026-11-09

- `$env:CI='true'; pnpm exec turbo test --force` — exit 0, sin caché; contracts 18, API 87, web 52; total 157.
- `$env:CI='true'; pnpm --filter @fragments/api exec vitest run src/features/trainer/service.test.ts src/features/trainer/http.test.ts src/features/trainer/repository.test.ts src/db/open.test.ts` — exit 0; 4 archivos, 9 pruebas.
- `$env:CI='true'; pnpm exec turbo typecheck --force` — exit 0, 4/4 tareas.
- `$env:CI='true'; pnpm exec turbo build --force` — exit 0, 3/3 paquetes.
- `$env:CI='true'; pnpm exec turbo lint --force` — exit 0; 1 lint declarado.
- `git diff --check` — exit 0.
- Commit de implementación: `4133219a2cbd37ac0c40a0ef041fc3e3d36f4e29` — `feat(trainer): amplia variedad de retos de F10.1`.
- Commit de prueba del caso de una opción: `3cda9a4c2eb606d851c0ff6b4d6550a54fc70e11` — `test(trainer): cubre repaso con reto unico`.
- Ego Lite v2.2.0: fixture fake local; banco de tres tareas, sorteo de 2 tareas diferentes, pistas 1–3, progreso recuperado tras recarga, repaso, viewport 390×844 sin scroll horizontal (`innerWidth=scrollWidth=390`). Capturas/logs en `task-list/F10/evidence/`.

## Review/IA live

Fixture pública `VGMil-dev/fragments-test-app`, SHA exacto `e24fce1c998aec9b52d86d1d4a1a49d727936c5f`; Review terminó con 3 hallazgos `verified`. Trainer guardó 2 retos distintos en rutas separadas, descartó uno duplicado y repitió un completado como `review`. AI Gateway: `alibaba/qwen3.7-flash`, provider-only `alibaba`; 5 llamadas reales en total (1 Review en la corrida previa fallida y 4 llamadas asentadas en la corrida satisfactoria), USD 0.000294 confirmados. Corrida previa completó Review pero falló al rehidratar GitHub sin token; no se guardó coste exacto al limpiar DB temporal. Límite superior de esa llamada USD 0.00172; presupuesto del siguiente ledger USD 0.04828, por lo que gasto acumulado máximo ≤ USD 0.05. No se imprimieron secretos; el token GitHub local se usó en memoria solo para GET público.

## Privacidad y límite

- `git check-ignore -v` confirmó carpeta y archivo bajo `.gitignore:19`; `git ls-files task-list/F10/evidence` no devolvió rutas.
- Paquete de evidencia local: 20 archivos exactos, sin ZIP/subcarpetas; 9 PNG reales abrieron. La captura del login Inspector con autofill se eliminó y reemplazó por `16-inspector.md` sin datos personales.
- No se modificó el repo remoto, no se ejecutó código de la fixture, no hubo push ni deploy. `Fragments_Mentor_Plantilla_Propuesta.docx` permaneció sin stagear.

## Commit

`task-list/TASKS.md` marca F10.1 `[x]` y apunta al commit anterior. El cierre documental es un commit separado; no se reescribió historia. Estado Git final después del cierre: rama `codex/v0.3.0-trainer`, por delante de `origin/main`, sin cambios rastreados pendientes; permanece un DOCX local ajeno al task sin stagear.
