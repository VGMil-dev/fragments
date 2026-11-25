# Especificación CU-19 — guarda de propiedad GitHub

## Aceptación

- Request autenticada con `owner` igual al `githubLogin` y propuesta propia resuelve la misión/entrega, encola una Review y persiste el contexto académico junto al SHA solicitado.
- Request autenticada con propuesta propia y `owner` distinto al `githubLogin` de la sesión devuelve `404 ACADEMIC_LINK_UNAVAILABLE`.
- La discrepancia no consulta el vínculo académico ni encola Review.
- Pruebas PostgreSQL aisladas en CI con `current_database()` protegido por `assertIsFragmentsTest`; proveedor fake no ejecutado.
- Suite API y typecheck pasan.

## Límites

No se crea ni persiste un vínculo GitHub reutilizable, no se crean repositorios, no se solicitan scopes OAuth ni se hacen llamadas a GitHub o IA. La propiedad real de un repositorio del titular correcto y el recorrido autenticado Ego Lite siguen pendientes.
