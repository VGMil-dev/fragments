# Evidencia F22.11 — Feed operativo Review para administración

## Implementación local

- Rama `codex/f22-review-events-admin`, basada en el merge de PR #131, `040f5f032c252d78f263891034d1166926e3f792`.
- El worker comparte una única proyección segura entre stdout y el buffer en memoria. Cada evento gana timestamp UTC al cruzar la frontera de logging; el buffer conserva 100 como máximo y devuelve copias aisladas.
- Endpoint `/api/admin/review-events`, con Better Auth admin, límite 1–50, cache-control `no-store`, allowlist y `admin.review_events.read` fail-closed antes de consultar el buffer.
- UI `/admin/review-events` presenta eventos técnicos, estado de carga/error/vacío, reintento manual y retención efímera. El registro administrativo existente incluye la nueva lectura.
- No hubo cambios a contracts, base de datos, migraciones, infraestructura ni stdout del host.

## Verificación local fresca

- Pruebas focales API: 15 PASS; web: 13 PASS.
- Suite API: 146 PASS, 68 omitidas por ausencia de `DATABASE_URL` (tests dependientes de DB).
- Suite web: 186/186 PASS.
- Typecheck/build API y web: PASS.
- `git diff --check`: PASS.
- UI implementada aplicando selectivamente `vercel-react-best-practices`: fetch efímero en efecto con limpieza de resultado obsoleto y estados simples; no se añadieron dependencias.

## Límites y bloqueos

- Todas las respuestas y eventos de pruebas son fake/sintéticos; feed y contenido de Review productivos siguen NO COMPROBADOS.
- No se abrió una sesión Better Auth admin ni se usó Ego Lite para la vista admin. Se preservaron sesiones ya abiertas; acceso autorizado y UI con rol admin quedan NO COMPROBADOS.
- Retención/rotación de stdout del host e historial previo/reinicio continúan NO COMPROBADOS. El nuevo buffer se pierde al reiniciar el API.
- La advertencia del build web por chunk >500 kB se mantiene; no se cambió code splitting en este scope.
- Revisión independiente PASS; PR #132 integrada, CI y F14 completos (ver resultado abajo).
- Revisión independiente estática: PASS; confirmó autorización admin antes del acceso al buffer, auditoría `admin.review_events.read` antes de `store.list`, fail-closed cuando auth/auditoría no está disponible, copias aisladas y proyección segura compartida. No ejecutó suites ni comprobó roles en despliegue real.
- Verificación focal repetida tras los últimos cambios: API 6/6 y web 5/5 PASS; `git diff --check` PASS.
- La primera comprobación de red devolvió el bundle anterior antes de que el poller procesara la cola; verificación posterior de despliegue abajo. Eventos reales, sesión/UX admin y retención siguen NO COMPROBADOS.
- Verificación completa fresca adicional: API 146 PASS y 68 omitidas por falta de DATABASE_URL; web 186/186 PASS; typecheck API/web y builds API/web PASS. Build web conserva avisos existentes de chunk >500 kB y directivas de Lucide.
- PR #132 integrada por merge normal en `7c6dee9b25f6ee62510ba9b2b0c0db608c8c3607`; CI `45080397656` SUCCESS; revisión independiente estática PASS.
- Tag anotada `v0.5.22` apunta al merge exacto; F14 run `45080626727` completó SUCCESS en verify-build, attest-package y publish-approved-release. La primera solicitud pública tras el workflow devolvió el bundle previo mientras la release esperaba al siguiente poll; health respondió ok/database ready.
- Aplicación verificada: poller y aplicador reportan success; SSH read-only muestra API/web healthy en `sha-7c6dee9`; health público `ok/database=ready`; bundle cache-bypass `/assets/index-JgzducOG.js` contiene v0.5.22, SHA exacto y `/admin/review-events`.
- Implementación commit `b0ddd4e239dc251e4c7ccdf9988d3aefa4c2cbde`; PR #132 merge normal `7c6dee9b25f6ee62510ba9b2b0c0db608c8c3607`; CI `45080397656` PASS; F14 tag anotada/run `45080626727` SUCCESS.
