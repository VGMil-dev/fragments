# Informe final — UX-12 V7

**Estado: pruebas técnicas locales PASS; QA visual, integración y producción pendientes.** Implementé los dos cambios funcionales en commits independientes y un commit correctivo basado en fallos detectados por la suite. No se ha desplegado.

## Cambios y trazabilidad

- Branch local `codex/review-v7`, en worktree `D:\Dev\Trabajo\Fragments-review-v7`, basada en `origin/main` SHA `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`.
- Commit funcional de navegación: [`5f4bceecddc73cacb824580306e1dea9be3b14de`](../apps/web/src/features/student/StudentSidebar.tsx) — `feat(ui): redesign student sidebar following approved V7`.
- Commit funcional de Review: `0f8d4e1ea39298c47e3acd4f8a4dfb54fcf15225` — `feat(review): implement approved V7 repository and commit workflow`.
- Correcciones de integración: `a0781fd6666bde2d5428229e06b54ec7c966f5d2` — exports de iconos, mapeo API, SHA-1/SHA-256 y fixtures de 40 dígitos.
- `origin/main` vigente sigue en `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`; la rama no tiene avance externo nuevo al corte.
- PR: pendiente de publicación. Release/tag: no creados. Producción: sin cambio.

## Implementación

La navegación estudiantil ahora usa una barra lateral reutilizable con secciones académicas/herramientas, rutas existentes, identidad GitHub, cierre de sesión, menú móvil, estado activo y foco/skip link.

Review usa un flujo secuencial de tres pasos. Se copian los tres WebP originales, se validan repositorios públicos y commits desde endpoints autenticados del backend, se limita la lista a diez commits de la rama predeterminada y se resuelve el SHA completo antes de permitir la confirmación explícita «Evaluar commit». El motor existente y la vinculación académica se conservan.

Los assets quedaron en `apps/web/src/features/review/assets/`. Sus SHA-256 coinciden con los tres valores del `LEEME.md` adjunto. No se regeneraron.

## Verificación

- `git diff --check`: PASS.
- `git diff --cached --check`: PASS antes de los commits.
- Verificación SHA-256 de los 3 WebP: PASS.
- `pnpm install --frozen-lockfile --ignore-scripts --package-import-method=copy --store-dir D:\pnpm-store-review-v7-20261126`: PASS con 441 paquetes y lockfile intacto. Se aisló `node_modules` parcial en `D:\Dev\Trabajo\Fragments-review-v7-node_modules-eperm-backup`; sin procesos Node/pnpm activos.
- `pnpm test`: PASS — contracts 34/34; web 362/362; API 209 PASS y 82 SKIP condicionadas por bases de integración no provisionadas.
- `pnpm typecheck`: PASS en los tres paquetes. `pnpm lint`: PASS según tareas configuradas en Turbo (contracts). `pnpm build`: PASS; Vite reportó advertencias de `use client` originadas en lucide-react.
- Focal API: 9/9; Review/selection/sidebar: 33/33. Hallazgos encontrados y corregidos por estas pruebas: export de Github no disponible en lucide-react, referencia `Lightbulb` retirada accidentalmente, contrato `repo`, SHA de fixture de longitud inválida y edición URL en el estado de test incorrecto.
- Ego Lite `profiles()` confirma `Profile 5 — Estudiante`. La página de referencia HTML y billing se abrieron anteriormente; falta inspeccionar la app real desktop/móvil.
- CI `45735067192` y F14 `45731973140` son los workflows recientes con conclusión SUCCESS. Billing REST no informa cuota por scope `user` faltante; no se amplió. El historial demuestra disponibilidad reciente de Actions, no la cuota numérica restante.
- Comparación desktop/móvil, anchos 320 px, teclado, flujo real con perfil Estudiante, contexto desde misión y captura de implementación: pendientes; sin capturas comparativas todavía.

## VPS, cuota y F14

- Inventario SSH de solo lectura antes de implementar: ARM64, 77 GB libres de 193 GB; memoria disponible 8.2 GiB; 2 vCPU; producción y servicios vecinos activos. Mantenimiento selectivo: ninguno; espacio recuperado: 0 GB, porque no se pudo demostrar que imágenes/cachés estuvieran fuera de retención. No se tocaron contenedores, imágenes, bases, backups ni servicios vecinos.
- Billing de GitHub mostró US$11.33 de gasto metered en noviembre. La cuota restante de Actions no quedó expuesta en UI; API billing rechazó por falta de scope de usuario. Runs recientes de Actions y F14 continuaban exitosos; no hay evidencia de agotamiento.
- AGENTS.md prohíbe push, modificar `main` o publicar. F14 obliga tag anotada exacta, build/attestation hosted, entorno protegido, backup, pull agent verificado y ledger. No existe autorización para saltar controles: no se hizo despliegue manual ni se falsificó una attestation. El servidor conserva la versión operativa.
- Referencia de producción registrada en Notion (no revalidada en esta ronda): v0.5.95, SHA `3bda8bb843c33bf3e03973a4e773de96eb65bc4a`.

## Notion y límite de evidencia

La ficha UX-12 fue actualizada: V7 queda como diseño aprobado por el propietario y explicita que la fidelidad de la implementación sigue pendiente. [UX-12 · Review · Commit](https://app.notion.com/p/41ecd5fa7ed781dfa1bbfd35bc10ada3). Los tres assets canónicos están en el repositorio local. Sin capturas visuales aún; la evidencia de este paquete sigue constando de un archivo, dentro del máximo de 20.

## Próximo cierre necesario

Completar Ego Lite en desktop y móvil con `Profile 5 — Estudiante`; publicar PR y esperar checks/revisión; coordinar integración con Mi espacio V4 y Mis aulas V5 para una sola tag/releases F14; comprobar producción, salud, backup, rollback y servicios vecinos. Hasta entonces UX-12-V7 permanece parcial.
