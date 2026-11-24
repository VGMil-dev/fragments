# Evidencia F16.19 — Mentor top stepper

## Estado

Delta accesible implementado, revisado, integrado en `main` y desplegado mediante F14 `v0.5.64`; el recorrido autenticado posterior al release se comprobó en solo lectura.

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
- Al momento de la primera revisión, PR/release/QA visual estaban pendientes; el historial de abajo conserva esa cronología.

## Registro de integración · 2026-11-24

- Commit de implementación: `227b882285e0764f18d45a7fda296a7d19ec728b`.
- PR, CI, integración a `main` y release: pendientes. Esta rama no se despliega.

### Estado observado antes de sincronizar PR · 2026-11-24

- PR [#251](https://github.com/VGMil-dev/fragments/pull/251) abierto normalmente contra `main`.
- Check `verify` run `45352035489`: **PENDING** al consultar; ese estado era previo a la sincronización final.
- Commit de evidencia en esa consulta: `9d6b141f8c749e4607c8e815a4c189a33175fbbc`.

### Reconciliación del head de PR · 2026-11-24

- En la comprobación, el branch remoto `codex/f16-19-mentor-top-stepper` apuntaba a `e9e9cc09a4b7f91fb918e2381a5d6cf4e5a6218f`, pero GitHub reportaba `9d6b141f8c749e4607c8e815a4c189a33175fbbc` tanto en la API del PR #251 como en `refs/pull/251/head`; el listado de commits del PR también terminaba en `9d6b141`.
- `main` y la base del PR permanecían en `89fad1cf1de4d1841b281b2eecd0b4812318c83f`. El check `verify` run `45352035489` estaba PASS para el head anterior; ese resultado no valida commits posteriores.
- La observación se registró con commit append-only y push normal; no se reescribió historia ni se forzó la actualización.

### Integración, release y Ego Lite · 2026-11-24

- PR [#251](https://github.com/VGMil-dev/fragments/pull/251) se integró normalmente en `main` mediante `23e588388252ec141deac06a52138ab6dceb1c42`; CI `45353431109` SUCCESS. El diff añade `aria-controls="mentor-proposal-form"` a cada uno de los seis botones del stepper y su test de regresión.
- F14 publicó la tag anotada `v0.5.64` sobre ese SHA; run `45354005819` SUCCESS. La versión productiva mostró `v0.5.64` y el SHA en su bundle; health `ok/database=ready`, API/web healthy, servicio de aplicación `Result=success`, `ExecMainStatus=0`, `ActiveState=inactive`.
- Ego Lite TaskSpace 60, sesión estudiantil existente, navegó sin escrituras desde Mis aulas a la propuesta propia vinculada y luego a Mentor. Se observó un formulario `mentor-proposal-form`, seis controles con `aria-controls` al formulario y exactamente una etapa `aria-current="step"`; el contexto quedó disponible. No se guardó ni evaluó.
- Reflujo por CDP a 320/390/768/1024/1440 CSS px: en cada tamaño el ancho scroll del documento coincidió con el ancho del área de cliente, sin desbordamiento horizontal.
- Navegación por teclado/foco manual, zoom 200 %, lector de pantalla, contraste formal, movimiento reducido y aceptación visual propietaria: **NO COMPROBADOS**. F16 permanece En validación.
