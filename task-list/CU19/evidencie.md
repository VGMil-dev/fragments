# Evidencia CU-19 — en progreso

Añadida regresión al handler HTTP de Review con cuenta, repo y misión ficticios. La prueba prepara identidad de sesión `student-a`, `githubLogin=student-a` y solicita `owner=another-account` para propuesta vinculada. La aceptación espera `404 ACADEMIC_LINK_UNAVAILABLE`, cero llamadas a `resolveAcademicLink` y cero llamadas a `store.enqueue`.

La prueba está en `apps/api/src/features/review/worker-http.test.ts` dentro de suite PostgreSQL. Ejecución local del archivo: 1 suite, 11 pruebas SKIPPED porque no hay `DATABASE_URL`; Docker no está disponible (daemon `dockerDesktopLinuxEngine` no responde). No se afirma que la prueba pasó localmente. CI de PR requerido para ejecutar en base efímera `fragments_test`.

No se usaron secretos, GitHub, proveedor IA, producción ni repositorios de terceros. F19 permanece Idea; no se cambió OAuth ni se creó un repo. Autorización de propiedad real, aceptación UX del estudiante y E2E Ego Lite NO COMPROBADOS por falta de Spaces 44/80.

## CI PostgreSQL aislado y PR

- PR [#304](https://github.com/VGMil-dev/fragments/pull/304), head de código `76563ff7b6e1f05c29918061c189605eba0f6302`.
- CI [#45656165594](https://github.com/VGMil-dev/fragments/actions/runs/45656165594): SUCCESS; `worker-http.test.ts` 11/11 (PostgreSQL integration), API 280/280, web 333/333, typecheck/lint/build incluidos por workflow PASS.
- El fixture verifica la identidad/base aislada `fragments_test`; el caso rechazado devuelve 404 antes de `resolveAcademicLink` y `enqueue`.
- Merge, producción y Ego Lite permanecen pendientes. CU-19 no se considera PASS completo: propiedad real del repositorio, flujo autenticado positivo/negativo y UX de consentimiento no comprobados. No hay llamadas a GitHub/IA.