# F04.1 — Intent

Corregir la exportación PDF de Mentor cuando los campos superan el ancho de línea: conservar cada fragmento y su orden, sin repetir el prefijo ni perder el final del texto.

El alcance es el renderer PDF de Mentor y su regresión automatizada. Mantener exportación bajo demanda, artefactos efímeros, snapshot/verificación e IA sin cambios. No modificar la rúbrica, los proveedores ni los contratos.

El fallo fue observado en una entrega QA propia de producción `v0.5.78`; el PDF sin sanitizar se excluye del paquete porque incluye un código de verificación. Evidencia Ego Lite recortada y sin ese código: `FRAGMENTS_EVIDENCIAS_FINAL/CU29-pdf-layout-defect-crop.png`.
