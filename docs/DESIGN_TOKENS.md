# Fragments F16 — Sistema visual Pixel Night

**Autoridad:** decisión explícita del propietario del 2026-11-14. Este documento sustituye para F16 las directrices cromáticas y de composición anteriores. No hay una paleta crema paralela para las vistas migradas. Se preservan todas las reglas funcionales, de privacidad, autenticación, contratos y accesibilidad.

## Marca

- Display: `FRAGMENTS` / línea de apoyo `Imagina. Construye. Demuestra.`
- Night `#030407`: canvas principal y fondos de aplicación.
- Cobalt `#1558C9`: identidad de marca, navegación y controles seleccionados.
- Lime `#D4FF24`: acento, indicadores activos y acciones destacadas.
- Tokens auxiliares aprobables por esta tarea: superficies azul-negras, texto claro legible, borde con contraste suficiente y estados semánticos. Se especifican y miden en `task-list/F16/DESIGN_SYSTEM_CONTRACT.md`; no desplazan los tres colores de marca.
- Tipografía de sistema para lectura y controles; tipografía pixel solo en rótulos decorativos breves, con fallback y sin incrustar fuentes desconocidas.
- UI en español claro. Conservar etiquetas funcionales establecidas: `Evaluar propuesta`, `Reevaluar`, `Generar entrega`, `Ver informe`, `Iniciar reto`.
- Pixel art aprobado como identidad/acento; nunca como portador único de información. Preservar bytes y hashes del kit.

## Composición

- Landing editorial nocturna y layouts estudiante/docente coherentes; encabezado compartido con etiquetas visibles y sin sidebar, drawer ni menú oculto.
- Evitar rejillas repetitivas sin semántica; usar grupos, cronologías y superficies según la tarea.
- Estados vacíos explican el siguiente paso sin inventar datos; errores conservan recuperación; carga no se representa como vacío.
- Microtransiciones breves para estado/feedback; no añadir reproducción decorativa continua. Respetar `prefers-reduced-motion` y sustituir sprites animados por frame estático.
- Mantener reflow a 320 CSS px, foco visible, navegación por teclado y WCAG 2.2 AA.

## Migración

La paleta crema `#FCF9F1` y los azules históricos quedan **deprecados como directrices de diseño para las superficies migradas por F16**. No borrar archivos/estilos hasta verificar que no tienen consumidores. El avance se hace por grupos reversibles; al terminar F16 todas las rutas incluidas usan este sistema. El detalle de tokens, APIs y gates está en `task-list/F16/DESIGN_SYSTEM_CONTRACT.md` y `task-list/F16/design_draft.md`.
