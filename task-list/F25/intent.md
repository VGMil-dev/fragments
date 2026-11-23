# F25 — Intención

Establecer una línea base offline y reproducible para revisar evaluaciones Review: inventariar evidencia persistida local disponible, documentar fixtures deterministas y preparar el uso de commits públicos A/B/C solo si sus objetos ya están clonados.

No contactar AI Gateway, proveedores reales, producción ni servicios externos; no leer valores de secretos; no modificar prompts, rúbricas ni producción; no ejecutar código de repositorios estudiantiles. No declarar calidad real validada.

El harness offline también clasifica la falta de outputs y las citas/finding IDs que no coinciden con metadatos locales, sin presentar esa comparación como validación de código fuente o de calidad semántica.

El verificador estructural puede contrastar referencias con un `RepositorySnapshot` ya disponible localmente: existencia de archivo, rango inclusivo de líneas, SHA Git de cada archivo y digest canónico del snapshot. Esta comprobación no requiere descargar el corpus A/B/C y no juzga si la cita respalda el hallazgo.
