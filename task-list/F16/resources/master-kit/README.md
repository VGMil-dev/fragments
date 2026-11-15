# F16 — Fragments · Kit maestro de planificación e implementación

**Fecha de preparación:** 2026-11-14. **Naturaleza:** artefactos de diseño y planificación; NO cambia el repositorio.

## Contenido
- `F16-SCREEN-AND-ASSET-MATRIX.xlsx`: libro maestro con rutas, estados, layout, componentes, tokens, iconos y QA.
- `assets/approved`: WebP originales aprobados, sin modificar.
- `assets/references`: cinco ilustraciones originales sin modificar.
- `assets/sheets`: hojas SpriteCook originales.
- `assets/icons/source`: una lámina original con 16 iconos pixel-art creados para el kit.
- `assets/icons/png`: recortes transparentes de 16 iconos, generados mediante `tools/split_icon_sheet.py`. Iconos **candidatos** sujetos a revisión visual, no aprobados.
- `assets/stills`: alternativas estáticas para reduced-motion, sin alterar los originales.
- `design`: matrices JSON legibles por agentes, espejo del Excel.
- `docs`: sistema visual, arquitectura, Astryx, QA y prompt maestro.
- `code`: tokens CSS para prototipo.
- `asset-manifest.json`: hashes SHA256 finales.

## Observación crítica de animación
`Goggle_Kid_Walk.webp` tiene 8 frames; `Typing_Girl_and_Sleeping_Cat.webp` contiene 1 frame en el archivo compartido. La hoja `Typing_Girl_and_Sleeping_Cat_sheet.png` muestra 10 poses pero **no debe asumirse** una animación validada sin comprobar fotogramas/velocidades/celdas. El agente debe recibir el WebP animado correcto desde SpriteCook, o reconstruirlo desde la hoja solo previa aprobación. No fingir que está animado.

## Estado de pantallas
Las 11 rutas están documentadas a partir de `apps/web/src/App.tsx` del repositorio principal de GitHub en la fecha indicada. Hay además 6 estados internos y 3 conceptos ilustrativos sin ruta confirmada. Revalidar contra la rama objetivo antes de implementar. *Todos los diseños y layouts son propuestas, no código ya implementado.*

## Orden sugerido
1. Auditar HEAD local, estado Git y todas las rutas.
2. Confirmar instalación Astryx React 19 y leer APIs vía CLI.
3. Hacer shell, tokens, biblioteca de componentes y estados.
4. Rediseñar landing + navegación.
5. Estudiante + autenticación y sus estados.
6. Docente y flujos sensibles.
7. QA E2E y visual, sin despliegue hasta aprobación.

## Fuentes
https://github.com/VGMil-dev/fragments
https://github.com/meta/astryx
https://github.com/meta/astryx/blob/main/packages/core/README.md
