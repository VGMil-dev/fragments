# F17.18 — Evidencia Mi espacio V4

## Estado

Implementación, integración, release y verificación de producción completadas el 2026-11-26. El estado visual UX-01 permanece Candidata hasta aprobación visual del propietario.

## Aislamiento y referencia

- Worktree: `.worktrees/mi-espacio-v4`.
- Rama: `codex/mi-espacio-v4`.
- Base inicial: `origin/main` SHA `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783` (`2026-11-25T20:22:30-05:00`).
- El checkout principal conservó su estado inicial con cambios preexistentes; no se editaron archivos fuente allí.
- El worktree externo `D:\Dev\Trabajo\Fragments-review-v7` conserva cambios adicionales sin commit sobre tres commits de Review/sidebar; no se tocó. La rama aún no se publicó.
- `C:\Users\vgmil\.codex\worktrees\mis-aulas-v5\Fragments` conserva un cambio sin commit; no se tocó. No se incorporaron archivos de otros worktrees.
- Kit verificado contra los hashes SHA-256 que declara `LEEME.md`; solo se copiaron los dos WebP. El ZIP y el HTML no se incorporaron al runtime.
- `ego-browser skill` ejecutado; guía completa v2.2.1 Windows. `profiles()` lista `Profile 5` con nombre `Estudiante` como predeterminado; el usuario autorizó expresamente usarlo para QA de producción post-despliegue. Comparación local y post-release pendientes.

## Cambios implementados

- [StudentDashboard.tsx](../../apps/web/src/features/student/StudentDashboard.tsx): nueva composición V4, identidad real, prioridad de continuidad, filtros y estado de misión con la lógica `missionContinuationDestination` existente.
- [StudentDashboard.css](../../apps/web/src/features/student/StudentDashboard.css): estilos acotados al dashboard y responsive.
- [App.tsx](../../apps/web/src/App.tsx): pasa el callback existente `getMissionDeliveryHistory` al dashboard.
- [mi-espacio-guia.webp](../../apps/web/src/features/student/assets/mi-espacio-guia.webp) y [mi-espacio-misiones.webp](../../apps/web/src/features/student/assets/mi-espacio-misiones.webp): assets originales del kit.
- [StudentDashboard.test.tsx](../../apps/web/src/features/student/StudentDashboard.test.tsx): regresiones del dashboard actualizadas a V4.
- `intent.md`, `spec.md`, `evidencie.md` de F17.18 creados.

## Verificación ejecutada

