# F17.3 — Evidencia: Mentor · Habilidades

## Estado

COMPLETADA. Implementación, QA visual independiente B **PASS**, integración por PR #75 y despliegue F14 `v0.5.7` verificados. Merge de `main`: `fb22285391fa3b234aeeeb2951e462c8709d00af`.

## Contrato y persistencia

- Contrato aprobado por planner en `962ef80`: `mentorSkills` opcional con aula nullable y hasta 20 IDs únicos; aula nula solo con lista vacía. DTO estudiantil conserva la selección; `TeacherProject` la excluye.
- El API resuelve la identidad Better Auth, valida aula/matrícula activa y pertenencia de IDs habilitados/no archivados; deriva `proposal.skills` en servidor. En creación rechaza nombres de habilidades libres; patches no relacionados preservan compatibilidad histórica.
- Se usan `Proposal.proposalJson`, `ProposalRevision.proposalJson` y `expectedVersion`; no hay migración Prisma nueva.
- Evaluación/snapshot de entrega y respuestas docentes no exponen los IDs internos de aula/habilidad.

## Interfaz y QA Ego Lite

- Se consulta el catálogo autorizado del API F18.A. La pantalla incluye búsqueda, conteos, chips seleccionados visibles al filtrar, límite incremental inicial de seis, controles accesibles y estados vacíos, carga, error/reintento y sin aula.
- El texto de habilidades requeridas declara ausencia de asignación. F18.B no está implementada.
- Capturas Ego Lite reales del route integrado `/student/mentor` autenticado en local: 320, 390, 768, 1024, 1440 y 1672 px; 3 y 30 habilidades; dos selecciones conservadas fuera del filtro; vistas scrolleadas en 320/390/768 y footer scrolleado a 320. Anchos CSS comprobados sin overflow horizontal.
- El agente B comprobó shell, subtítulo aprobado, links Word, catálogos, selección/filtro, responsive y acceso al footer móvil; emitió **PASS**.
- Skills usadas: `ego-browser skill` (Ego Lite) y Vercel React Best Practices. No se usó Playwright.

## PostgreSQL de pruebas

- Suite HTTP con fixture sintética rotulada y guardas de base activa: **1 archivo, 1 prueba PASS** en `fragments_test`.
- Verificó catálogos 0/3/12/30/50/100, identidad y matrícula, rechazo de aula ajena, IDs inválidos/deshabilitados/archivados, guardado real de propuesta y revisión, conflicto de `expectedVersion` y redacción de vista docente.
- La app local conectada al mismo PostgreSQL de pruebas consultó aulas 3/30/100. Guardó un borrador con dos IDs, confirmó nombres derivados y versión 3, luego de recargar y reabrir restauró ambos chips. La búsqueda de una habilidad no seleccionada dejó los chips seleccionados visibles.
- La limpieza final eliminó las fixtures sintéticas de navegador (2 usuarios, 3 aulas, 133 habilidades y sus disponibilidades; sin proposal restante en la segunda sesión). La suite HTTP limpia automáticamente sus propias fixtures. **No se usó ni modificó `fragments_prod`.**
- Credenciales y valores de entorno no están en evidencia; la URL se obtuvo solo en memoria y el túnel SSH privado fue cerrado.

## Verificación fresca

- `pnpm exec turbo run test typecheck lint build --force --output-logs=errors-only` — **11/11 tareas PASS** en API, web y contracts.
- Reejecución tras sincronizar la rama con `origin/main` en merge `010402a`: **11/11 PASS**, 0 tareas en caché, 16.169 s.
- `pnpm --filter @fragments/api exec vitest run src/features/mentor/skills-http.test.ts --reporter=dot` (URL temporal restringida a `fragments_test`) — **1/1 PASS**.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx --reporter=dot` — **19/19 PASS**.
- `git diff --check` — **PASS**.
- PR #75 inicialmente encontró fixtures de tres pruebas PostgreSQL que enviaban nombres libres de habilidades; se adaptaron a una selección explícita vacía en `bfa7ca2`. CI final en SHA `bfa7ca2a3066db07efb72b21d448fc338cc397d1`: `Fragments CI` run `44945430592`, check `verify` **SUCCESS**. El run previo `44945066486` falló en esas fixtures antiguas y no se ocultó.

## Archivos y Notion

- Paquete de 15 archivos (límite 20): `F17_UX07_EVIDENCIAS/INFORME_FINAL.md`, 13 capturas Ego Lite y referencia aprobada.
- Referencia 1672×941 verificada: SHA-256 `6f067ed50875a15e10d8d889ba93f98f49d76653a48f5db972e0de911e3c015a`.
- Ficha UX-07 actualizada: referencia aprobada adjunta, banner corregido, resultado F17.3 y QA B PASS registrados. [Abrir UX-07 en Notion](https://app.notion.com/p/41ecd5fa7ed781798689e1d75db17da5).

## Integración y despliegue verificados

- PR [#75](https://github.com/VGMil-dev/fragments/pull/75), integrado mediante merge normal `fb22285391fa3b234aeeeb2951e462c8709d00af`; `main` contiene contrato `962ef80`, implementación `11b7ff4`, fixtures compatibles `bfa7ca2` y documentación previa `713e8cb`/`7d93673`/`ba912e1`.
- Check obligatorio `verify` del SHA integrado: `Fragments CI` run `44945430592` **SUCCESS**.
- Tag anotada `v0.5.7`, tag object `a4fde0625470e43a1beac501ab52fe3dcedbf72e`, apuntando al SHA exacto de merge. F14 run `44945760230`: `verify-build`, `attest-package` y `publish-approved-release` **SUCCESS**; release GitHub `453959855` con paquete ARM64, manifiesto y atestación.
- Verificación pública posterior: `GET https://fragments.gavanti.org/health` HTTP 200, `status=ok`, `database=ready`; `/` HTTP 200; bundle `/assets/index-BBtS6vKT.js` HTTP 200 (510418 bytes) contiene `v0.5.7`, SHA `fb22285391fa3b234aeeeb2951e462c8709d00af`, Habilidades para practicar, estado «Sin asignación» y «Mostrar más». `GET /api/me/classrooms` sin sesión HTTP 401.
- QA y escrituras sintéticas ocurrieron solo en `fragments_test`. No se sembraron ni limpiaron filas productivas y no se añadió migración Prisma. Notion UX-07 refleja resultado, PR, F14 y health/bundle verificados.
