# F17.3 — Evidencia: Mentor · Habilidades

## Estado

IMPLEMENTACIÓN LOCAL Y QA COMPLETADOS. Revisión visual independiente B: **PASS**. Commits de tarea `962ef80`, `11b7ff4` y `713e8cb`; base sincronizada con `origin/main` mediante merge normal `010402a`. PR #75 abierto contra `main`; esperando checks obligatorios antes del merge. F14 queda pendiente de integración.

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

## Archivos y Notion

- Paquete de 15 archivos (límite 20): `F17_UX07_EVIDENCIAS/INFORME_FINAL.md`, 13 capturas Ego Lite y referencia aprobada.
- Referencia 1672×941 verificada: SHA-256 `6f067ed50875a15e10d8d889ba93f98f49d76653a48f5db972e0de911e3c015a`.
- Ficha UX-07 actualizada: referencia aprobada adjunta, banner corregido, resultado F17.3 y QA B PASS registrados. [Abrir UX-07 en Notion](https://app.notion.com/p/41ecd5fa7ed781798689e1d75db17da5).

## Integración pendiente

- Commits de tarea: `962ef80` (`feat(f17.3): define vínculo de habilidades del borrador`), `11b7ff4` (`feat(f17.3): conecta habilidades autorizadas de Mentor`) y `713e8cb` (`docs(f17.3): registra cierre local de UX-07`). El merge `010402a` incorpora la actualización reciente de `origin/main` sin reescribir historia.
- PR #75: https://github.com/VGMil-dev/fragments/pull/75, rama `codex/f17-ux07-habilidades` hacia `main`, abierta e integrable al momento de consulta. Los checks remotos siguen pendientes; no se hará push directo a `main`, force-push ni bypass de protecciones. F14/tag/release/health/versión productiva siguen pendientes hasta integrar.