- `2026-11-26 00:45` Bogota — `pnpm --filter @fragments/web test`: `Test Files 58 passed (58); Tests 330 passed (330)`.
- `2026-11-26 00:45` Bogota — `pnpm --filter @fragments/web typecheck`: PASS (`tsc -p tsconfig.json`, código 0).
- `2026-11-26 00:45` Bogota — `pnpm --filter @fragments/web build`: PASS (Vite 8.3.5, 2283 módulos; artefactos incluyen los dos WebP). Warnings existentes: bundle principal >500 KB y directivas `use client` de lucide-react; el build finalizó con código 0.
- `2026-11-26 00:45` Bogota — `git diff --check`: PASS.
- Los comandos se ejecutaron desde `.worktrees/mi-espacio-v4` usando el store pnpm independiente `D:\.pnpm-store-mi-espacio-v4`; no se tocó/eliminó ninguna dependencia de otro worktree.
- Commit funcional independiente: `c53b63a7063aea228e3ec881bb9f3fc85b09ffcc` (`feat(student): implement approved Mi espacio V4 redesign`).
- Rama publicada: `origin/codex/mi-espacio-v4`, SHA `c53b63a7063aea228e3ec881bb9f3fc85b09ffcc`.
- PR borrador [#348](https://github.com/VGMil-dev/fragments/pull/348), base `main` en `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`; CI `45763977112` SUCCESS el `2026-11-26`. Corrieron Compose profiles, Prisma disposable, políticas de release/backup, backup/restore, release-agent, metadata, test/typecheck/lint/build.
- Ego Lite: `profiles()` identificó `Profile 5 — Estudiante`; el usuario autorizó utilizarlo. Se creó el Space 27 propio con ese perfil. En producción, antes del despliegue, la sesión autenticada cargó Mi espacio anterior con identidad GitHub y datos QA; captura: `C:\Users\vgmil\ego\mi-espacio-v4-20261126\production-before-auth.png`. Sin clics de escritura. El preview local carga la V4, pero muestra la identidad fixture `fixture-student`; no se usará para afirmar identidad ni datos productivos. Comparación autenticada post-release pendiente.
- Hashes de assets tras extraer el kit:
  - `mi-espacio-guia.webp`: `cd2590c7c6a51124d8e3541dd4a20d88455bd9def6f3f3898bd466439ab9f830`.
  - `mi-espacio-misiones.webp`: `cf1ced214adcfc856fe602a9acc1b090611291d83eff10d15953046a062d4fa9`.

## Bloqueos / límites de verificación

- Los primeros intentos con el almacén compartido/offline sufrieron `EPERM`/tarball ausente, pero se resolvieron sin borrar procesos ni dependencias de terceros usando el almacén independiente. La instalación congelada terminó correctamente.
- Comparación visual autenticada post-release, actualización sobre la integración prioritaria de V7/sidebar, merge/actualización final de rama, release F14, producción, Notion y carpeta final de evidencias siguen pendientes. Mis aulas V5 tampoco está publicada y conserva cambios sin commit fuera de este worktree.

## Integración y despliegue

### Integración consolidada

- V7 y la barra lateral compartida se integraron primero por PR [#349](https://github.com/VGMil-dev/fragments/pull/349), merge `0f48fff6bf44761ef7103507861a0c4d3c5b26dc`, CI verify `45764662148` PASS.
- Mi espacio V4 mantuvo el commit funcional independiente `c53b63a7063aea228e3ec881bb9f3fc85b09ffcc`. PR [#348](https://github.com/VGMil-dev/fragments/pull/348) pasó CI verify `45765184682` y se integró mediante merge normal `15b5d965a8803d68a16faeb0ad5e21bdb8877855`.
- Mis aulas V5 se integró después por PR [#350](https://github.com/VGMil-dev/fragments/pull/350), merge `07a84f631dc2f670571908daddb6d33fa732521a`, CI verify `45766994085` PASS. No se sobrescribió el trabajo de los otros agentes.
- `origin/main` verificado en `07a84f631dc2f670571908daddb6d33fa732521a`; `v0.5.96` es una única release consolidada y su tag anotada apunta a ese SHA.

### Pruebas y release

- Tras las tres integraciones: suite web `351/351`, contracts `34/34`, API `209` PASS y `82` OMITIDAS por requerir PostgreSQL de integración; typecheck, lint, build y `git diff --check` PASS. El typecheck se ejecutó después del build de contracts para evitar una carrera de artefactos `dist`.
- Workflow F14 [run `45767539848`](https://github.com/VGMil-dev/fragments/actions/runs/45767539848), evento push de tag, terminó `success` el `2026-11-26T06:25:20Z`. Ejecutó validación de SHA/tag, instalación congelada, respaldo y restauración aislada, pruebas, typecheck, lint, build, imágenes ARM64 y atestación.
- GitHub Release [v0.5.96](https://github.com/VGMil-dev/fragments/releases/tag/v0.5.96) publicada `2026-11-26T06:25:17Z`; paquete de imágenes digest `sha256:844719b9b30036a83499e09c084a2d657b086c982ccabfb5ef8215c5bee39fa5`; manifiesto `sha256:91c5c928bec82d92eb2b2ebe73966f44d2a753bb6ccd8e31a4266581c33a44de`; atestación `sha256:7e840f45ded2fa500343823df1631a056ac83e612ceaf8bc0b54a3ef3d242cb5`.

### Producción y Ego Lite — solo lectura

- Procedimiento autorizado F14 aplicado automáticamente. `fragments-release-apply.service`: `inactive/dead`, `Result=success`; timer `fragments-release-poll.timer` y watcher `fragments-release-apply.path` activos; `systemctl --failed` vacío.
- `https://fragments.gavanti.org/health` devolvió `HTTP 200`, `status=ok`, `database=ready`. El HTML entrega `/assets/index-De0j7EpX.js`; el bundle contiene `v0.5.96` y el SHA íntegro `07a84f631dc2f670571908daddb6d33fa732521a`.
- Ego Lite TaskSpace 31, Profile 5 — Estudiante, en `/student/dashboard`; identidad autenticada real `@MilordV` y actividad real de QA visibles. Solo lectura; no se continuó ni modificó una misión ni se guardó información.
- Viewports 1440×900, 390×844 y 320×800 CSS px: `document.documentElement.scrollWidth` y `document.body.scrollWidth` fueron 1425, 390 y 320 respectivamente; ninguno excede su `innerWidth` (la diferencia de 15 px en escritorio es la barra de desplazamiento vertical). No se observó desbordamiento horizontal del documento.
- El filtro `Por iniciar, 0 misiones` quedó `aria-pressed=true` y mostró el estado vacío correspondiente; al volver a `Todas`, se restauró la lista real. Tab movió el foco de «Todas» a «En curso» con `:focus-visible=true` y contorno sólido.
- Capturas locales originales, no modificadas, guardadas fuera del repositorio en `C:\Users\vgmil\ego\mi-espacio-v4-20261126\production-v4-desktop.png`, `production-v4-mobile-390.png`, `production-v4-mobile-320.png` y `production-v4-keyboard-focus.png`. Incluyen la cuenta autenticada y datos de actividad; no se incorporan al repositorio.
- Límites: no se comprobaron zoom 200 %, contraste formal, lector de pantalla ni otros trayectos de datos. La UX-01 sigue `Candidata`; esta verificación de release no constituye aprobación visual propietaria.

### Referencias de cierre

- Capturas de comparación originales y un informe de cierre compartible (máximo 20 archivos) se guardan fuera del repositorio en `C:\Users\vgmil\Downloads\MI_ESPACIO_V4_EVIDENCIAS_2026-11-26`.
- Rama propia: `codex/mi-espacio-v4`; PR de implementación #348 y cierre documental #351 quedaron integrados en `main`. La documentación posterior no requiere una release nueva.

### Coordinación posterior — hallazgo compartido fuera de F17.18

- Después de esta verificación, el agente de Mis aulas informó un badge de versión visualmente alto/ovalado en esa pantalla y lo atribuyó al footer compartido de Review V7. Este agente no reprodujo ni verificó el hallazgo en Mis aulas; corresponde al trabajo compartido V7, no a la implementación Mi espacio V4.
- El reporte se escaló al agente V7 para seguimiento coordinado. No se modificó código V5/V7 ni se inició otro despliegue F14 en esta tarea.

### Release consolidada final v0.5.97 — verificación posterior

- Review V7 corrigió el badge compartido del footer en [PR #352](https://github.com/VGMil-dev/fragments/pull/352), integrada en `0cfb841fa5031754c8770cff4db10fa4b2e4274f`; `verify` PASS. El arreglo no alteró el dashboard Mi espacio V4.
- Se publicó una sola release posterior al ajuste compartido: [v0.5.97](https://github.com/VGMil-dev/fragments/releases/tag/v0.5.97), tag exacta sobre `0cfb841fa5031754c8770cff4db10fa4b2e4274f`. F14 [run `45770050876`](https://github.com/VGMil-dev/fragments/actions/runs/45770050876) completó `success` el `2026-11-26T06:47:17Z`; validación del source, tests/typecheck/lint/build, imágenes ARM64, atestación Sigstore y publicación pasaron.
- El poller aplicó el paquete automáticamente. Journal F14 registra `release_deployed tag=v0.5.97 commit=0cfb841...`, imágenes API/web con el mismo SHA y backup SHA-256 `e4e308abfa3dfcc74687dcfc614d918f1f1859006df134e889b4e527db2b8d76`; `fragments-release-apply.service` terminó `inactive/dead`, `Result=success`. Timer y watcher activos; `systemctl --failed` vacío.
- Producción final: `https://fragments.gavanti.org/health` HTTP 200, `ok/database=ready`; `/assets/index-De0j7EpX.js` contiene `v0.5.97` y SHA `0cfb841fa5031754c8770cff4db10fa4b2e4274f`. La tag sigue siendo ascendiente del `origin/main` actual, que incluye posteriormente solo los merges documentales #351 y #353.
- Ego Lite TaskSpace 32, Profile 5 — Estudiante, post-release y solo lectura: cuenta autenticada `@MilordV`, continuidad y 3 misiones cargadas desde producción. A 1440×900, 390×844 y 320×800 CSS px, el ancho de documento no superó el viewport. `Por iniciar` mostró 0 y estado vacío; Tab alcanzó `En curso` con `:focus-visible` y contorno sólido.
- En la navegación a Mis aulas, el badge final `v0.5.97 · 0cfb841` ya aparece como una píldora compacta en el footer compartido. Se considera comprobado visualmente el ajuste V7 de PR #352; no se ejecutaron acciones de aula.
- Capturas originales no editadas de esta verificación: `C:\Users\vgmil\ego\mi-espacio-v4-20261126\production-v4-v097-desktop-stable.png`, `production-v4-v097-mobile-390-stable.png`, `production-v4-v097-mobile-320-stable.png`, `production-v4-v097-keyboard-stable.png` y `production-v097-classrooms-footer-stable.png`. Incluyen identidad/datos de sesión y se mantienen fuera de Git.
- PR documental [#353](https://github.com/VGMil-dev/fragments/pull/353), CI verify `45770113620` PASS, integró la atribución del hallazgo compartido en `b572754b8f16421722c1ab5a76c5c7be8afde8e4`. La release `v0.5.97` ya estaba publicada sobre su ascendiente `0cfb841`.
- Los límites de accesibilidad y estado de UX-01 no cambian: se mantiene `Candidata`; zoom 200 %, contraste formal, lector de pantalla y aceptación visual propietaria siguen sin comprobar.
