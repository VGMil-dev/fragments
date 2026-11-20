# F21 — Especificación

## Alcance técnico
- Un contenedor PostgreSQL persistente nuevo en Docker Compose, sin puertos públicos, con `fragments_prod` y `fragments_test`; usuarios de aplicación y migración independientes por base con mínimos privilegios.
- Prisma ORM 7 fijado; esquema/migraciones versionados para Better Auth, Mentor, Review, Inspector, Trainer, Classroom Studio, presupuesto IA y trabajos/leases.
- Runtime API sin SQLite. Better Auth usa el adaptador Prisma oficial y conserva roles, OAuth sin vinculación implícita y controles de sesión.
- Inicialización limpia. Crear y verificar respaldo de emergencia SQLite antes del corte irreversible; no importar sus filas.
- `fragments_test` accesible desde Windows únicamente por túnel SSH y credencial de pruebas separada. Tests/fixtures sintéticos, sin gasto de IA ni correos.
- Adaptar compose/runtime/backup/restore y agente F14; preservar aprobaciones, attestation, rollback de imagen entre versiones PostgreSQL, ledger y protección de Pits. La copia de PostgreSQL debe poder restaurarse y verificarse antes de corte. Antes del primer corte se conserva solo un backup SQLite de emergencia; no hay rollback permanente a SQLite.

## Flujos de aceptación
1. Base nueva reproduce el esquema desde migraciones Prisma, con restricciones e índices conforme a ER-03.
2. Conexión de producción usa rol de aplicación; despliegue aplica solo migraciones versionadas y revisadas. SQLite no aparece en producción después de la conmutación.
3. Test/QA ejercita autenticación, permisos, persistencia, concurrencia/idempotencia, revisión y reservas IA con fixtures etiquetadas.
4. Docente y estudiante tienen sesiones aisladas en Ego Lite; comprobar aula→código→solicitud→aprobación→acceso y rutas/protección de módulos existentes, en ventanas responsive, sin rediseños.
5. Backup PostgreSQL por base y restore aislado pasan; F14 revierte imágenes solo entre releases PostgreSQL y la recuperación de datos usa backups PostgreSQL verificados.
6. CI `verify` pasa; PR merge normal; release por tag SemVer anotada y SHA de `main`; aprobación `fragments-production`; agente F14 despliega y confirma salud.
7. F21 de Notion y `F21_EVIDENCIAS/INFORME_FINAL.md` reflejan solo resultados observados.

## Límites
No se usa la base de producción para tests/reset/seed; no se habilitan secrets SSH en CI/PRs; no se contacta IA pagada ni correo real durante tests; no se declara OAuth real si solo pasó el proveedor simulado. El flujo OAuth de estudiante real requiere identidad GitHub permitida y sesión independiente ya existente.
