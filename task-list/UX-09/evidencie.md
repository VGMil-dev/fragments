# UX-09 — Evidencia

## Estado
Implementación local lista para revisión de integración. Rama `codex/f17-ux09-evaluation`, worktree aislado desde `origin/main` en `1cdeae04b0e0930663c79cde7ef72efe6f8c6054` (2026-11-21). No integrada, no desplegada. PR #77 de UX-08 sigue abierto y solapa los archivos compartidos de Mentor; las instrucciones de repositorio prohíben push.

## Referencia aprobada
SHA requerido: `76a1b15c63ba87ce655f2e63f193beb1dd7d8242e62adb7599e73c0c3c11330c`.
La primera copia `image-1.png` no coincidió (`C2C58453DC33CF82D85036DA2F4A3E8EEC661019B79CA824C4E8BCC2DE3B984E`) y fue descartada. La imagen `Evaluación de propuesta en modo nocturno.png` coincide exactamente. La copia de evidencia es `F17_UX09_EVIDENCIAS/referencia-aprobada.png`.

## Implementado
- Etapa Evaluación con stepper horizontal para escritorio y selector compacto accesible en anchos pequeños.
- Resumen del borrador, navegación a etapas de edición y contexto de solo lectura; rueda calculada desde validaciones, estados de guardado y evaluación existentes.
- Conserva carga, error/recuperación, persistencia, guardado, control de versión y prevención de doble envío existentes. Retira solo elementos visuales prohibidos en UX-09; no elimina servicios DOCX compartidos.

## Verificación local
- `pnpm --filter @fragments/web test`: 26 archivos, 128 pruebas pasaron.
- `pnpm --filter @fragments/web typecheck`: pasó.
- `pnpm lint`: pasó (el workspace solo configuró la tarea contracts).
- `pnpm --filter @fragments/web build`: pasó; permanece el aviso conocido de chunk principal mayor a 500 kB y directivas `use client` en el bundle de lucide.
- `git diff --check`: pasó.
- Salida completa: `F17_UX09_EVIDENCIAS/VERIFICACION_LOCAL.txt`.

## Revisión independiente Ego Lite
`REVISION_AGENT_B_FINAL.md`: **PASS visual e interacción local; REVISAR global** hasta QA de persistencia/permisos en `fragments_test`. Capturas finales para 320, 390, 768, 1024, 1440 y 1672 px. Sin overflow horizontal, errores de consola ni proveedor IA. Interacciones verificadas con fixtures sintéticas; todos los writes fueron bloqueados. El POST de evaluación intencionalmente bloqueado mostró el error recuperable.

## Pendiente
No se pudo localizar una configuración segura `fragments_test`/túnel DB en este worktree; la configuración disponible no nombraba esa base y se rechazó antes de conectar o ejecutar consultas/escrituras. No se probaron guardado/resultados persistidos ni aislamiento/versionado contra PostgreSQL. No se ejecutó suite API ni se hizo escritura en ninguna base.

PR, CI de integración, merge, F14, versión desplegada y comprobación en producción: pendientes. UX-08 PR #77 comparte archivos de Mentor y sigue abierto; integrar antes de reconciliarlo expondría conflictos. No se declara la meta completa.

## Registro de commits
Commit local de implementación/evidencia: `8f88ab8fc654275f00cf0dc478b321703c64b5bc`. Commit posterior registra este SHA en la evidencia y task list.
