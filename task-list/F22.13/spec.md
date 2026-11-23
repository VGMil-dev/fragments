# Especificación F22.13 — Historial persistente operativo

## Comportamiento

- Eventos `mentor` y `review` llegan al store solo después de la proyección/redacción de cada dominio.
- El store inserta una fila tipada por origen y conserva el JSON ya proyectado. Para Review, `reviewId` y `jobId` se omiten en disco para evitar correlación con registros académicos; la UI histórica conserva la forma del DTO y recibe `null`.
- Retención física: máximo 30 días y 10 000 filas en total; limpieza best-effort al escribir, al arrancar y cada hora. Ninguna escritura al store puede cambiar el resultado del trabajo académico.
- Los endpoints actuales consultan las últimas 1–50 filas de PostgreSQL después de autenticar y registrar auditoría. El acceso continúa fail-closed.
- La lectura de la fila JSON valida nuevamente con el proyector del dominio y descarta cualquier dato inesperado/corrupto.
- Si PostgreSQL o la lectura falla, el endpoint devuelve su error seguro ya establecido. No hace fallback silencioso a una muestra incompleta en memoria.

## Migración y datos

- Tabla sin FK a usuarios, aulas, propuestas, reviews o jobs.
- Índices por origen/fecha y fecha para paginación y limpieza.
- No migrar ni importar stdout histórico. La tabla se inicia vacía y la retención comienza con eventos posteriores al despliegue.

## Verificación

- Tests unitarios con fake Prisma: proyección, descarte de identificadores, límites, purga y aislamiento de errores.
- Integración PostgreSQL local `fragments_test`: escritura de evento fake, lectura posterior desde el store y limpieza por política; sin tocar producción.
- Tests HTTP: store async, auditoría previa a lectura, 401/403 y 503 si el store falla.
- Typecheck/build focal, suite offline relevante y `git diff --check`.

## No comprobado

La persistencia de evento generado por una evaluación real en producción, sesión admin productiva, lectura autenticada Ego Lite, desempeño/retención empíricos y corrección de eventos del host permanecen NO COMPROBADOS hasta ocurrir de forma legítima.
