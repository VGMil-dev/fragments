# F00 — Specification
**Objetivo:** Escaffold y contratos del monorepo.
**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada.
- [ ] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [ ] GIVEN repositorio sin credenciales, WHEN se ejecuta en entorno limpio, THEN funciona offline con fake driver o documenta bloqueo.
- [ ] GIVEN rama o commit ajeno, THEN se respeta seguridad de contratos y límites.
- [ ] Pruebas específicas: turbo build/typecheck; pnpm install --frozen-lockfile; git status; comprobar backup.
**No hacer:** No tocar main ni limpiar antes de respaldo y permiso.


## Gate obligatorio — credenciales
- Given repo inspeccionado y skills leídas, when arranca planner, then crea `.env.example`, `.env` no versionado, `.gitignore` y `docs/ENV_SETUP.md` sin exponer secretos.
- Given `.env` sin confirmar, when intenta despachar workers o probar Gateway, then DEBE detenerse y solicitar confirmación humana.
- Given confirmación, when preflight, then muestra únicamente nombres de variables faltantes, nunca valores; si no es válido, continúa bloqueado.
- `.env` existente jamás se sobrescribe; no hay credenciales Moodle.
