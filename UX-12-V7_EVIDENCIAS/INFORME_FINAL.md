# Informe final — UX-12 V7

**Estado: parcial; no desplegado.** Implementé dos cambios independientes en una rama local. No afirmo QA visual aprobado ni release/deploy porque el entorno de dependencias falló y F14/las instrucciones del repositorio impiden publicar por una ruta directa no atestada.

## Cambios y trazabilidad

- Branch local `codex/review-v7`, en worktree `D:\Dev\Trabajo\Fragments-review-v7`, basada en `origin/main` SHA `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`.
- Commit funcional de navegación: [`5f4bceecddc73cacb824580306e1dea9be3b14de`](../apps/web/src/features/student/StudentSidebar.tsx) — `feat(ui): redesign student sidebar following approved V7`.
- Commit funcional de Review: `0f8d4e1ea39298c47e3acd4f8a4dfb54fcf15225` — `feat(review): implement approved V7 repository and commit workflow`.
- PR: no creada. Release/tag: no creados. Producción: sin cambio.

## Implementación

La navegación estudiantil ahora usa una barra lateral reutilizable con secciones académicas/herramientas, rutas existentes, identidad GitHub, cierre de sesión, menú móvil, estado activo y foco/skip link.

Review usa un flujo secuencial de tres pasos. Se copian los tres WebP originales, se validan repositorios públicos y commits desde endpoints autenticados del backend, se limita la lista a diez commits de la rama predeterminada y se resuelve el SHA completo antes de permitir la confirmación explícita «Evaluar commit». El motor existente y la vinculación académica se conservan.

Los assets quedaron en `apps/web/src/features/review/assets/`. Sus SHA-256 coinciden con los tres valores del `LEEME.md` adjunto. No se regeneraron.

## Verificación

- `git diff --check`: PASS.
- `git diff --cached --check`: PASS para ambos commits.
- Verificación SHA-256 de los 3 WebP: PASS.
- Ego Lite abrió el HTML de referencia y la página de billing de GitHub. No se abrió la app local porque los binarios Vite/Vitest requeridos no estaban instalados.
- `pnpm install --frozen-lockfile --ignore-scripts`: FAIL por `ERR_PNPM_EPERM` al copiar desde el store de pnpm y recuperar paquetes de registry; `vitest`/`tsc` no estaban disponibles. Tests, typecheck, lint y build: NO EJECUTADOS.
- Comparación desktop/móvil de la implementación, anchos 320 px, teclado, flujo funcional, contexto desde misión, y QA de rutas: NO EJECUTADOS. No hay capturas comparativas.

## VPS, cuota y F14

- Inventario SSH de solo lectura antes de implementar: ARM64, 77 GB libres de 193 GB; memoria disponible 8.2 GiB; 2 vCPU; producción y servicios vecinos activos. Mantenimiento selectivo: ninguno; espacio recuperado: 0 GB, porque no se pudo demostrar que imágenes/cachés estuvieran fuera de retención. No se tocaron contenedores, imágenes, bases, backups ni servicios vecinos.
- Billing de GitHub mostró US$11.33 de gasto metered en noviembre. La cuota restante de Actions no quedó expuesta en UI; API billing rechazó por falta de scope de usuario. Runs recientes de Actions y F14 continuaban exitosos; no hay evidencia de agotamiento.
- AGENTS.md prohíbe push, modificar `main` o publicar. F14 obliga tag anotada exacta, build/attestation hosted, entorno protegido, backup, pull agent verificado y ledger. No existe autorización para saltar controles: no se hizo despliegue manual ni se falsificó una attestation. El servidor conserva la versión operativa.
- Referencia de producción registrada en Notion (no revalidada en esta ronda): v0.5.95, SHA `3bda8bb843c33bf3e03973a4e773de96eb65bc4a`.

## Notion y límite de evidencia

La ficha UX-12 fue actualizada: V7 queda como diseño aprobado por el propietario y explicita que la fidelidad de la implementación sigue pendiente. [UX-12 · Review · Commit](https://app.notion.com/p/41ecd5fa7ed781dfa1bbfd35bc10ada3). Los tres assets canónicos están en el repositorio local; no se adjuntaron capturas visuales sin validar. La evidencia de este paquete consta de un solo archivo, dentro del máximo de 20.

## Próximo cierre necesario

Ejecutar pruebas/typecheck/lint/build y comparación Ego Lite en un entorno con dependencias disponibles; corregir hallazgos; completar PR e integración permitidas; crear una release aprobada por F14 y comprobar producción, salud, backup, rollback y servicios vecinos. Hasta entonces UX-12-V7 permanece parcial.
