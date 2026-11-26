# F17.19 — Evidencia Mis aulas V5

## Estado

Implementación y QA local completados en `codex/mis-aulas-v5`; commits funcionales `b51e63e`, incorporación coordinada de `origin/main` `e6b76d8` y matriz de tareas `86e85ad`. No se declara integrada por PR ni desplegada. La rama parte de `origin/main` `15b5d965a8803d68a16faeb0ad5e21bdb8877855`, con V7 (#349) y Mi espacio V4 (#348) ya integradas.

## Fuente y alcance

- Kit extraído fuera del repositorio: `%TEMP%\Fragments_Mis_Aulas_V5_Kit`; solo sus WebP de aula/habilidades se copiaron al producto.
- No se versionan ZIP, HTML de referencia, ni sus datos o acciones de demostración.
- V5 usa endpoints y contratos F18 existentes; no añade backend, cambia contratos, persistencia, dependencias ni `App.tsx`. La barra lateral compartida se incorporó desde `origin/main` junto con Review V7 y Mi espacio V4.
- `TASKS.md` conserva las filas F17.18 y F17.19 al resolver el conflicto de integración.

## Skills y TDD

- `vercel-react-best-practices`: filtros derivados de props, habilidades agrupadas por ID, cargas independientes paralelas, sin memoización superflua.
- `ego-browser`: leído y ejecutado antes de QA visual. TaskSpace Ego Lite 29 creado con `Profile 5` (Estudiante).
- TDD: primero se observó rojo en criterios de V5; implementación y regresiones quedaron verdes. Se actualizaron selectores de `App.student-flow.test.tsx` para navegar por aula y detalle de misión.

## Verificaciones locales

- `pnpm typecheck` (raíz) — PASS, 5 tareas Turbo; incluye contracts, web y API.
- `pnpm test` (raíz) — PASS: contracts 34/34; web 60 archivos y 351/351; API 54 archivos y 209 PASS, 20 archivos omitidos y 82 pruebas omitidas por requerir PostgreSQL/`DATABASE_URL` de integración. Turbo reportó 5 tareas exitosas.
- `pnpm build` (raíz) — PASS, contratos, API y web. Bundle web principal 703.03 kB; permanece el aviso de chunk >500 kB y avisos de directivas `use client` en lucide-react.
- `pnpm lint` (raíz) — PASS; Turbo ejecutó el único target `lint` definido, `@fragments/contracts:lint` (`tsc --noEmit`). No se reportan targets lint separados para web/API.
- `pnpm --filter @fragments/contracts build` seguido secuencialmente de `pnpm --filter @fragments/web typecheck` — PASS. Una primera ejecución concurrente mostró tipos faltantes mientras el `.d.ts` de contracts se regeneraba; repetir en orden resolvió el estado sin cambios de código/contratos.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx` — PASS, 9/9.
- `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — PASS, 23/23; callbacks existentes recorren continuidad Mentor/Review/Trainer.
- `git diff --check` — PASS en los cambios de evidencia y matriz, antes de publicarlos.
- Dependencias enlazadas desde el store existente (441 paquetes fijados); sin EPERM y sin cambios de lockfile/versiones.

## QA Ego Lite local

- URL: `http://127.0.0.1:5174/student/classrooms`, Vite del worktree. `Profile 5` figura como Estudiante; la API local devolvía cero aulas, por lo que se inyectaron solo respuestas de lectura etiquetadas `QA simulada` dentro del navegador para comprobar estados de aula, misión e inventario. No se persistieron datos ni se enviaron solicitudes.
- Confirmado en el snapshot accesible: aula simulada activa, snapshot de misión publicada, contexto y objetivos, habilidades requeridas/optativas, rúbrica, entregable y continuidad académica. Inventario expone dos habilidades, su origen y misión relacionada; la pantalla Solicitudes muestra formulario y lista vacía.
- Viewports inspeccionados: 320, 390, 768, 1024 y 1440 px. Métrica `documentElement.scrollWidth` fue 320/320/753/1009/1425 frente a `innerWidth` 320/390/768/1024/1440; sin desbordamiento horizontal. En el botón «Solicitar ingreso», foco por teclado termina visible (`outline: solid`).
- Capturas temporales, fuera del repo: `C:\Users\vgmil\AppData\Local\Temp\MisAulasV5_ref_1440.png`, `MisAulasV5_home_fake_1440.png`, `MisAulasV5_mission_fake_1440.png`, `MisAulasV5_detail_fake_320.png`, `MisAulasV5_detail_fake_390.png`, `MisAulasV5_detail_fake_768.png`, `MisAulasV5_inventory_fake_1440.png`, `MisAulasV5_requests_1440.png`, `MisAulasV5_requests_keyboard.png`.
- El primer script de QA buscó un selector de incorporación que no estaba en ese estado después de volver a Aulas; el formulario correcto se verificó en Solicitudes. No se hizo submit.
- Las capturas usan la shell combinada V7/V4/V5 y datos explícitamente simulados; no equivalen a verificación de producción con datos reales.

## Resultado implementado

- Aulas activas con búsqueda y paginación; detalle por aula con Misiones/Habilidades; pestaña global de inventario deduplicada por ID, con filtro por aula y misión relacionada; pestaña de solicitudes con estado y validaciones existentes.
- Las misiones leen snapshots publicados. Fase e historial se consultan al expandir una misión vinculada; la continuidad falla de forma cerrada si no se puede confirmar el estado y usa callbacks persistidos ya existentes.
- Estados de carga/error/reintento, navegación responsive, foco visible y `prefers-reduced-motion`.

## Pendiente

- Ejecutar lint y `git diff --check` final, actualizar esta evidencia con sus salidas y publicar la rama/PR.
- CI y revisión de PR; merge normal con protecciones.
- Release consolidada únicamente cuando V7, V4 y V5 estén validadas juntas: verificar estado de F14 y GitHub Actions, desplegar una sola vez vía F14, comprobar producción/health y realizar QA de solo lectura con Ego Lite `Profile 5` Estudiante.
- Actualizar Notion UX-02/F17 y preparar paquete externo de evidencias de máximo 20 archivos tras verificación real; no afirmar producción antes de completarlo.
