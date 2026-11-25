# Evidencia CU-19 — en progreso

Añadida regresión al handler HTTP de Review con cuenta, repo y misión ficticios. La prueba prepara identidad de sesión `student-a`, `githubLogin=student-a` y solicita `owner=another-account` para propuesta vinculada. La aceptación espera `404 ACADEMIC_LINK_UNAVAILABLE`, cero llamadas a `resolveAcademicLink` y cero llamadas a `store.enqueue`.

La prueba está en `apps/api/src/features/review/worker-http.test.ts` dentro de suite PostgreSQL. Ejecución local del archivo: 1 suite, 11 pruebas SKIPPED porque no hay `DATABASE_URL`; Docker no está disponible (daemon `dockerDesktopLinuxEngine` no responde). No se afirma que la prueba pasó localmente. CI de PR requerido para ejecutar en base efímera `fragments_test`.

No se usaron secretos, GitHub, proveedor IA, producción ni repositorios de terceros. F19 permanece Idea; no se cambió OAuth ni se creó un repo. Autorización de propiedad real, aceptación UX del estudiante y E2E Ego Lite NO COMPROBADOS por falta de Spaces 44/80.
