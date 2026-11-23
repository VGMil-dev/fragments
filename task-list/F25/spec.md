# F25 — Especificación

## Alcance

- Inventariar nombres y metadatos de outputs/evaluaciones locales sin abrir datos sensibles.
- Revisar fixtures y proveedor offline existentes y comprobar determinismo local.
- Determinar si los commits públicos A/B/C del fixture están clonados localmente; nunca descargarlos.
- Revisar la configuración Promptfoo para confirmar proveedor local y asserts deterministas.
- Clasificar outputs ausentes, finding IDs desconocidos y rutas de cita que no figuran en el allowlist de evidencia del fixture A/B/C.
- Mantener intención, especificación y evidencia F25 actualizadas. No editar TASKS.md, contratos, prompts, rúbricas ni producción.

## Criterios

- La revisión offline no realiza llamadas externas ni lee secretos.
- Los hallazgos distinguen fixtures sintéticas, datos persistidos y calidad real.
- La pertenencia de una ruta al array `evidence` solo demuestra coincidencia con metadatos del fixture; no prueba que exista en el snapshot, que las líneas/digest correspondan ni que la cita respalde semánticamente el hallazgo.
- Las etiquetas correct/false-positive/omission son concordancia mecánica con metadatos A/B/C no revalidados; no constituyen ground truth técnico ni quality score.
- Si faltan corpus o herramientas, se registra NO COMPROBADO y la causa.
- No se ejecuta código de repositorios estudiantiles.
