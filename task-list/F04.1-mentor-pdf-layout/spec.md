# F04.1 — Specification

## Aceptación

- GIVEN un campo de propuesta mayor a 88 caracteres, WHEN Mentor genera su PDF, THEN todas las particiones aparecen una sola vez, en orden, incluido el sufijo posterior al límite.
- GIVEN los campos de la entrega, WHEN se renderiza el documento, THEN cada campo se incluye una sola vez y el archivo sigue siendo un PDF válido de varias páginas cuando corresponda.
- GIVEN se descarga desde una entrega propia, WHEN se obtiene el PDF, THEN no se requiere evaluación nueva y el artefacto sigue siendo efímero.
- Las pruebas usan el evaluator fake existente; no realizan llamadas a IA ni usan archivos de estudiantes.

## Fuera de alcance

- Rediseño tipográfico, cambios en formato de rúbrica, modificación de proveedores o contratos, llamada IA, cambio de datos productivos, tag o despliegue.
