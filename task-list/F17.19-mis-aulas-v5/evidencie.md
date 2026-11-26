# F17.19 — Evidencia de Mis aulas V5

## Estado final

**Completada e integrada.** Implementación funcional: commits `b51e63e`, `e6b76d8`, `86e85ad`, `dd8f3d3`; PR #350 integrada en `07a84f631dc2f670571908daddb6d33fa732521a`. El ajuste del footer estudiantil compartido se integró por PR #352 como `0cfb841fa5031754c8770cff4db10fa4b2e4274f`; la PR documental V4 #353 actualizó `main` a `b572754b8f16421722c1ab5a76c5c7be8afde8e4` sin cambiar runtime.

Release anotada **`v0.5.97`**, apuntando exactamente a `0cfb841fa5031754c8770cff4db10fa4b2e4274f`. F14 run [45770050876](https://github.com/VGMil-dev/fragments/actions/runs/45770050876): `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. PR #350 CI [45767539848](https://github.com/VGMil-dev/fragments/actions/runs/45767539848) y fix compartido #352 CI [45769664116](https://github.com/VGMil-dev/fragments/actions/runs/45769664116) también SUCCESS.

## Alcance y decisiones

- Referencia aprobada: ZIP `Fragments_Mis_Aulas_V5_Kit.zip`, extraído fuera del repositorio. Solo los WebP originales usados entraron al producto; no se versionó ZIP, HTML ni datos/acciones de demostración.
- Se conservaron APIs y contratos F18, permisos de matrícula, persistencia y callbacks de continuidad. No se añadieron tablas, endpoints, dependencias ni cambios de lockfile/versiones.
- Las rutas Aulas, Inventario de habilidades y Solicitudes, detalle de aula/misión, filtros, agrupación de habilidades por identidad, estados y continuidad reutilizan servicios existentes. Sidebar global compartida se mantuvo.
- F17.19 quedó lista en la matriz de `task-list/TASKS.md`; UX-02 se registra como **En revisión**, porque la aprobación de la maqueta no equivale a una nueva aprobación propietaria pixel a pixel de la pantalla final.

## Verificación local

- `pnpm typecheck` — PASS (5 tareas Turbo).
- `pnpm test` — PASS: contracts 34/34, web 351/351 y API 209 PASS. 82 pruebas API locales se omitieron por requerir PostgreSQL/`DATABASE_URL`; F14 ejecutó migración y pruebas PostgreSQL desechables, backup/restore, test del agente de release, typecheck/test/lint/build del SHA exacto.
- `pnpm build` — PASS. Advertencias observadas: bundle principal 703.03 kB (umbral 500 kB) y directivas `use client` de lucide-react.
- `pnpm lint` — PASS; el único target raíz definido valida contracts mediante `tsc --noEmit`.
- Pruebas focales: `StudentClassroomsScreen.test.tsx` 9/9 y `App.student-flow.test.tsx` 23/23 PASS.
- Ego Lite local con fixture sintético y solo lectura: viewports 320/390/768/1024/1440; sin overflow horizontal; formulario y solicitudes observados sin submit; foco visible por teclado. El kit HTML se comparó en el mismo TaskSpace. Las capturas locales son sintéticas y se incluyen en el paquete externo.
- `git diff --check` — PASS previo a este registro. Store existente, sin error EPERM y sin cambio del lockfile.

## Producción y Ego Lite Estudiante

- Aplicación normal F14: el agente reportó ledger `deployed` sobre SHA `0cfb841…`, resultado del apply `success`, backup PostgreSQL validado con integridad/restauración y release previa `v0.5.96` conservada para rollback. El flujo F14 completo pasó; no se ejecutó un deploy manual.
- `https://fragments.gavanti.org/health` — HTTP 200; `status=ok`, `database=ready`.
- Bundle público `/assets/index-CzhqWXHw.js` contiene `v0.5.97` y el SHA exacto `0cfb841fa5031754c8770cff4db10fa4b2e4274f`.
- Ego Lite `Profile 5` (Estudiante), solo lectura, rutas `/student/classrooms`, `/student/dashboard` y `/student/review`, a 1440 y 390 CSS px. El badge del footer mide 101×28 px en las tres pantallas. `documentElement.scrollWidth` fue 1440/1440/1425 en escritorio y 390/390/375 en móvil; no hay desbordamiento horizontal. No se guardaron capturas autenticadas de producción ni se leyeron datos académicos; no se enviaron solicitudes ni se disparó ninguna evaluación.
- F14 dejó API/web y servicios vecinos saludables según el reporte coordinado. La revisión visual UX-02 sigue **En revisión** hasta aceptación propietaria final.

## Referencias

- PR V5 #350: https://github.com/VGMil-dev/fragments/pull/350
- PR fix footer V7 #352: https://github.com/VGMil-dev/fragments/pull/352
- PR evidencia V4 #353: https://github.com/VGMil-dev/fragments/pull/353
- F14 v0.5.97: https://github.com/VGMil-dev/fragments/actions/runs/45770050876
- Release: https://github.com/VGMil-dev/fragments/releases/tag/v0.5.97
- F17: https://app.notion.com/p/41ccd5fa7ed781fcacc5cd8bc29d182f
- UX-02: https://app.notion.com/p/41ecd5fa7ed781aa8b50e620f87e3372
- Paquete externo (10 archivos, fixture sintético y sin datos productivos): `C:\Users\vgmil\Downloads\F17.19_Mis_Aulas_V5_EVIDENCIAS`
