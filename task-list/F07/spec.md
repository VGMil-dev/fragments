# F07 — Specification
**Objetivo:** Integración, QA y release local.
**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [ ] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [ ] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [ ] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [ ] Pruebas específicas: pnpm lint/typecheck/test/build; compose up; E2E; Promptfoo.
**No hacer:** No declarar DONE con bloqueos.

## Seguimiento de integración autorizada — 2026-11-04

- [x] Build, tests, typecheck, lint configurado y diff check locales.
- [x] API/Web se verificaron desde Ego Lite; Review/Inspector protegida y Mentor edición/galería se comprobaron localmente.
- [ ] Vista móvil/capturas: Ego Lite reportó viewport 0×0 en esta ejecución.
- [ ] Promptfoo: CLI descargada, pero eval bloqueado por `ERR_MODULE_NOT_FOUND @nodable/entities` en `fast-xml-parser@5.12.0`.
- [ ] Pruebas Gateway: no realizadas porque no hay tarifas verificables; IA externa USD 0.
- [x] Sin Playwright y sin despliegue.
