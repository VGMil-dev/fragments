# F18 — Evidencia

Estado: COMPLETADA.

## Preflight

- Rama base solicitada: `origin/main` en `9c8cc62600e3a20019e5e7668cf0ba0765365c8e`, coincidente con el release desplegado.
- Worktree aislado: `C:\Users\vgmil\.codex\worktrees\f18-review-path\Fragments`.
- Skills: `test-driven-development` y `verification-before-completion` leídas y aplicadas; `backend-architecture` revisada y descartada por ser un arreglo localizado ya diagnosticado.
- No se leyeron ni registraron credenciales.

## Cambios y verificación

- TDD rojo confirmado: `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` falló primero en aceptación Unicode/espacios y detección de `.`; `pnpm --filter @fragments/api test -- src/adapters/github/github-rest-client.test.ts` inicial no pudo resolver el paquete compartido sin compilarlo.
- Implementación: el contrato conserva rutas relativas de hasta 512 caracteres con Unicode imprimible y espacios; bloquea rutas absolutas, unidades Windows absolutas, controles, barras invertidas, segmentos vacíos y `.`/`..`. El adaptador convierte errores Zod del snapshot a `snapshot_validation`/`SNAPSHOT_INVALID` permanente. `evaluatorVersion` pasó a `gateway-structured-v2` para obtener una clave idempotente distinta.
- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` — PASS, 21/21.
- `pnpm --filter @fragments/api exec vitest run src/adapters/github/github-rest-client.test.ts` — PASS, 6/6.
- `pnpm exec turbo run test typecheck lint build` — PASS, repetido sobre el estado final: 10/10 tareas; contratos 21/21, API 150/150 y web 95/95. Build web emitió avisos de directivas `use client` de `lucide-react`.
- `git diff --check` — PASS (salida 0).
- Commit de implementación `68f51a4f90c3d9e933f93b8becfd3639b10fa4e1`; PR #48 integrado con merge `ca55c37e1b5273391f29838137ef8d3ea8e2c305`. Check `verify`, run `44463695543`, SUCCESS.

## Release y reintento

- Tag anotada `v0.4.11` apunta al commit de `main` `ca55c37e1b5273391f29838137ef8d3ea8e2c305`. Release run F14 `44463912769`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; el mantenedor aprobó el entorno protegido `fragments-production`, sin bypass. Release publicado el 2026-11-19.
- Producción: `https://fragments.gavanti.org/health` respondió HTTP 200 y `database=ready`. El bundle servido incluyó metadata `v0.4.11` y el SHA de `main` esperado.
- Revisión real única del mismo commit exacto: nuevo trabajo `72c2a1bb-e469-4691-994b-c7b66b007c6e`, estado `completed`, puntaje 85, actualizado `2026-11-19T05:23:35Z`. El intento previo permaneció `failed` con su timestamp original; no se modificó SQLite manualmente. Se comprobó el resultado por HTTP sin registrar rutas ni contenido evaluado.
- No se leyeron ni imprimieron tokens o valores de `.env`.
