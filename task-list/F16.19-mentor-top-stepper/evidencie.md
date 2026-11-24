# Evidencia F16.19 — Mentor top stepper

## Estado

Delta accesible implementado y verificado localmente; PR y revisión integradora pendientes. No se hace release.

## Brecha y cambio

- En `origin/main` (`89fad1c`) ya existían el stepper superior de seis etapas, estados derivados del borrador/contexto/evaluación, etapa única visible, progreso por campos válidos, navegación compacta y acciones de guardado. No se reimplementó esa base ni se recuperó un submenú.
- Brecha concreta: los seis controles cambiaban el contenido del formulario, pero no expresaban la relación de control en el árbol accesible. Añadí `aria-controls="mentor-proposal-form"` a cada botón de etapa.
- Test de regresión: una navegación con seis botones, cada botón controla el mismo formulario único, y el stepper aparece antes de ese formulario.

## Verificación

- TDD: el nuevo test falló antes del atributo y pasó después.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` — PASS, 44/44.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Advertencias existentes: chunk principal superior a 500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.
- QA visual/authenticated Ego Lite, tab-order real, zoom 200 %, lector de pantalla, contraste formal y aprobación visual propietaria: **NO COMPROBADOS**. No se usaron assets candidatos ni se declara aprobación de Pixel Night.
- Commit y PR: pendientes de registrar.

## Registro de integración · 2026-11-24

- Commit de implementación: `227b882285e0764f18d45a7fda296a7d19ec728b`.
- PR, CI, integración a `main` y release: pendientes. Esta rama no se despliega.

### Actualización de PR · 2026-11-24

- PR [#251](https://github.com/VGMil-dev/fragments/pull/251) abierto normalmente contra `main`.
- Check `verify` run `45352035489`: **PENDING** al consultar; merge e integración no comprobados.
- Commit de evidencia: `9d6b141f8c749e4607c8e815a4c189a33175fbbc` antes de esta actualización.

### Reconciliación del head de PR · 2026-11-24

- En la comprobación, el branch remoto `codex/f16-19-mentor-top-stepper` apuntaba a `e9e9cc09a4b7f91fb918e2381a5d6cf4e5a6218f`, pero GitHub reportaba `9d6b141f8c749e4607c8e815a4c189a33175fbbc` tanto en la API del PR #251 como en `refs/pull/251/head`; el listado de commits del PR también terminaba en `9d6b141`.
- `main` y la base del PR permanecían en `89fad1cf1de4d1841b281b2eecd0b4812318c83f`. El check `verify` run `45352035489` estaba PASS para el head anterior; ese resultado no valida commits posteriores.
- Se registra esta observación mediante un commit append-only y push normal para solicitar la actualización del head y el CI. No se reescribió historia ni se forzó la actualización. El nuevo CI y la sincronización del PR quedan pendientes de comprobación.
