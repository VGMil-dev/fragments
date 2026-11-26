# UX-12-V7 — Evidencia

## Base y commits

- Fuente de trabajo: worktree `D:\Dev\Trabajo\Fragments-review-v7`, rama `codex/review-v7`, creada desde `origin/main` actualizado a `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`. Checkout original y sus cambios no se tocaron.
- Commit 1 sidebar: `5f4bceecddc73cacb824580306e1dea9be3b14de` — `feat(ui): redesign student sidebar following approved V7`.
- Commit 2 Review: `0f8d4e1ea39298c47e3acd4f8a4dfb54fcf15225` — `feat(review): implement approved V7 repository and commit workflow`.
- Fixes de integración: `a0781fd6666bde2d5428229e06b54ec7c966f5d2` — iconos exportados, mapeo API, SHA 40/64 y fixtures válidos.

## Verificaciones ejecutadas

- `git diff --check`: PASS (sin whitespace errors).
- `git diff --cached --check`: PASS antes de cada commit.
- `Get-FileHash apps\web\src\features\review\assets\*.webp`: los tres hashes coinciden con el manifiesto `LEEME.md` del kit V7.
- `pnpm install --frozen-lockfile --ignore-scripts --package-import-method=copy --store-dir D:\pnpm-store-review-v7-20261126`: PASS, 441 paquetes instalados; lockfile sin cambios. El store compartido `D:\.pnpm-store\v11` tenía acceso denegado al archivo que falló. Se apartó el `node_modules` parcial a `D:\Dev\Trabajo\Fragments-review-v7-node_modules-eperm-backup`; no se detuvieron procesos (no había pnpm/Node activos).
- `pnpm test`: PASS; contracts 34/34, web 362/362, API 209 passed y 82 skipped por bases de datos de integración no provisionadas (74 test files API de las cuales 20 omitieron suites/escenarios condicionados).
- `pnpm typecheck`: PASS en los 3 paquetes. `pnpm lint`: PASS (el pipeline Turbo aplica lint al paquete contracts). `pnpm build`: PASS en web, API y contracts; Vite emite warnings preexistentes de directiva `use client` en lucide-react.
- Pruebas focales: API `github-rest-client.test.ts` + `repository-catalog-http.test.ts`, 9/9; web Review, repository selection y StudentSidebar, 33/33. Corregidos al detectar la suite completa: icono Github ausente, import Lightbulb de la landing, shape de repo, SHA de fixture (39 caracteres) y un test que intentaba editar la URL desde el paso Commit.
- Perfil Ego Lite verificado mediante `profiles()`: `Estudiante` corresponde actualmente a `Profile 5`. En Ego Lite local con API fixture etiquetada se verificaron selección de repositorio, lista de 10 commits, selección explícita, pantalla de confirmación sin ejecutar evaluación, navegación atrás, SHA manual verificado y responsive a 390/320 px. QA de rutas adicionales y comprobación productiva después del despliegue siguen pendientes.
- Inventario VPS por SSH (solo lectura, previo a cambios): servicio activo, ARM64/aarch64, 77 GB disponibles en disco (193 GB total, 117 GB usados), 8.2 GiB memoria disponible, 2 vCPU; servicios vecinos y runner compartido activos. No se hizo mantenimiento porque no se acreditó elegibilidad de retención para imágenes/cachés; no hubo cambio, espacio recuperado 0.
- Billing web GitHub: noviembre 2026 metered $11.33. Minutos/cuota restantes de Actions no visibles en la página revisada. REST billing de usuario devolvió 404 por falta de scope `user`; no se amplió token. Runs API muestra workflows recientes, incluido F14 run `45731973140` SUCCESS al 2026-11-26 00:53Z; no prueba cuota remanente.

## Verificaciones bloqueadas / no realizadas

- Comparación visual app vs HTML: completada en Ego Lite local; capturas originales están en `C:\Users\vgmil\ego\fragments-review-v7-round2\` (no copiadas aún al paquete, límite 20). Revisión visual productiva después del despliegue, rutas restantes y teclado: PENDIENTES.
- Notion: ficha UX-12 actualizada con aprobación del diseño V7 por el propietario y distinción explícita entre aprobación del diseño y QA de implementación pendiente.
- PR, integración a main, tag/release y producción: PENDIENTES. F14 exige tag anotada, artefacto hosted con attestation, gate de aprobación, backup/rollback y pull agent verificado. No se fabricará atestación ni se alterará el ledger. Estado productivo de referencia en Notion: v0.5.95 / SHA `3bda8bb843c33bf3e03973a4e773de96eb65bc4a`; revalidar antes de release.
- GitHub: runs visibles más recientes incluyeron CI `45735067192` SUCCESS (01:20Z) y F14 `45731973140` SUCCESS (00:53Z). API de uso de billing devolvió 404 por scope `user` faltante; no se amplió token. Actions estuvo procesando workflows recientemente, aunque no hay lectura numérica de cuota restante.
- Informe comparativo/capturas, release, backup y salud productiva: PENDIENTES.

## Cierre

Tarea PARCIAL. Los dos commits funcionales originales y un commit de corrección están localmente listos; visual QA local está completa y la PR/CI, integración, QA productiva y despliegue F14 siguen pendientes.
- Notion actualizado: ficha [UX-12 · Review · Commit](https://app.notion.com/p/41ecd5fa7ed781dfa1bbfd35bc10ada3) registra la referencia V7 aprobada por el propietario y deja la fidelidad de implementación como pendiente de navegador.
- Paquete de evidencia generado: `UX-12-V7_EVIDENCIAS/INFORME_FINAL.md` (1 archivo; máximo permitido: 20).
