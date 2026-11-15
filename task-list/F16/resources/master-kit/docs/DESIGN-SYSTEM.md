# F16 Visual System v0.1 — Fragments Pixel Night

## Principio visual
**Un producto educativo serio que tiene alma de videojuego indie.** Elementos pixel-art como arte de identidad; UI de datos y formularios con legibilidad moderna. Evitar aplicar fuentes bitmap a párrafos largos, pixelizar texto, o sacrificar accesibilidad.

## Paleta
**Aprobados:** Night `#030407`; Cobalt `#1558C9`; Lime `#D4FF24`. El resto de colores de `design/tokens.json` son **propuestas** que necesitan validación WCAG.

## Estructura
- Landing: hero 44/56 (texto / arte), cabecera visible, secciones narrativas y CTA principal.
- Estudiantes: shell con sidebar desktop, navegación responsiva, header de página, contenido en max-width y slots para estados.
- Docentes: shell administrativo diferenciado; tablas densas, formularios y evidencias sin sacrificar claridad.
- Autenticación: layout centrado de alto contraste, feedback claro sin animaciones molestas.
- No inventar nuevas features a partir de ilustraciones: Bitácora/EcoCampus/Análisis no son rutas del App actual.

## Tipografía
System sans como base. Usa pixel font **solo** para microetiquetas o detalles decorativos si hay licencia redistribuible; no distribuir fuentes no autorizadas. Títulos con jerarquía H1 48–72 desktop / 36–44 móvil, cuerpos 16 px, line-height ≥1.5.

## Interacciones
Focus-visible, targets ≥44x44 px cuando sea viable, estados hover/focus/disabled/invalid/success. Mismo significado cromático en todos los módulos. Estados loading, empty, error, success y permisos son obligatorios.

## Iconografía
16 iconos PNG de 256x256 con alpha, en `assets/icons/png`. Se creó una lámina 4x4 y se separó por Python. No son una fuente de verdad funcional: para acciones estándar puede ser preferible un SVG accesible de Astryx/Lucide, mientras que los PNG son acentos visuales / navegación de categoría. La transparencia y la ubicación se deben revisar al tamaño final 20–32 px. Evitar poner iconos raster gigantes en botones pequeños.

## Movimiento
Conservar irregularidades aprobadas en sprites. Nada de smoothing temporal ni reescalado no entero. Imágenes con width/height y fallback. Para WebP animado no suponer pausa CSS: usar `<picture>` con una fuente estática renderizada condicionalmente si `prefers-reduced-motion`.

## Criterios
1) Mobile-first, 2) accesibilidad, 3) continuidad de workflows, 4) fidelidad a los sprites aprobados, 5) rendimiento, 6) distinción clara público/estudiante/docente.
