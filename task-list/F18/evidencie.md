# F18 — Evidencia

Estado: IN PROGRESS.

## Preflight

- Rama base solicitada: `origin/main` en `9c8cc62600e3a20019e5e7668cf0ba0765365c8e`, coincidente con el release desplegado.
- Worktree aislado: `C:\Users\vgmil\.codex\worktrees\f18-review-path\Fragments`.
- Skills: `test-driven-development` y `verification-before-completion` leídas y aplicadas; `backend-architecture` revisada y descartada por ser un arreglo localizado ya diagnosticado.
- Credenciales no leídas ni registradas. El token de GitHub solo se comprobará en producción mediante presencia/booleano.

## Cambios y verificación

- TDD rojo confirmado: `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` falló primero en aceptación Unicode/espacios y detección de `.`; `pnpm --filter @fragments/api test -- src/adapters/github/github-rest-client.test.ts` inicial no pudo resolver el paquete compartido sin compilarlo.
- Implementación: el contrato conserva rutas relativas de hasta 512 caracteres con Unicode imprimible y espacios; bloquea rutas absolutas, unidades Windows absolutas, controles, barras invertidas, segmentos vacíos y `.`/`..`. El adaptador convierte errores Zod del snapshot a `snapshot_validation`/`SNAPSHOT_INVALID` permanente. `evaluatorVersion` pasó a `gateway-structured-v2` para obtener una clave idempotente distinta.
- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` — PASS, 21/21.
- `pnpm --filter @fragments/api exec vitest run src/adapters/github/github-rest-client.test.ts` — PASS, 6/6.
- `pnpm exec turbo run test typecheck lint build` — PASS, repetido sobre el estado final: 10/10 tareas; contratos 21/21, API 150/150 y web 95/95. Build web emitió avisos de directivas `use client` de `lucide-react`.
- `git diff --check` — PASS (salida 0).
- Commit pendiente.

## Release y reintento

Pendiente. Tag objetivo: `v0.4.11`. El despliegue debe respetar gates F14; el reintento real debe ser único.
