# Evidencia F18.C.1 — ACL integrada y desplegada; producción verificada parcialmente

## Hallazgo productivo inicial

- Ego Lite docente Space 44/Profile 3 en v0.5.75 mostró un directorio global en `/teacher/students`. No se seleccionó ni abrió ninguna identidad ajena.
- Inspección estática: el endpoint de proyectos no validaba aula/matrícula y devolvía propuestas personales; el endpoint histórico enumeraba propuestas sin propietario. No se llamaron esos endpoints en producción.
- F18 exige seguimiento por aula y matrícula. F15 conserva proyectos anónimos privados hasta que su titular los reclame.

## Implementación local

- `/api/teacher/students` (roster) limita perfiles a matrículas activas en aulas activas propias; `projectCount` y `/api/teacher/students/:id/projects` solo consideran proyectos ligados a misiones publicadas de esas aulas.
- Se excluyen borradores personales, aulas de otros docentes, aula archivada, matrículas retiradas, misiones draft y propuestas históricas anónimas. El acceso sin relación responde 404 genérico.
- La revisión independiente encontró que retirar una publicación aún carecía de ACL. Se corrigió `withdrawProject`: vuelve a verificar propietario, misión publicada, aula activa y matrícula activa dentro de la transacción. Una prueba HTTP confirma que teacher B recibe negativa sin moderación y teacher A sí puede retirar.
- Para preservar la asignación directa F18/CU-08, Classroom Studio usa `/api/teacher/student-identities`, que lista solo identidad GitHub verificada y no entrega `projectCount`. No se reescribieron membresías.
- Se añadió DTO compartido estricto para identidad asignable; sin migración ni cambio de datos.

## Pruebas

- TDD: la primera regresión mostró las tres propuestas expuestas a teacher A. La nueva aserción de retirada falló antes del control ACL; la nueva ruta de identidades falló inicialmente al no existir.
- PostgreSQL efímero `fragments_test`, guardas host/database y fixtures sintéticos con namespace UUID; limpieza solo de filas creadas por esta prueba.
- `pnpm --filter @fragments/api test` — 71 archivos, 271/271 PASS.
- Integración ACL final en PostgreSQL — 1/1 PASS; `http.test.ts` ejecutado por separado — 12/12 PASS; `skills-http.test.ts` pasó en la corrida focal. Una ejecución de los tres archivos juntos tuvo un fallo transitorio en la evaluación fake de `http.test.ts`; no se reprodujo al ejecutar esa suite sola ni en la suite completa final.
- `pnpm --filter @fragments/web test` — 54 archivos, 311/311 PASS.
- `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx` — 6/6 PASS.
- `pnpm --filter @fragments/contracts test` — 33/33 PASS.
- `pnpm --filter @fragments/contracts build`, API/web typecheck, API/web build y `git diff --check` — PASS.
- Revisión estática independiente: el hallazgo P1 quedó resuelto; confirma filtros de roster/propuestas/retirada y la separación del selector de identidades. Sin issues restantes reportados.
- Los builds web conservan avisos de chunks >500 kB y directivas `use client` de lucide-react.

## Publicación

- Rama: `codex/f18-c1-teacher-project-acl`.
- Commits de implementación: inicial `8eef145952165602b7b6d741d571f75637d1b9fd`; seguimiento ACL/retiro/identidades `72901688389ea290ee92f90c5a03ab6ea9825122`.
- PR #279 se integró por merge normal en `main`: `9ca3c434f6c431805c2c65077e38058f98db288d`. CI PR `45528368263` SUCCESS. Revisión estática independiente: sin issues restantes.
- Tag anotada `v0.5.76` apunta al merge exacto. F14 run `45528999912`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; PostgreSQL disposable, backup/restore, suite, typecheck/lint/build, bundle metadata, ARM64 y Sigstore PASS.
- Poller F14 encoló release ID `457555612`; apply normal registró `release_deployed`, imagen API/web con SHA `9ca3c434f6c431805c2c65077e38058f98db288d` y hash de backup presente en el ledger. No hubo deploy/reinicio manual.
- Preflight solo lectura: `/dev/sda1` con 136.1 GB libres (35% usado), inodos 8%; Docker 56.7 GB imágenes y 9.056 GB cache. Sin limpieza. Tras el release: 133.5 GB libres (36% usado), inodos 9%; Fragments API/web, PostgreSQL, Pits y F14 poller/path healthy/activos. Apply inactivo tras terminar, estado esperado.
- Durante el arranque, `/health` respondió temporalmente 502; F14 completó el healthcheck y el endpoint volvió a 200 con `database=ready`. Contenedores API/web continúan healthy en el SHA esperado.
- Ego Lite, docente Space 44/Profile 3: bundle `index-D0TWE-e8.js` comprobado con versión y SHA exactos. `GET /api/teacher/students?offset=0&limit=20` respondió 200; la salida de auditoría se limitó a conteos (1 entrada, suma de proyectos 3). No se registró el nombre, no se seleccionó estudiante ni se abrió proyecto. No se guardó captura porque mostraría datos personales.
- Sin escrituras de datos académicos productivos, interacción con identidades de estudiantes, evaluación IA ni modificación de infraestructura. Sesión docente conservada.

## Pendientes de aceptación

- La autorización cruzada negativa en producción y la retirada por un segundo docente no se probaron por no disponer de una segunda identidad QA autorizada; ambas siguen NO COMPROBADAS en producción. La integración PostgreSQL prueba esos controles con fixtures aislados.
- No se abrió el proyecto del único miembro que devolvió el roster, ni se navegó el selector de asignación; no se probaron operaciones sobre estudiantes.
- CU-30 queda QA PASS y producción PARCIAL, no se extiende esa conclusión al recorrido académico completo ni al aislamiento ante otros docentes en producción.
- La matriz principal de Notion fue actualizada con resultados QA/producción, SHA y referencias CI/F14.
