# F04.1 — Evidencia

Estado: en desarrollo.

## Observación productiva previa

- 2026-11-25, `v0.5.78`, SHA `4e61e03868984546f8ab572a61d8ef93b838dd66`, Ego Lite Space 80/Profile 5. Se descargó una entrega Mentor propia desde Mis entregas, sin generar evaluación.
- El visor PDF de Ego Lite mostró duplicados los prefijos de los campos largos y omitió el texto restante. Una lectura autenticada de propuestas confirmó que los campos fuente eran de una sola línea y no repetían el texto.
- Causa localizada en `apps/api/src/features/mentor/local-fakes.ts`: tras dividir el texto, `wrapPdfLine` añadía `normalized.slice(0, 88)` en vez del fragmento restante.
- Evidencia de navegador, recortada para excluir el código de verificación: `FRAGMENTS_EVIDENCIAS_FINAL/CU29-pdf-layout-defect-crop.png`; SHA-256 `6353CC7E6C0E5621B4C1E257000802521737E6122CA374C485B1B990282BBC6B`.
- Se excluyó el PDF original del paquete porque contiene un código de verificación. No se modificó la entrega ni se hizo una llamada IA.

## Skills

- `ego-browser` v2.2.1: aplicada para descarga auténtica y observación de la entrega propia.
- Skill `pdf`: aplicada para inspección visual independiente con visor PDF Ego Lite y render Poppler. Poppler carece de algunas fuentes; la repetición también apareció en el visor PDF de Ego Lite, por lo que no se atribuye a Poppler.
- `test-driven-development`: aplicar ciclo rojo-verde al añadir regresión local. No se encontró SKILL.md local en el catálogo disponible; no se instaló.
- `verification-before-completion`: registrar comandos frescos, CI y limitaciones antes de completar. No se encontró SKILL.md local; no se instaló.

## Código y verificación

Pendiente.

## Integración

Pendiente PR, revisión/CI y decisión F14. No se publicará tag sin los controles aprobados.
