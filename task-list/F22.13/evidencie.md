# Evidencia F22.13 — Historial persistente operativo

## Implementación local

- Rama `codex/f22.13-persisted-admin-events`, base `origin/main` `92bd58b7a76c6eab64ffc4e7129041e44835cdc9`.
- Nueva tabla `admin_operational_events`, sin FK académica, índices por origen/fecha, migración aditiva `20261123100000_admin_operational_events`.
- El runtime persiste únicamente proyecciones allowlisted existentes; Review IDs se guardan como `null`. La lectura revalida el JSON, usa PostgreSQL asíncrono y conserva auth y auditoría fail-closed de las rutas actuales.
- Retención física: 30 días y 10 000 filas; limpieza serializada por cliente Prisma después de escribir, durante el arranque y cada hora. Los fallos del sink no alteran el resultado de Mentor/Review.
- Revisión independiente inicial encontró P2 porque la purga dependía de nuevas escrituras. Se añadió `prune()` periódico/inicial y regresión sin actividad. Revisión delta final PASS, sin hallazgos pendientes.
- PostgreSQL efímero sin volumen, enlazado solo a `127.0.0.1:55448`; preflight `current_database() = fragments_test`. Se desplegaron las 6 migraciones y `prisma migrate status` informó esquema actualizado. La integración escribe un evento fake, lo recupera desde una nueva instancia del store y comprueba que el prompt no se persiste. Contenedor detenido/eliminado; no se tocó ningún contenedor previo.
- Verificación focal fresca en el commit `0956211`: 7 archivos, **31/31 PASS**, incluidos integración PostgreSQL y Better Auth local. Se confirmó `current_database() = fragments_test`, 6/6 migraciones y `prisma migrate status` actualizado; contracts build, API typecheck/build y `git diff --check` PASS.
- Producción no consultada ni modificada; no hubo evaluación IA. Sesión admin real, historial de eventos reales, lectura autenticada y retención productiva siguen **NO COMPROBADOS**.
- Commits de implementación `66e0054` (`feat(F22.13): persiste eventos operativos redactados`) y fix `0956211` (`fix(F22.13): aisla errores sincronicos del sink`) en `codex/f22.13-persisted-admin-events`. No se usaron credenciales productivas.

## Merge y release F14 v0.5.34 · 2026-11-23

- PR #168 se integró normalmente en `main` como `2834dfc637bf93fccd5d073b64de072cdae911f6`; CI `45133686585` SUCCESS. La migración aditiva `20261123100000_admin_operational_events` y persistencia con retención acotada están en el release.
- F14 `v0.5.34` (run `45134914694`) pasó `verify-build`, `attest-package` y `publish-approved-release`; aplicación pública posteriormente observada en el SHA de `main` `5ab32afde23e7ed29724a757ce7a064c3b40704b`, con health `ok/database=ready`.
- El estado de la tabla/migración en PostgreSQL productivo, la lectura autenticada del historial, la sesión admin, eventos reales y retención productiva continúan **NO COMPROBADOS**. La salud HTTP no demuestra esos estados. No se escribieron datos admin ni se provocó evaluación real.

## Revalidación aislada de persistencia · 2026-11-23

- Se ejecutó `apps/api/src/features/admin-operational-events/prisma-store.integration.test.ts` en un PostgreSQL efímero; el preflight devolvió `current_database() = fragments_test`, las siete migraciones versionadas se aplicaron y el contenedor se eliminó al terminar.
- Resultado fresco: **1/1 PASS**. Un evento Mentor fixture/fake se leyó desde el store persistente y se comprobó que una propiedad privada (`privatePrompt`) no se guardó. Esto valida el mecanismo de persistencia/redacción compartido; no valida evento Trainer real, feed admin autenticado ni producción.
- No se modificó código, infraestructura productiva ni datos productivos. Tabla/migración productiva, eventos reales, sesión admin, feed autenticado y retención siguen **NO COMPROBADOS**.
