# F16 — Rediseño visual frontend

## Problema

Fragments ha crecido hasta incluir once rutas públicas, estudiantiles y docentes. La interfaz actual conserva patrones y estilos de distintas entregas, lo que hace que navegación, formularios, estados y herramientas no se sientan como un solo producto.

## Objetivo

Crear un sistema Pixel Night compartido y aplicarlo a todas las rutas y estados existentes, manteniendo la conducta funcional. Entregar una rama F16 que se pueda revisar con especificación, evidencia y trazabilidad.

## No objetivos

No modificar backend, contratos API salvo necesidad aprobada, autenticación, roles, persistencia, infraestructura, CI/CD, workflows, producción ni despliegue. No crear rutas de EcoCampus, Bitácora o Análisis. No regenerar ni modificar los assets del kit.

## Owner y criterio

Owner: PLANNER / Elephant. Seguir `AGENTS.md`, `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, `task-list/TASKS.md` y el GOAL F16 solicitado por el usuario. Aplicar EGM con revisores de contexto nuevo y `ego(lite)` para inspección visual; documentar claramente cualquier capacidad pendiente.

## Preparación de aprobación visual

Presentar la implementación F16 existente en una galería HTML local navegable (`task-list/F16/screenshots/qa-final/review-gallery.html`), sin reiniciar ni alterar el rediseño. La galería agrupa las once rutas por área, enlaza capturas escritorio/móvil, distingue estados con fixtures sintéticos, muestra controles para comparar tipografía, escala, espaciado, iconografía y movimiento, y ofrece antes/después únicamente para los pares de snapshots baseline/current con ruta y viewport común. Preservar capturas y pixel-art. Actualizar inventario y evidencia y revalidar en Ego Lite los controles de galería y referencias a archivos.
