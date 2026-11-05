# F06 — Evidence / evidencie

Estado: PARCIAL. Inspector ahora tiene contratos compartidos, SQLite, rutas HTTP con sesión docente, cliente tipado, panel/ruta web y E2E con Review/provider fake. No se marca F06 como completada: el runner normal todavía no inyecta el servicio, no hay verificador/login docente habilitado y F05 aún no persiste ni expone snapshots Review.

Owner: W6; integración y contratos: PLANNER.
Branch: `task/f06-inspector`, actualizada mediante merge no destructivo desde `codex/fragments-mvp` (`b984de4`).

## Rutas implementadas

- Contratos: `packages/contracts/src/index.ts`, `packages/contracts/src/index.test.ts`, `docs/CONTRACTS.md`.
- Dominio existente alineado a contratos: `apps/api/src/features/inspector/service.ts`.
- Persistencia SQLite: migración runtime v3 en `apps/api/src/db/migrate.ts`, espejo `apps/api/migrations/003-inspector.sql`, repositorio `apps/api/src/features/inspector/repository.ts`.
- HTTP: `apps/api/src/features/inspector/http.ts`, registrado en `apps/api/src/http/app.ts`; rutas docente GET/POST desafíos, asignación y defensa con cookie firmada verificada, límites de body, envelopes genéricos y `Cache-Control: no-store`.
- Web: `apps/web/src/lib/api/inspector-api.ts`; panel y workspace en `apps/web/src/features/inspector/`; ruta `/teacher/inspector`, link de pie y foco en `apps/web/src/App.tsx`.
- Diseño de contrato y rutas: `docs/SYSTEM_DESIGN.md`.
- Criterios, intención y limitaciones: `task-list/F06/intent.md`, `task-list/F06/spec.md`.

## Seguridad y comportamiento

- Las rutas rechazan sesión ausente; la identidad de docente sale del HMAC session cookie, no del body.
- El reto de la respuesta estudiante usa el schema público; el hint privado se filtra antes de serializar y el schema estricto rechaza `teacherHint`.
- Rechazo por SHA obsoleto, snapshot/digest/rango de línea inválido o hallazgo no verificado; nunca se ejecuta código del repositorio.
- El almacén persiste estado, desafío privado, asignación, SHA sucesor y defensa. Las respuestas privadas no se cachean.
- Los drivers de E2E están rotulados como fake y solo corren en pruebas/QA local; no se llamó a GitHub ni a AI Gateway.

## Verificación fresca

- `pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments --config.confirmModulesPurge=false` — exit 0; lockfile vigente, sin scripts de paquetes.
- TDD contratos: prueba nueva primero falló (1 archivo, 1 fallo por schema ausente); después `pnpm exec vitest run packages/contracts/src/index.test.ts` — exit 0; 17/17.
- `pnpm build` — exit 0; 3 paquetes.
- `pnpm typecheck` — exit 0; 4 tareas de workspace.
- `pnpm test` — exit 0; contracts 17/17, API 34/34 (10 archivos).
- `pnpm lint` — exit 0; lint declarado en contracts.
- `pnpm exec vitest run apps/api/src/features/inspector apps/web/src/lib/api/inspector-api.test.ts apps/web/src` — exit 0; 14 archivos, 47 pruebas.
- `git diff --check` — exit 0.
- `ego-browser skill` — v2.2.0 leído y ejecutado hasta `[ego-browser:skill] end of guide`.
- E2E Ego Lite con SQLite en memoria, sesión de docente de fixture, Review/provider fake y proxy local: login 200, cargar revisión, crear→asignar→registrar defensa, recargar reto persistido; el estado final fue `Realizado`, el hint solo apareció en espacio docente. Capturas a 390px y 1440px abajo.

## Capturas / SHA-256

- `task-list/F06/screenshots/inspector-defense-390.png` — `21a1564da23b39320857232848761469f16f14460da1ac53fe4977836bb358ae`
- `task-list/F06/screenshots/inspector-defense-1440.png` — `283f0c4a7d0b085ae0518ca0e8226413a6af66a28c30a80148db8c1adc189607`

## Pendiente de integración antes de DONE

- El entrypoint normal `apps/api/src/main.ts` no crea `InspectorService`: F05 no expone ni persiste la revisión/snapshot que requiere Inspector.
- No se habilitó autenticación docente real. El runner falla cerrado si `AUTH_ENABLED` se activa sin verificador; la UI no tiene formulario de inicio de sesión. El E2E usó un verificador de fixture aislado.
- La E2E integrada usa una revisión fake verificada; falta la conexión a la persistencia y snapshots exactos de F05.
- Por esos motivos, F06 y F07 siguen `[ ]` en `task-list/TASKS.md`. Este cierre no invocó GitHub/Gateway ni desplegó servicios.

## Commits

- Merge de integración inicial: `b984de4` (raíz actualizada sin reescribir historial).
- Merge actual de `codex/fragments-mvp`: `13fcdf9` (merge limpio; incorporó contratos upstream sin conflictos).
- Implementación F06 parcial: `c1c29eb` (`feat(f06): integra Inspector docente`).

## Seguimiento W6 — snapshot exacto y credenciales docentes

Se añadieron dos adaptadores dentro de `apps/api/src/features/inspector/`:

- `review-adapter.ts` carga el Review por ID y vuelve a solicitar su snapshot usando el owner, repo y SHA guardados. Rechaza otra identidad/commit y recalcula el digest canónico antes de devolver evidencia al dominio. El dominio valida de nuevo el SHA, identidad disponible, unicidad de rutas, ruta de evidencia, digest y rango real de líneas.
- `teacher-auth.ts` verifica hashes scrypt con parámetros/formato acotados en `teachers.password_hash` y construye el `TeacherSessionService` existente con `SessionAuth`. `createInspectorTeacherPasswordHash()` genera hashes para un provisioning manual controlado; no crea usuarios ni muestra o almacena contraseñas en logs.
- La composición compartida aún debe pasar al adaptador un lookup Review con `getById(id)` y `getLatestCommit(projectId)`, junto con un lector de snapshot por SHA. El runner no inyecta todavía este adaptador ni el verificador, y la UI no tiene login; por eso F06 sigue parcial.
- No se encontraron tres SHAs públicos en los fixtures locales; los casos Promptfoo son fixtures de salida y no se hicieron solicitudes externas para probar GitHub.

Verificación fresca después del merge y cambios:

- `pnpm exec vitest run apps/api/src/features/inspector` — exit 0; 4 archivos, 11 pruebas (incluye reader exacto, digest alterado, identidad distinta, rangos inválidos y auth scrypt offline).
- `pnpm --filter @fragments/api test` — exit 0; 12 archivos, 40 pruebas.
- `pnpm --filter @fragments/api typecheck` — exit 0.
- `git diff --check` — exit 0.
- No se llamó a GitHub, AI Gateway ni servicios externos; no se leyó `.env` ni se ejecutó código de repositorios de estudiantes.
