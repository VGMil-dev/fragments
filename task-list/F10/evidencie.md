# F10 — Evidencia de Trainer

Estado: COMPLETADA. Owner: PLANNER. Rama: `codex/v0.3.0-trainer`, desde `origin/main` (`8fcd6c14b218658e5ad281caab8e70f8f28ceca6`). Commits: `5acc0b206b5c1fe29ed35b987837aa411e340f79` (implementación) y `66a643d700462696b0a4fa5a51da2093208216f2` (persistencia SQLite).

## Implementación

- Backend Trainer: `apps/api/src/features/trainer/` (servicio, SQLite, schemas HTTP y tests). Migración v6 en `apps/api/src/db/migrate.ts`.
- Composición y Review: `apps/api/src/main.ts`, `apps/api/src/http/app.ts`, `apps/api/src/features/review/sqlite-store.ts`.
- Resumen privado de prácticas para Inspector: `apps/api/src/features/inspector/service.ts`, `apps/api/src/adapters/ai/gateway-inspector-provider.ts`.
- UI responsive: `apps/web/src/features/trainer/`, `apps/web/src/lib/api/trainer-api.ts`, `apps/web/src/App.tsx`.
- E2E Ego Lite con fixtures locales etiquetados: `task-list/F10/ego-fixture.mjs`.
- Privacidad de evidencias: regla `/task-list/F10/evidence/` añadida a `.gitignore`.

## Verificación fresca

- `ego-browser skill` — v2.2.0 ejecutada antes de cualquier uso de navegador.
- Ego Lite, viewport escritorio: Review fixture `fragments-fixture/trainer-demo`, SHA sintético `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`; sorteo, pistas 1–3, guardado `in_progress`, recarga y recuperación del historial, finalización y nuevo sorteo `review`. API Inspector respondió `401 AUTH_REQUIRED` sin docente.
- Ego Lite, viewport móvil 390×844: `innerWidth=390`, `scrollWidth=390`; sorteo y pista visibles.
- `$env:CI='true'; pnpm exec turbo test --force` — exit 0, sin caché; contracts 18/18, API 83/83, web 52/52.
- `$env:CI='true'; pnpm exec turbo typecheck --force` — exit 0, 4 tareas.
- `$env:CI='true'; pnpm exec turbo build --force` — exit 0, 3 paquetes.
- `$env:CI='true'; pnpm exec turbo lint --force` — exit 0; lint declarado en contracts.
- `git diff --check` — exit 0.
- Persistencia: `apps/api/src/features/trainer/repository.test.ts` cierra y reabre una base SQLite de archivo y recupera banco, intento y resumen.
- No se llamaron GitHub ni AI Gateway. Proveedor usado en UI/tests: `fake-provider:ego-fixture`; llamadas reales 0; coste real USD 0.

## Capturas locales

Diez PNG reales de Ego Lite están en `task-list/F10/evidence/`: `08-trainer-inicio.png`, `09-repositorio.png`, `10-sorteo.png`, `11-reto.png`, `12-pistas.png`, `13-progreso.png`, `14-historial.png`, `15-repaso.png`, `16-inspector.png`, `17-movil.png`. Se abrieron para inspección. Los escenarios, pasos y limitaciones están en `evidence/04-recorrido.md`.

## Errores y correcciones

- La primera suite general detectó que `apps/api/src/db/open.test.ts` aún esperaba cinco migraciones; al agregar v6 se actualizó a seis y se añadió una comprobación de la tabla Trainer.
- Durante el primer recorrido Ego Lite, un locator de texto encontró dos coincidencias para el estado completado. Se volvió a observar el DOM y se continuó con el botón/ref actual; el flujo terminó correctamente y la captura de repaso corresponde al estado visible.
- La primera sincronización pnpm no tuvo TTY. El runtime se restableció con el lockfile congelado y un store local; no se modificó `pnpm-lock.yaml`.

## Git y límites

- `git check-ignore -v` confirma que carpeta y archivos de evidencia son ignorados en `.gitignore:19`; `git ls-files task-list/F10/evidence` no devolvió rutas.
- `task-list/F10/evidence/` contiene exactamente 20 archivos, 0 subcarpetas y ningún ZIP. El manifiesto enumera cada ruta.
- No hay credenciales ni datos personales: proveedor fake y repositorio/commit sintéticos, no se usaron cookies o cuentas reales.
- Limitaciones: un reto por Review/commit, sin generación IA real, sin Review GitHub live, historial anónimo vinculado al navegador y sin limpieza física de sesiones expiradas. Ver `task-list/F10/evidence/07-limitaciones.md`.
