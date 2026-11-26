# CU-28 — Registrar valoración docente formativa

## Problema

Inspector conserva si se observó la mutación y si se confirmó la restauración, pero no permite al docente registrar una valoración cualitativa de la competencia ni consultar sus notas. CU-28 pide cierre docente con evidencia y prohíbe convertir la ayuda IA en nota oficial.

## Objetivo

Permitir al docente registrar `demostrado`, `no demostrado` o `no evaluado` junto a las observaciones existentes, persistirlo con la defensa y volver a consultarlo. Presentar el resultado como formativo, sin puntaje ni suma con Review.

## Límites

- No implementar fórmula Review `/6` + Inspector `/4`, retos graduados, nota oficial ni exportación de constancias de F26.
- Mantener compatibilidad con defensas previamente guardadas sin valoración.
- Solo QA/fixtures; no escribir producción ni invocar IA real.
- No se requiere migración: la defensa ya se persiste como JSON.
