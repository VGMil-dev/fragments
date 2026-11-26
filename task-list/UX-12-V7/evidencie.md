# UX-12-V7 — Evidencia

**Estado: COMPLETA, integrada y desplegada.** Review V7 y la barra lateral estudiantil están en producción. El footer compartido recibió un fix visual de seguimiento.

## Integración

- Branch de trabajo: `codex/review-v7`, worktree `D:\Dev\Trabajo\Fragments-review-v7`.
- Commits funcionales preservados: `5f4bceecddc73cacb824580306e1dea9be3b14de` (sidebar) y `0f8d4e1ea39298c47e3acd4f8a4dfb54fcf15225` (Review).
- Correcciones funcionales: `a0781fd6666bde2d5428229e06b54ec7c966f5d2`. Fix visual del footer: `afa9caa7d20673e4a96b149c4a9cbee03df69d93` (`fix(ui): keep student version badge compact`).
- PR #349 integró V7 en `0f48fff6bf44761ef7103507861a0c4d3c5b26dc`; PR #348 integró Mi espacio V4 en `15b5d965a8803d68a16faeb0ad5e21bdb8877855`; PR #350 integró Mis aulas V5 en `07a84f631dc2f670571908daddb6d33fa732521a`. Todas usaron merge normal y `verify` PASS.
- La QA productiva encontró que el footer estiraba el badge a 103×130 px en Mis aulas. PR #352 lo corrigió con `align-items:flex-end`, merge normal `0cfb841fa5031754c8770cff4db10fa4b2e4274f`; CI `45769664116` PASS. PR documental #353 agregó el hallazgo compartido, mergeada después; no cambió runtime.

## Bloqueo pnpm EPERM

- No había procesos Node/pnpm activos. El archivo que fallaba en `D:\.pnpm-store\v11` devolvía acceso denegado. Se apartó el `node_modules` parcial fuera del worktree, sin detener procesos.
- Instalación recuperada con `pnpm install --frozen-lockfile --ignore-scripts --package-import-method=copy --store-dir D:\pnpm-store-review-v7-20261126`: 441 paquetes, PASS; `pnpm-lock.yaml` sin cambios.

## Verificación técnica

- `pnpm test`: PASS. Contracts 34/34; web 351/351; API 209 PASS y 82 omitidas porque dependen de PostgreSQL de integración local (CI ejecutó PostgreSQL desechable).
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check`: PASS. La build conserva warnings de `use client` en lucide-react.
- Hashes SHA-256 de los tres WebP canónicos coinciden con el `LEEME.md` del kit V7.
- CI PR #349 run `45764662148`, PR #348 `45765184682`, PR #350 `45766994085` y follow-up #352 `45769664116`: todos `verify` SUCCESS.

## QA Ego Lite

- Perfil real `Profile 5 — Estudiante`, autenticado en `https://fragments.gavanti.org`; revisión de producción en `v0.5.97`.
- Review: la API de producción verificó el repositorio público `octocat/Hello-World`; se cargaron commits de `master`, se seleccionó el SHA `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` y se llegó a Confirmación. El aviso indica que IA empieza solo al pulsar “Evaluar commit”; no se pulsó ni se inició evaluación.
- Sidebar y rutas estudiantiles visibles. Mi espacio y las pestañas Aulas/Inventario/Solicitudes de Mis aulas cargaron autenticadas; no se enviaron formularios ni se alteraron datos.
- Producción 1440×900, 390×844 y 320×800: document/body no excedieron el viewport; menú móvil cambió `aria-expanded` false→true y conservó enlace a Review. En Mis aulas, badge final `101×28 px` con `v0.5.97 · 0cfb841`.
- Capturas recortadas para no incluir identidad ni datos académicos, en `UX-12-V7_EVIDENCIAS/`: `production-review-v0.5.97.png`, `production-sidebar-v0.5.97.png`, `production-version-badge-v0.5.97.png`. Junto con este informe son 4 archivos, por debajo del máximo de 20.

## F14 y producción

- Tag anotada `v0.5.96` → SHA `07a84f631dc2f670571908daddb6d33fa732521a`; run F14 `45767539848` SUCCESS; release ledger `459034994`, `deployed`.
- Fix tag anotada `v0.5.97` → SHA `0cfb841fa5031754c8770cff4db10fa4b2e4274f`; tag object `46826cefba401ced463445b7c48bf29a4d434720`; F14 run `45770050876` SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`; release ledger `459049941`, `deployed`.
- Backup final: `/var/backups/fragments/fragments-prod-2026-11-26T06-48-56-548Z.dump`, 98,420 bytes, SHA-256 `e4e308abfa3dfcc74687dcfc614d918f1f1859006df134e889b4e527db2b8d76`, `restored_to_temporary_database`. Archivo y ledger coincidieron.
- API/web `healthy` en `sha-0cfb841fa5031754c8770cff4db10fa4b2e4274f`; `/health` HTTP 200 con `ok/database=ready`; bundle `/assets/index-CzhqWXHw.js` incluye versión y SHA exactos.
- Imágenes anteriores de `v0.5.96` permanecen presentes para rollback ordinario; no se ejerció rollback. Poll timer, apply path y cloudflared activos; `systemctl --failed` vacío. PostgreSQL, Pits, Tymeslot e ImagenEC continuaron arriba/healthy. No hubo despliegue manual, limpieza, migraciones ni cambios a gates.
- GitHub Actions estuvo operativa: CI #352 y F14 #45770050876 terminaron correctamente. No se obtuvo lectura numérica de cuota disponible; no se asumió que estuviera agotada.

## Notion

Ficha UX-12 actualizada: [UX-12 · Review · Commit](https://app.notion.com/p/41ecd5fa7ed781dfa1bbfd35bc10ada3).
