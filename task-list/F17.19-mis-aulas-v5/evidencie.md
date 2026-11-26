# F17.19 — Evidencia Mis aulas V5

## Estado

En desarrollo. No se declara integrada ni desplegada.

## Fuente y alcance

- Kit extraído fuera del repositorio: `%TEMP%\Fragments_Mis_Aulas_V5_Kit`.
- Copias utilizadas: `apps/web/src/features/student/assets/mis-aulas-biblioteca.webp` y `mis-aulas-habilidades.webp`.
- La referencia HTML, el ZIP y sus datos/acciones de demostración no se versionan.
- No se modifican `App.tsx`, la barra lateral compartida, contratos, endpoints, persistencia ni dependencias.

## Skills

- `vercel-react-best-practices`: derivar filtros desde props, agrupar con el ID de habilidad, paralelizar cargas independientes y evitar memoización superflua.
- `ego-browser`: skill leído y ejecutado antes de iniciar la comparación visual/E2E; QA pendiente.
- TDD: la suite de Mis aulas se reemplazó por criterios del flujo V5; se observó rojo antes de la implementación y verde después.

## Verificaciones locales

- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx` — PASS, 9 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — PASS, 23 pruebas; recorre continuidad desde la navegación V5 hasta Mentor, Review y Trainer.
- `pnpm --filter @fragments/web exec vitest run` — PASS, 58 archivos / 343 pruebas.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; Vite optimizó e importó ambos WebP. Conserva el aviso del bundle JavaScript >500 kB de la app y de directivas `use client` de lucide-react; no hubo error.
- `git diff --check` — PASS, sin errores.
- Intento inicial del test antes de construir contracts: 176 pruebas pasaron, 19 suites no cargaron por faltar el build local de `@fragments/contracts`; se compiló el paquete sin cambiar lockfile ni versiones y el test focal quedó en verde.
- `pnpm install` enlazó 441 paquetes fijados desde el almacén PNPM existente; no produjo EPERM ni cambios al lockfile.

## Resultado implementado en el worktree

- Lista de aulas activas con búsqueda y expansión, interior por aula, pestañas Misiones/Habilidades, inventario deduplicado por ID, filtros y misiones relacionadas.
- Detalle usa snapshots publicados; consulta fase/historial solo cuando se abre una misión vinculada y bloquea la continuidad si no puede confirmar estado.
- Formulario conserva validación y errores de ingreso existentes. `App.student-flow.test.tsx` recorre callbacks reales de Mentor/Review/Trainer con fixtures.
- El test de integración inicial mostró seis selectores obsoletos de la lista anterior; se adaptaron a abrir un aula y una misión. La suite actual pasa completa.

## Pendiente

- QA Ego Lite local en viewports 320/390/768/1024/1440, teclado, búsqueda, filtros, detalles, continuidad y estados de solicitud/error.
- Review V7 (#349) y Mi espacio V4 (#348) se integraron en main antes de esta rama; actualizar desde `origin/main` y resolver conflictos coordinados.
- Repetir suite web, typecheck y build; CI/PR/merge/tag y validación F14 coordinada.
- Actualizar esta evidencia con resultado de `git diff --check`, capturas, commit y resultados reales de integración/producción.
