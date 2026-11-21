# UX-09 — Evaluación de Mentor

## Problema
La etapa Evaluación de Mentor necesita una vista que presente información verdadera del borrador, preparación derivada de validaciones reales y la evaluación persistida, con la jerarquía visual aprobada para Pixel Night.

## Objetivo
Implementar la etapa 5 de 6 en un worktree aislado desde `origin/main`, conservar el comportamiento existente de Mentor y hacer responsive la navegación de etapas. Comparar únicamente con la referencia canónica cuyo SHA-256 es `76a1b15c63ba87ce655f2e63f193beb1dd7d8242e62adb7599e73c0c3c11330c`.

## No objetivos
- Rediseñar otras etapas de Mentor, cambiar contratos/API, lógica de evaluación, reglas de Galería, F21 o infraestructura.
- Quitar servicios DOCX usados en otras vistas.
- Evaluar una propuesta incompleta, no guardada o con versión obsoleta.

## Responsables
- Coordinación/planificación: raíz de esta tarea, documentación y task list.
- Agente A: UI e interacciones dentro de `apps/web/src/features/mentor/` y pruebas de su feature.
- Agente B: revisión visual independiente con Ego Lite; sin cambios de código.

## Criterio de calidad
Aplicar Ego Lite y Vercel React Best Practices; accesibilidad de teclado/foco, estados derivados de datos, componentes simples, sin dependencias nuevas innecesarias. No usar Playwright ni proveedores IA pagados.
