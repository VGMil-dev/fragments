# F21 — Intención

## Problema
Fragments usa SQLite en la API de producción y debe migrar de forma limpia a PostgreSQL con Prisma, sin interrumpir el servicio existente durante la preparación.

## Objetivo
Desplegar PostgreSQL privado con `fragments_prod` y `fragments_test` en la VPS, con roles separados; migrar autenticación y toda la persistencia API a Prisma; comprobar integridad funcional, copias y restauración; publicar mediante F14 y actualizar el registro F21 de Notion después de validar producción.

## No objetivos
- Importar datos de SQLite: cuentas, sesiones y registros antiguos no se transfieren.
- Mantener compatibilidad dual o rollback permanente a SQLite; solo se conserva una copia de emergencia antes del primer corte.
- Cambiar interfaces o capacidades de producto fuera de los arreglos mínimos que QA F21 demuestre necesarios.
- Cambiar F15/F18 o añadir F18.B/F19.
- Tocar servicios de Pits, publicar el puerto 5432 o exponer credenciales.
- Eludir protecciones F14, la aprobación de `fragments-production` o cualquier control de seguridad.

## Owner y criterios
Owner: PLANNER. Skill aplicada: `notion-spec-to-implementation`. Cierre solo después de PR/CI, tag anotada, aprobación protegida, despliegue y smoke checks públicos, respaldos/restauración verificados, QA Ego Lite y carpeta `F21_EVIDENCIAS` con máximo 20 archivos.
