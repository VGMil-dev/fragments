# F04 — Specification
**Objetivo:** Mentor propuestas, guía y entrega.
**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [ ] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [ ] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [ ] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [ ] Pruebas específicas: TDD de propuestas similares, snapshot, hash, PDF/README bajo demanda.
**No hacer:** No imponer aprobación docente.

## Integración autorizada — 2026-11-04

- [x] Mentor persiste propuestas versionadas, cambios con versión esperada, historial y galería solo con opt-in.
- [x] Comparaciones se calculan localmente sobre entradas opt-in.
- [ ] Evaluación Gateway real usa presupuesto/ledger compartido y reporta recibo: bloqueada hasta configurar tarifas máximas por millón de tokens. No realizar llamada si faltan tasas.
- [x] Ego Lite comprobó alta, edición, historial y opt-in vía API de la app local.
