# F17.17 — Evidencia

## Línea base observada

- Producción `v0.5.73`, SHA `a250c260d3623050992ee33bb3ca6ab219dd4cb7`.
- Ego Lite, Perfil 5, Space 80, sesión E1; propuesta QA propia vinculada a «QA CU15 — Navegación Expo».
- En «Objetivos y alcance», la selección de habilidad requerida era de solo lectura. Sin guardado ni llamada IA, al añadir un objetivo vacío y quitarlo, el estado Habilidades pasó de Completada a Pendiente aunque no se editó esa selección. Se recargó la página para descartar el estado local; el borrador persistido quedó intacto.
- Código inspeccionado: `completedStage(2)` exige `!isDirty` además de que exista una propuesta y que no haya cambios de habilidades. Esto invalida Habilidades por cambios ajenos a esa etapa.

## Implementación y verificación

- Commit de implementación: `af13e58239ce1ac0206789e2a4f390ee43589eb4` (`fix(mentor): conserva estado de habilidades`).
- Se quitó `isDirty` global del cálculo de completitud de Habilidades. `skillsChanged` continúa invalidando el estado mientras haya cambios de habilidades sin guardar.
- Prueba TDD: el caso nuevo falló antes del cambio con `Expected: Habilidades: Completada; Received: Habilidades: Pendiente`.
- Prueba focal Mentor: 47/47 PASS.
- Suite web completa: 54 archivos, 310 tests PASS.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS. Vite mostró advertencias ya existentes de chunks grandes y directiva `use client` de lucide-react; el build terminó correctamente.
- PR #274 integrado; CI #45499970862 SUCCESS. Merge SHA `0e3128e8e198036d90559f105d6c5ca814432119`.
- Release F14 `v0.5.74`, workflow #45500649834 y GitHub Release 457411064 completados por el flujo legítimo. `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; no hubo aprobación manual ni despliegue forzado.
- VPS verificada en lectura: API y web healthy con imagen `sha-0e3128e8e198036d90559f105d6c5ca814432119`; `/health` 200, `database=ready`; bundle público contiene `v0.5.74` y el SHA completo. Poller, apply.path y cloudflared activos. Raíz `/dev/sda1`: 132 GB libres de 193 GB (32 % usado), inodos 8 % usados.
- Ego Lite, Space 80/Profile 5 preservado, recarga de la propuesta QA propia en `v0.5.74` confirmó 71 % y reanudación en Objetivos y alcance, con Habilidades: Completada. Una edición local no guardada de Alcance del MVP mantuvo Habilidades: Completada; el campo se restauró vacío y no se guardó ni evaluó. Captura auténtica: `CU_QA_EVIDENCIAS/CU17-F17-17-mentor-stage-prod.png` (SHA-256 `CDE5A0963DD40FA47A3FF5B12B60E7ABB9B626C255C998542C93BBB2DB33F7CA`).
- F17.17 queda completada: el estado de Habilidades no se invalida al editar otros campos; cambios reales de habilidades todavía requieren guardado. No se ejecutó Mentor/Review IA ni se modificó información persistida en producción.
