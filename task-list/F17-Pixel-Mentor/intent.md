# F17 Pixel Night Mentor — Intención

## Problema
Mentor solo mostraba navegación horizontal en Evaluación; las otras etapas usaban un submenú lateral y el botón Continuar cambiaba de etapa sin guardar.

## Objetivo
Aplicar la decisión F17 vigente: stepper compacto superior para las seis etapas, una etapa visible, estados reales y navegación principal que guarda antes de avanzar.

## No objetivos
No cambiar rutas, contratos, API, persistencia, permisos, rúbricas, evaluaciones ni política de publicación. No reemplazar marca ni assets.

## Owner
Planner / integración; implementación de pantalla en rama `codex/pixel-night-mentor`.

## Criterio/skills
Sistema visual Pixel Night F16 y decisión F17 del 2026-11-23. Se aplicó selectivamente `vercel-react-best-practices` para mantener el componente controlado y evitar nuevos efectos/datos duplicados. La guía no exigía optimización adicional.
