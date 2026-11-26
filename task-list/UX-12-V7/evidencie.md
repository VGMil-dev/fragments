# UX-12-V7 — Evidencia

## Base y commits

- Fuente de trabajo: worktree `D:\Dev\Trabajo\Fragments-review-v7`, rama `codex/review-v7`, creada desde `origin/main` actualizado a `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`. Checkout original y sus cambios no se tocaron.
- Commit 1 sidebar: `5f4bceecddc73cacb824580306e1dea9be3b14de` — `feat(ui): redesign student sidebar following approved V7`.
- Commit 2 Review: `0f8d4e1ea39298c47e3acd4f8a4dfb54fcf15225` — `feat(review): implement approved V7 repository and commit workflow`.

## Verificaciones ejecutadas

- `git diff --check`: PASS (sin whitespace errors).
- `git diff --cached --check`: PASS antes de cada commit.
- `Get-FileHash apps\web\src\features\review\assets\*.webp`: los tres hashes coinciden con el manifiesto `LEEME.md` del kit V7.
- Inventario VPS por SSH (solo lectura, previo a cambios): servicio activo, ARM64/aarch64, 77 GB disponibles en disco (193 GB total, 117 GB usados), 8.2 GiB memoria disponible, 2 vCPU; servicios vecinos y runner compartido activos. No se hizo mantenimiento porque no se acreditó elegibilidad de retención para imágenes/cachés; no hubo cambio, espacio recuperado 0.
- Billing web GitHub: noviembre 2026 metered $11.33. Minutos/cuota restantes de Actions no visibles en la página revisada. REST billing de usuario devolvió 404 por falta de scope `user`; no se amplió token. Runs API muestra workflows recientes, incluido F14 run `45731973140` SUCCESS al 2026-11-26 00:53Z; no prueba cuota remanente.

## Verificaciones bloqueadas / no realizadas

- `pnpm install --frozen-lockfile --ignore-scripts`: bloqueado por `[ERR_PNPM_EPERM]` copiando paquetes desde `D:\.pnpm-store\v11` a `node_modules`; registry devuelve `ERR_PNPM_EPERM`. Se interrumpió un intento duplicado que reintentaba instalar el workspace. No editar lockfile.
- Tests, typecheck, lint, build, comparación visual app vs HTML, 320 px, teclado/E2E y revisión de UX-12: NO EJECUTADOS porque no están disponibles los binarios/dependencias requeridos.
- Notion: ficha UX-12 vigente consultada; requiere todavía registrar resultado de esta implementación.
- PR, integración a main, tag/release y producción: NO REALIZADOS. AGENTS.md prohíbe push/tocar main; F14 especifica tag anotado, artefacto hosted attested, gate de aprobación y pull agent verificado, no despliegue directo ni bypass. No se fabricó atestación ni se alteró ledger. Estado productivo de referencia del Notion: v0.5.95 / SHA `3bda8bb843c33bf3e03973a4e773de96eb65bc4a`, pero no se revalidó durante este trabajo.
- Informe comparativo/capturas finales, estado consolidado F05/F16/F17, release y salud productiva: PENDIENTES.

## Cierre

Tarea PARCIAL. Los dos commits locales están listos para revisión en su branch. La UI no se declara visualmente aprobada y el deploy no se declara completado. Reanudar cuando puedan ejecutarse verificaciones en el entorno de dependencias correcto y la integración/release pase por F14 sin omitir sus controles.
- Notion actualizado: ficha [UX-12 · Review · Commit](https://app.notion.com/p/41ecd5fa7ed781dfa1bbfd35bc10ada3) registra la referencia V7 aprobada por el propietario y deja la fidelidad de implementación como pendiente de navegador.
- Paquete de evidencia generado: `UX-12-V7_EVIDENCIAS/INFORME_FINAL.md` (1 archivo; máximo permitido: 20).
