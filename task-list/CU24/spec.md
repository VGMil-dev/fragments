# CU-24 — Specification

## Aceptación

- GIVEN DATABASE_URL apunta a otra base, WHEN comienza una prueba PostgreSQL de Trainer, THEN compara `current_database()` antes de crear/eliminar fixtures y falla cerrado.
- GIVEN la base es `fragments_test`, WHEN corren las pruebas HTTP/Prisma, THEN se permite el flujo y la limpieza limitada a sus IDs/sesión aleatorios.
- La prueba de banco/intent persiste fixture de Review + commit sin ejecutar repositorios ni invocar proveedor de IA.
- Una prueba local omitida por falta de DATABASE_URL se reporta como NO COMPROBADA, no PASS.

## Límites

Sin migraciones, datos productivos, llamadas IA, navegador alternativo o cambios de rutas/contratos.
