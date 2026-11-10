# F12 — Integración candidata v0.3.0

## Problema
F10.1 y F11 divergen en la migración SQLite v7; integrar sin ordenar ese historial haría omitir cambios o repetir alteraciones.

## Objetivo
Integrar ambas ramas en una rama local separada, preservar migraciones y datos, y verificar los recorridos afectados con pruebas automatizadas y Ego Lite.

## No objetivos
No publicar, desplegar, etiquetar, cambiar la fórmula académica, usar producción ni ejecutar repositorios estudiantiles.

## Owner y criterio
PLANNER. Aplicar `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, `task-list/TASKS.md` y `AGENTS.md`. La integración requiere historial no destructivo, migraciones ordenadas, suite completa y evidencia local privada ≤20 archivos.
