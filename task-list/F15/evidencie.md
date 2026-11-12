# F15 — Evidencia

## Estado

Implementación local completada. Queda pendiente crear/configurar la OAuth App de GitHub y validar el flujo externo real; no declarar OAuth externo probado.

## Preflight

- Base: `origin/main` actualizado en `2026-11-12`, SHA `704fe08c1932cdabed1303884eadf612625e94e7`.
- Rama: `codex/f15-github-gallery`.
- El worktree administrado falló por denegación de acceso a `.git/worktrees`; se creó un clon local aislado en `.worktrees/F15`. El checkout F14 y su archivo sin seguimiento `env` permanecieron intactos.
- Better Auth instalado: `1.7.17`; GitHub provider y `accountLinking.disableImplicitLinking` existen en los tipos instalados.
- Skills leídas: `skills/SKILLS_MATRIX.md`, `ego-browser` `2.2.0`.
- Commit de implementación: `c43aacb` (`feat(F15): identidad GitHub y galería académica`).
- El volumen D: es exFAT y pnpm no puede crear symlinks. La instalación aislada falló por esa limitación; se reutilizaron dependencias ya instaladas y binarios directos, sin modificar el lockfile ni descargar paquetes.

## Verificaciones

- API — `vitest run`: **28 archivos, 108 pruebas pasaron**.
- Web — `vitest run`: **15 archivos, 57 pruebas pasaron**.
- Contracts — `vitest run`: **1 archivo, 19 pruebas pasaron**.
- API typecheck — `tsc --noEmit -p apps/api/tsconfig.json`: **exit 0**.
- Web typecheck — `tsc --noEmit -p apps/web/tsconfig.json`: **exit 0**.
- Contracts typecheck/lint disponible — `tsc --noEmit -p packages/contracts/tsconfig.json` y `tsc --noEmit -p packages/contracts/tsconfig.test.json`: **exit 0**.
- API build — `tsc -p apps/api/tsconfig.json`: **exit 0**.
- Contracts build — `tsc -p packages/contracts/tsconfig.json`: **exit 0**.
- Web build — `vite build`: **exit 0**; Vite avisa que el bundle principal supera 500 kB (514.83 kB minificado).
- `git diff --check`: **sin errores** antes del commit de implementación.

Los comandos se ejecutaron con los binarios instalados del checkout existente porque el volumen no admite el enlace simbólico que requiere el layout estándar de pnpm.

## QA visual Ego Lite

- `/student/login` inspeccionada en escritorio y viewport móvil de 390 × 844; marca, botón, explicación de permisos y enlace docente visibles, sin desbordamiento horizontal aparente en la captura móvil.
- Capturas privadas: `evidence/student-login-desktop-full.png`, `evidence/student-login-mobile.png`.
- `/teacher/students` llegó al estado de error de red porque no se inició un servidor API visual para esta pasada; autenticación/roles y contenido docente se verificaron mediante pruebas de integración locales.

## OAuth y servicios externos

- GitHub OAuth real: no probado; requiere `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` y una aplicación OAuth externa autorizada.
- No se contactó AI Gateway, Moodle, GitHub OAuth ni destinos de despliegue. La actualización de referencia de `origin/main` sí fue solicitada en el encargo.

## Capturas privadas

Guardar en `task-list/F15/evidence/` (excluida de Git), máximo 20 archivos y sin datos de estudiantes reales.
