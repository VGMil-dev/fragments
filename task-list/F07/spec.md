# F07 — Specification
**Objetivo:** Integración, QA y release local.
**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [ ] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [ ] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [ ] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [ ] Pruebas específicas: pnpm lint/typecheck/test/build; compose up; E2E; Promptfoo.
**No hacer:** No declarar DONE con bloqueos.

## Registro histórico de integración — 2026-11-04

- [x] Build, tests, typecheck, lint configurado y diff check locales.
- [x] API/Web se verificaron desde Ego Lite; Review/Inspector protegida y Mentor edición/galería se comprobaron localmente.
- [ ] Vista móvil/capturas: Ego Lite reportó viewport 0×0 en esa ejecución.
- [ ] Promptfoo: la CLI descargada no arrancó en esa ejecución.
- [ ] Pruebas Gateway: no se realizaron en esa ejecución.
- [x] Sin Playwright y sin despliegue.

## Verificación integrada — 2026-11-05

- [x] `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint` y `git diff --check` aprobados; detalle y comandos en `evidencie.md`.
- [x] `npx.cmd --yes promptfoo@0.125.1 eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table` desde `evals/`: 3/3 fixtures locales aprobados; sin proveedor de pago.
- [x] Docker Compose construyó e inició el API; `/health` respondió listo. Una propuesta con opt-in siguió en Galería tras `docker compose restart api`. El volumen `fragments_fragments-data` se conservó.
- [x] Ego Lite v2.2.0 mostró viewport 982×921, login docente, sesión, reto, asignación, defensa y logout; el acceso anónimo devolvió 401.
- [ ] Responsive a 390px y captura móvil: el API Ego Lite no permitió cambiar el viewport con los controles disponibles; no se afirma QA móvil. Captura de escritorio: `screenshots/inspector-desktop.png`.
- No se ejecutó código de repositorios estudiantiles ni Playwright/Puppeteer/Cypress; no hubo despliegue.
