# Evidencia F22.13 — Historial persistente operativo

## Implementación local

- Rama `codex/f22.13-persisted-admin-events`, base `origin/main` `92bd58b7a76c6eab64ffc4e7129041e44835cdc9`.
- Nueva tabla `admin_operational_events`, sin FK académica, índices por origen/fecha, migración aditiva `20261123100000_admin_operational_events`.
- El runtime persiste únicamente proyecciones allowlisted existentes; Review IDs se guardan como `null`. La lectura revalida el JSON, usa PostgreSQL asíncrono y conserva auth y auditoría fail-closed de las rutas actuales.
- Retención física: 30 días y 10 000 filas; limpieza serializada por cliente Prisma después de escribir, durante el arranque y cada hora. Los fallos del sink no alteran el resultado de Mentor/Review.
- Revisión independiente inicial encontró P2 porque la purga dependía de nuevas escrituras. Se añadió `prune()` periódico/inicial y regresión sin actividad. Revisión delta final PASS, sin hallazgos pendientes.
- PostgreSQL efímero sin volumen, enlazado solo a `127.0.0.1:55448`; preflight `current_database() = fragments_test`. Se desplegaron las 6 migraciones y `prisma migrate status` informó esquema actualizado. La integración escribe un evento fake, lo recupera desde una nueva instancia del store y comprueba que el prompt no se persiste. Contenedor detenido/eliminado; no se tocó ningún contenedor previo.
- Verificación focal fresca: 7 archivos, **31/31 PASS**, incluidos integración PostgreSQL y Better Auth local; contracts build, API typecheck/build y `git diff --check` PASS.
- Producción no consultada ni modificada; no hubo evaluación IA. Sesión admin real, historial de eventos reales, lectura autenticada y retención productiva siguen **NO COMPROBADOS**.
- Commit de implementación `66e0054` (`feat(F22.13): persiste eventos operativos redactados`) en `codex/f22.13-persisted-admin-events`. No se usaron credenciales productivas.
