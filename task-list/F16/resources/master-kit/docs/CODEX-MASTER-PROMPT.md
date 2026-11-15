# PROMPT MAESTRO — F16 REDISEÑO DE TODAS LAS PANTALLAS

Actúa como Lead Frontend Architect, Product Designer, Accessibility Engineer y Technical Artist de Fragments.

## Encargo
Rediseñar **todas las pantallas existentes**, no solo landing, conforme al kit F16. Los flujos, rutas, permisos, APIs y datos deben permanecer equivalentes. No inventar nuevas pantallas funcionales por la presencia de ilustraciones.

## Insumos obligatorios
1. Este ZIP y README.md.
2. `F16-SCREEN-AND-ASSET-MATRIX.xlsx` como contrato inicial.
3. `design/screens.json`, `design/components.json`, `design/tokens.json`, `design/layouts.json`, `assets/asset-audit.json`.
4. `docs/DESIGN-SYSTEM.md`, `docs/ASTRYX-ADOPTION.md`, `docs/QUALITY-GATES.md`.
5. `assets/references` (referencias inmutables), `assets/approved` (WebP inmutables), `assets/icons/png` (candidatos).

## Paso 0 — no omitir
Revisa `AGENTS.md`, `git status`, `origin/main`, HEAD y ramas en curso. No borres cambios. Verifica la matriz contra el App.tsx y rutas declaradas en la rama realmente elegida, identifica diferencias. Documenta SCREEN_DELTA.md. Crea una rama F16 segura desde la base adecuada después de proteger trabajo local. No tocar servidor ni producción.

## Instalación Astryx
React 19.3.1 verificado en el package.json consultado. Antes de instalar, valida versión de trabajo. Investiga CLI oficial, tema, component docs y props. `Button`, `Card`, `Stack` están demostrados en documentación; **no inventes APIs de los demás**. Evalúa la integración CSS sin romper reset global ni rutas. Instala en la rama de trabajo, no en main.

## Layout y UX
Implementa un `F16ThemeProvider` (o estructura más idiomática), shells diferenciados público/estudiante/docente y un sistema de componentes base. Adopta `#030407`, `#1558C9`, `#D4FF24` y valida otros tokens. En móvil usa una sola columna, navegación accesible, tablas legibles y formas sin desbordamientos. Revisa contenido real y microcopy existente. No añadir módulos inexistentes.

## Assets
No regenerar ni limpiar automáticamente los 5 PNG originales y 2 WebP. Verifica SHA del manifest. No afirmar que `Typing_Girl_and_Sleeping_Cat.webp` es animado: el archivo recibido aquí tiene **1 frame**; la hoja PNG de la chica contiene poses, no timing. `Goggle_Kid_Walk.webp` sí contiene 8 frames. Mantener fallbacks reduced-motion. Los 16 iconos nuevos son CANDIDATE, requieren revisión; usar iconos Lucide/SVG para acciones pequeñas si mejoran legibilidad y aria. La separación de iconos se reproduce con `tools/split_icon_sheet.py`.

## Implementación por fases
1) Revisión de inventario y arquitectura, documentar diferencias.
2) Tokens, Astryx, patrones reutilizables, Shell, AppHeader y navegación.
3) Portada/landing + snapshots mobile/tablet/desktop.
4) Estudiante: login, OAuth, gallery, mentor, review, trainer y subestados.
5) Docente: inspector, control mentor, reset-password, students, y estados.
6) Tests, QA visual y ajuste fino.

## Verificación obligatoria
Ejecuta scripts existentes de tests, typecheck y build con el package manager fijado; verifica navegación y auth en entorno fake/local, nunca producción; screenshots 1440x900, 768x1024 y 390x844; interacciones teclado; motion reduced; overlays; layout sin scroll horizontal; accesibilidad.

## Entrega
Rama local F16; archivos modificados; `SCREEN_DELTA.md`; evidencia visual; resultado técnico por viewport/estado; hashes de assets; `REPORT-F16-REDESIGN.md`; pendientes reales. **No hacer push, merge, PR o despliegue sin consentimiento explícito**. Si necesitas autorización o se presentan blockers, registra el bloqueo y continúa tareas independientes seguras.

## Éxito
Todas las 11 rutas y 6 subestados dentro de un mismo sistema de diseño, funcionalidad preservada, sin regresiones de permisos y recursos aprobados inalterados. Si no alcanza para cubrir todo, entrega fases con cobertura verificada sin declarar completion global.
