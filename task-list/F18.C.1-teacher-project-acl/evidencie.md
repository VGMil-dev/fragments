# Evidencia F18.C.1 — ACL corregida; PR y producción pendientes

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
- Commits: implementación inicial `8eef145952165602b7b6d741d571f75637d1b9fd`; merge normal de main `d06248e30390e3730035b4ee872a976888d94a69`; seguimiento ACL/retiro/identidades `72901688389ea290ee92f90c5a03ab6ea9825122`.
- PR #279 está abierta. Su CI `45525832207` pasó antes del commit de seguimiento; requiere publicar `7290168` y esperar una nueva ejecución CI.
- Sin merge final, tag ni F14. Producción continúa en v0.5.75, donde CU-30 permanece FAIL provisional.
- Sin escrituras productivas, evaluación IA, interacción con terceros ni cambios de infraestructura.

## Pendientes de aceptación

- Subir el seguimiento a PR #279 y esperar CI/protecciones normales.
- Integrar mediante PR; después publicar release legítima F14 conservando backups, rollback y ledger.
- Revalidar versión/SHA/health y el feed docente con Ego Lite Space 44: roster sin identidades ajenas, seguimiento solo de proyectos de aula propia. Verificar también el selector de asignación solo en recursos QA propios y sin asignar a nadie.
- Actualizar CU-30 en la matriz Notion tras observar la versión desplegada. Hasta entonces el cambio está verificado en QA aislado únicamente.
