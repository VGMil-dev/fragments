# F17.1 — Especificación

## Entradas y límites
- Propuesta y evaluación actuales del estudiante y capacidades existentes de F17.
- Isotipo A-003 en `apps/web/public/brand/fragments-isotipo-recto.svg`.
- La vista mantiene Idea, Contexto, Habilidades, Objetivos y alcance, Evaluación y Portada; los contextos y habilidades docentes siguen siendo de solo lectura y dependen de datos autorizados.

## UI esperada
- Navegación global estudiantil coherente con Pixel Night.
- Navegación compacta «Tu propuesta» en escritorio; selector accesible en móvil.
- Cabecera «Tu idea toma forma» y progreso único derivado de campos reales requeridos.
- Campos y acciones de Idea con jerarquía y reflow similares a la referencia; importar DOCX/descargar Word y guardar/continuar respetan contratos existentes.
- Las otras cinco etapas conservan su contenido, mensajes, permisos y validaciones, bajo la misma composición.
- Identidad oficial lima en cabecera y favicon/pestaña; `icon.svg` contiene el SVG A-003 exacto.

## Aceptación GIVEN / WHEN / THEN
- GIVEN cada etapa, WHEN se selecciona desde escritorio o móvil, THEN se muestra su contenido existente y no se altera su flujo.
- GIVEN un borrador real, WHEN se calcula progreso, THEN el porcentaje deriva de campos requeridos válidos, sin fijarlo al 40 % ilustrativo.
- GIVEN estudiante a 320, 390, 768, 1024 y 1440 CSS px, WHEN usa Mentor, THEN el contenido se refluye sin pérdida de controles ni overflow horizontal.
- GIVEN `icon.svg`, WHEN se solicita directamente y cuando el navegador resuelve favicon/cabecera, THEN se ve el isotipo canónico A-003 en lima.
- GIVEN interacción de teclado o `prefers-reduced-motion`, WHEN se usa Mentor, THEN foco y operación siguen accesibles y movimiento se reduce.

## Verificación
- Pruebas y checks de web existentes, lint/typecheck/build pertinentes y `git diff --check`.
- Revisión independiente en Ego Lite, capturas reales y reporte CONFORME/AJUSTES NECESARIOS.
- PR focalizado. F14 y producción solo si el estado real de F21 permite integrarlo de forma segura.
