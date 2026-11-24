# Especificación F16.12

- Aplicar tokens y jerarquía Pixel Night al encabezado, aviso de publicación, listado, detalle y estado vacío/error/carga existentes.
- Reducir la prominencia del aviso extenso y mantener íntegramente su significado y legibilidad.
- El listado comunica título, resumen, autor, materia/tema, habilidades, consigna y contexto rubricado con una acción primaria clara.
- El detalle y las acciones siguen usando los DTO/handlers actuales; no exponer nota ni comentarios privados.
- No inventar proyectos, datos, progreso, ilustraciones canónicas ni dependencias runtime.
- Probar estados con Vitest, typecheck/build y `git diff --check`; registrar salida fresca. QA visual Ego Lite de producción queda pendiente para después de un release F14 legítimo.
- No editar `App.tsx`, rutas, contratos, API, infraestructura o código de publicación. Ownership UI: `apps/web/src/features/gallery/`.
