# F17.3 / UX-07 — Mentor · Habilidades

**Estado:** F17.3 / UX-07 completada e integrada por PR #75; desplegada como `v0.5.7` mediante F14. QA local PostgreSQL y Ego Lite B PASS. Salud pública y bundle con versión/SHA exactos verificados.

## Resultado

- Se integró el catálogo real de F18.A en el paso Habilidades del route `/student/mentor`: búsqueda, conteos derivados, selección múltiple accesible, chips visibles al filtrar, expansión incremental de seis y estados recuperables.
- Las selecciones se guardan en el borrador de Mentor con el control de versión existente. La API valida matrícula activa, aula y pertenencia de cada ID; deriva los nombres de habilidades autorizadas. No se agregó una migración Prisma.
- Se preservaron el shell, progreso y menú de seis etapas. El subtítulo, enlaces Word y composición Pixel Night siguen la referencia aprobada.
- Las habilidades requeridas muestran «Sin asignación»: F18.B todavía no aporta una fuente académica que distinga habilidades obligatorias.
- `TeacherProject` omite el vínculo interno de aula/IDs; el servicio elimina esos IDs de los datos enviados al evaluador y de los snapshots de entrega.

## PostgreSQL y flujo funcional

- La integración HTTP pasó **1/1** en `fragments_test`, con comprobación de `current_database()` antes de sembrar.
- Se probaron catálogos con 0, 3, 12, 30, 50 y 100 habilidades; matrícula e identidad, aula ajena, IDs habilitados/deshabilitados/archivados, persistencia en `Proposal` y `ProposalRevision`, versión obsoleta y redacción docente.
- En la app local, con una sesión sintética de QA y clases de 3/30/100 servidas por el API conectado a `fragments_test`, se guardó un borrador con dos habilidades. La API devolvió los IDs y nombres derivados. Tras recargar y reabrir el borrador, ambos chips reaparecieron. La búsqueda filtró a una habilidad distinta y conservó los dos chips seleccionados.
- Se limpiaron las fixtures de navegador tras la revisión. La prueba HTTP también limpia sus propias fixtures. No se usó ni modificó `fragments_prod`.

## Revisión visual

Agente B emitió **PASS** tras revisar la referencia y capturas Ego Lite del route integrado. Los viewports fueron 320, 390, 768, 1024, 1440 y 1672 px. No se observó desbordamiento horizontal; las capturas scrolleadas de 320/390/768 muestran chips, búsqueda y resultado, y a 320 px también se confirmó por scroll que Guardar y Continuar son accesibles sin que el dock los tape.

La carpeta contiene 15 archivos: esta nota, la referencia aprobada y capturas Ego Lite de los seis anchos, catálogos de 3 y 30, selección filtrada y vistas scrolleadas móviles/tablet. Catálogo de 100 aparece en las capturas de viewport.

## Verificación

- `pnpm exec turbo run test typecheck lint build --force --output-logs=errors-only` — **11/11 tareas PASS** (API, web y contracts).
- Reejecución tras integrar la actualización de `origin/main` por merge normal `010402a`: **11/11 PASS**, 0 tareas en caché (16.169 s).
- `pnpm --filter @fragments/api exec vitest run src/features/mentor/skills-http.test.ts --reporter=dot` con URL temporal solo de prueba — **1/1 PASS**, `fragments_test`.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx --reporter=dot` — **19/19 PASS**.
- `git diff --check` — **PASS**.
- PR #75: `Fragments CI` `verify` run `44945430592` SUCCESS en SHA `bfa7ca2a3066db07efb72b21d448fc338cc397d1`. Un primer run (`44945066486`) encontró fixtures previas a UX-07 que enviaban habilidades libres; se corrigieron en `bfa7ca2` y el run siguiente pasó.
- Skills usadas: Ego Lite y Vercel React Best Practices. No se usó Playwright.

## Artefactos y release

- Imagen aprobada: `Fragments_F17_UX07_Habilidades_Referencia_Aprobada.png`, 1672×941, SHA-256 `6f067ed50875a15e10d8d889ba93f98f49d76653a48f5db972e0de911e3c015a`.
- Resumen de QA y referencia adjuntos a la ficha UX-07 en Notion: https://app.notion.com/p/41ecd5fa7ed781798689e1d75db17da5
- PR [#75](https://github.com/VGMil-dev/fragments/pull/75), merge normal `fb22285391fa3b234aeeeb2951e462c8709d00af`; check obligatorio `verify` run `44945430592` SUCCESS.
- Tag anotada `v0.5.7`, objeto `a4fde0625470e43a1beac501ab52fe3dcedbf72e`, apunta al SHA del merge. F14 run `44945760230` completó `verify-build`, `attest-package` y `publish-approved-release`; GitHub Release `453959855` contiene tar ARM64, manifiesto y atestación.
- Producción verificada por HTTP: `/health` 200 (`status=ok`, `database=ready`); `/` 200; bundle `/assets/index-BBtS6vKT.js` 200, 510418 bytes, contiene `v0.5.7`, el SHA `fb22285391fa3b234aeeeb2951e462c8709d00af` y los textos de UX-07. `/api/me/classrooms` sin sesión devuelve 401. La lectura y escrituras sintéticas de QA permanecieron en `fragments_test`; no se añadió migración Prisma.
- Commits de tarea integrados: contrato `962ef80`, implementación `11b7ff4`, fixtures CI `bfa7ca2`; el cierre documental local previo está en `713e8cb`, `7d93673` y `ba912e1`.
