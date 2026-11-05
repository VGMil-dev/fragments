# F07 — Specification
**Objetivo:** Integración, QA y release local.
**Criterios de aceptación**
- [x] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [x] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [x] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [x] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [x] Pruebas específicas: pnpm lint/typecheck/test/build; compose up; E2E; Promptfoo.
**No hacer:** No declarar DONE con bloqueos.

## Registro histórico de integración — 2026-11-04

- [x] Build, tests, typecheck, lint configurado y diff check locales.
- [x] API/Web se verificaron desde Ego Lite; Review/Inspector protegida y Mentor edición/galería se comprobaron localmente.
- [x] Vista móvil/capturas: el registro del 2026-11-05 resolvió el viewport con `page.cdp` y guardó capturas 390×844 y 1440×900.
- [x] Promptfoo: se ejecutó localmente con proveedor fake, 3/3 casos aprobados.
- [x] Pruebas Gateway: la evidencia de F04–F06 se conserva; no se repitieron llamadas externas durante el cierre visual.
- [x] Sin Playwright y sin despliegue.

## Verificación integrada — 2026-11-05

- [x] `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint` y `git diff --check` aprobados; detalle y comandos en `evidencie.md`.
- [x] `npx.cmd --yes promptfoo@0.125.1 eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table` desde `evals/`: 3/3 fixtures locales aprobados; sin proveedor de pago.
- [x] Docker Compose construyó e inició el API; `/health` respondió listo. Una propuesta con opt-in siguió en Galería tras `docker compose restart api`. El volumen `fragments_fragments-data` se conservó.
- [x] Ego Lite v2.2.0 mostró viewport 982×921, login docente, sesión, reto, asignación, defensa y logout; el acceso anónimo devolvió 401.
- [x] Responsive a 390px y captura móvil: `page.cdp("Emulation.setDeviceMetricsOverride", ...)` configuró viewport 390×844; se verificaron Mentor, Review e Inspector. Capturas desktop 1440×900.
- [x] F07 se cerró el 2026-11-05; la limitación histórica fue de procedimiento, no de capacidad de Ego Lite.
- No se ejecutó código de repositorios estudiantiles ni Playwright/Puppeteer/Cypress; no hubo despliegue.
