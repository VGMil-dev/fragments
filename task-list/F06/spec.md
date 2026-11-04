# F06 — Specification
**Objetivo:** Inspector privado y pruebas E2E.
**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [ ] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [ ] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [ ] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [ ] Pruebas específicas: tests retos inversos, opt-in, old commit archived, screenshots.
**No hacer:** No revelar hints a alumnos.
