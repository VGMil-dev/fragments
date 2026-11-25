# Evidencia CU-19 — en progreso

Ampliación del 2026-11-25: se añadió un caso positivo a la integración PostgreSQL. Simula el mismo `githubLogin`/`owner`, recibe una propuesta y entrega propias, espera HTTP 202 y comprueba que el trabajo encolado persiste el SHA y el contexto académico enlazado. La evaluación no se ejecuta; el proveedor IA de la fixture permanece fake y no se hacen llamadas externas.

Verificación local de la ampliación: typecheck API + contracts PASS (`pnpm exec turbo run typecheck --filter=@fragments/api...`, 4 tareas). `worker-http.test.ts`: 12 pruebas omitidas localmente por falta de `DATABASE_URL`; el test PostgreSQL fue verificado en CI.

CI #45660673729 FALLÓ por leer `status` fuera del envelope `{ok,data}`; se corrigió. CI #45661484854 pasó el caso nuevo pero detectó una carrera preexistente de ACL Inspector porque el worker reclama cualquier trabajo pendiente global. La prueba ahora espera el ID propio y el caso nuevo tolera avance concurrente. Corrección validada en CI #45662025921.

Añadida regresión al handler HTTP de Review con cuenta, repo y misión ficticios. La prueba prepara identidad de sesión `student-a`, `githubLogin=student-a` y solicita `owner=another-account` para propuesta vinculada. La aceptación espera `404 ACADEMIC_LINK_UNAVAILABLE`, cero llamadas a `resolveAcademicLink` y cero llamadas a `store.enqueue`.

La prueba está en `apps/api/src/features/review/worker-http.test.ts` dentro de suite PostgreSQL. Ejecución local del archivo: 1 suite, 11 pruebas SKIPPED porque no hay `DATABASE_URL`; Docker no está disponible (daemon `dockerDesktopLinuxEngine` no responde). No se afirma que la prueba pasó localmente. CI de PR requerido para ejecutar en base efímera `fragments_test`.

No se usaron secretos, GitHub, proveedor IA, producción ni repositorios de terceros. F19 permanece Idea; no se cambió OAuth ni se creó un repo. Autorización de propiedad real, aceptación UX del estudiante y E2E Ego Lite NO COMPROBADOS por falta de Spaces 44/80.

## CI PostgreSQL aislado y PR

- PR [#304](https://github.com/VGMil-dev/fragments/pull/304), head de código `76563ff7b6e1f05c29918061c189605eba0f6302`.
- CI [#45656165594](https://github.com/VGMil-dev/fragments/actions/runs/45656165594): SUCCESS; `worker-http.test.ts` 11/11 (PostgreSQL integration), API 280/280, web 333/333, typecheck/lint/build incluidos por workflow PASS.
- El fixture verifica la identidad/base aislada `fragments_test`; el caso rechazado devuelve 404 antes de `resolveAcademicLink` y `enqueue`.
- PR #304 integrado mediante merge normal en `2c9480b612bc89bcb31314758c7d99e54b2ba1e6`; CI final del head de documentación #45656675286 SUCCESS. Producción y Ego Lite permanecen pendientes. CU-19 no se considera PASS completo: propiedad real del repositorio, flujo autenticado positivo/negativo y UX de consentimiento no comprobados. No hay llamadas a GitHub/IA.
- PR [#308](https://github.com/VGMil-dev/fragments/pull/308), cambios `ec165da279fbec4806f351f6533712ab8036efda` / `d29bb25a14e03f34e17ea10a54da15c33524f7fa`, merge normal en `11cb94e710fb9d9041370d398bc8254570551b3d`.
- CI [#45662025921](https://github.com/VGMil-dev/fragments/actions/runs/45662025921): SUCCESS; `worker-http.test.ts` 12/12, API 281/281, web 333/333, typecheck/lint/build PASS. Ejecutó PostgreSQL desechable `fragments_test`. El caso positivo valida handler y persistencia en cola con resolutor de misión fake; no ejecuta worker ni proveedor IA. El caso Inspector de cola global pasó tras hacer determinista la espera del fixture.
- Fila CU-19 de la matriz actualizada en Notion con esta distinción. Producción/Ego Lite, propiedad GitHub real, consentimiento UX y envío IA NO COMPROBADOS; CU-19 sigue PARCIAL. F19 sigue Idea y no se creó repo ni se cambiaron scopes OAuth.
