# Evidencia F18.C.1 — implementación local validada, despliegue pendiente

## Hallazgo productivo inicial

- Observación Ego Lite docente Space 44/Profile 3 en producción v0.5.75: `/teacher/students` mostró el directorio global de identidades GitHub. No se seleccionó ni abrió ninguna identidad ajena.
- Inspección del código v0.5.75: el endpoint de proyectos no comprobaba aula/matrícula y devolvía propuestas personales; el endpoint `/api/teacher/historical-projects` enumeraba propuestas sin propietario. No se llamó a esos endpoints en producción.
- F18 exige seguimiento por aula y matrícula; F15 conserva las propuestas anónimas privadas hasta su reclamo.

## Implementación

- `/api/teacher/students` limita el directorio a estudiantes GitHub con matrícula activa en un aula activa del docente autenticado.
- `projectCount` y `/api/teacher/students/:id/projects` cuentan/devuelven solo propuestas ligadas a una versión publicada de misión en un aula activa propia con matrícula activa.
- La consulta de estudiante no relacionado responde 404 genérico. El borrador sin misión publicada, los proyectos de otra aula y el estudiante sin matrícula no aparecen.
- Se retiraron el endpoint y la sección de proyectos anónimos sin propietario. No se alteraron contratos, migraciones, identidades ni datos productivos.

## Pruebas y build

- TDD: la primera prueba de integración reprodujo el defecto: el endpoint devolvía tres propuestas en lugar de solo la misión vinculada.
- PostgreSQL efímero creado para esta ejecución; migraciones aplicadas al DB local `fragments_test`. La prueba comprueba `current_database()` antes de insertar y borra únicamente sus fixtures con namespace UUID.
- `pnpm --filter @fragments/api exec vitest run src/features/mentor/teacher-project-acl.integration.test.ts src/features/mentor/http.test.ts src/features/mentor/skills-http.test.ts --reporter=dot` — 3 archivos, 14/14 pruebas PASS.
- `pnpm --filter @fragments/api test` — 71 archivos PASS, 271/271 pruebas, con PostgreSQL efímero `fragments_test` y las migraciones existentes.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/api build` — PASS.
- `pnpm --filter @fragments/web test` — 54 archivos, 311/311 pruebas PASS.
- `pnpm --filter @fragments/web build` — PASS; mantiene avisos preexistentes de chunks >500 kB y directivas `use client` de lucide-react.
- `git diff --check` — PASS.

## Estado de publicación

- Rama: `codex/f18-c1-teacher-project-acl`.
- Commit de implementación y evidencias iniciales: `8eef145952165602b7b6d741d571f75637d1b9fd`.
- Rama sincronizada sin conflictos con `origin/main` `8239c1bc7a7448e792f19974215712b304dc28b6`; merge commit `d06248e30390e3730035b4ee872a976888d94a69`.
- Tras el merge, focal ACL/HTTP/habilidades: 3 archivos, 14/14 PASS en PostgreSQL efímero.
- Suite API completa post-merge: 70/71 archivos, 270/271 pruebas PASS; falla `review/worker-http.test.ts` en “requires a student session…” al buscar un análisis ausente durante `createPdf`. La prueba pasa aislada (1/1, 8 omitidas); el fallo aparece al correr el conjunto completo. No toca archivos F18.C.1 y queda documentado para CI/revisión.
- PR, CI, merge final y F14: pendientes. El control vigente se conserva; no se creó tag ni se desplegó.
- Producción continúa en v0.5.75, donde la corrección no está disponible; CU-30 sigue FAIL provisional hasta release F14 y revalidación segura.
- Sin escrituras productivas, llamadas IA, captura de datos de terceros ni operación sobre contenedores de otras tareas.

## Pendientes de aceptación

- Abrir PR, obtener revisiones y checks requeridos, integrar por protecciones normales.
- Publicar release legítima por F14, revisar versión/SHA/health y observar el ledger.
- Revalidar con Ego Lite Space 44 (perfil docente ya autorizado): lista de identidades vinculadas propia, proyecto publicado solo de aula propia y estado vacío/no exposición a otro docente; no seleccionar estudiantes terceros.
- Actualizar CU-30 en matriz de Notion con separación QA/producción. Hasta entonces, la mejora está verificada solo en integración aislada.
