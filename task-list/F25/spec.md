# F25 — Especificación

## Alcance

- Inventariar nombres y metadatos de outputs/evaluaciones locales sin abrir datos sensibles.
- Revisar fixtures y proveedor offline existentes y comprobar determinismo local.
- Determinar si los commits públicos A/B/C del fixture están clonados localmente; nunca descargarlos.
- Revisar la configuración Promptfoo para confirmar proveedor local y asserts deterministas.
- Mantener intención, especificación y evidencia F25 actualizadas. No editar TASKS.md, contratos, prompts, rúbricas ni producción.

## Criterios

- La revisión offline no realiza llamadas externas ni lee secretos.
- Los hallazgos distinguen fixtures sintéticas, datos persistidos y calidad real.
- Si faltan corpus o herramientas, se registra NO COMPROBADO y la causa.
- No se ejecuta código de repositorios estudiantiles.
