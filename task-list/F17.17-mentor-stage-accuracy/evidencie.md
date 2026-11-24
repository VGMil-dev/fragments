# F17.17 — Evidencia

## Línea base observada

- Producción `v0.5.73`, SHA `a250c260d3623050992ee33bb3ca6ab219dd4cb7`.
- Ego Lite, Perfil 5, Space 80, sesión E1; propuesta QA propia vinculada a «QA CU15 — Navegación Expo».
- En «Objetivos y alcance», la selección de habilidad requerida era de solo lectura. Sin guardado ni llamada IA, al añadir un objetivo vacío y quitarlo, el estado Habilidades pasó de Completada a Pendiente aunque no se editó esa selección. Se recargó la página para descartar el estado local; el borrador persistido quedó intacto.
- Código inspeccionado: `completedStage(2)` exige `!isDirty` además de que exista una propuesta y que no haya cambios de habilidades. Esto invalida Habilidades por cambios ajenos a esa etapa.

## Implementación y verificación

- Se quitó `isDirty` global del cálculo de completitud de Habilidades. `skillsChanged` continúa invalidando el estado mientras haya cambios de habilidades sin guardar.
- Prueba TDD: el caso nuevo falló antes del cambio con `Expected: Habilidades: Completada; Received: Habilidades: Pendiente`.
- Prueba focal Mentor: 47/47 PASS.
- Suite web completa: 54 archivos, 310 tests PASS.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS. Vite mostró advertencias ya existentes de chunks grandes y directiva `use client` de lucide-react; el build terminó correctamente.
- Aún pendiente: commit, PR/CI, release F14, health/bundle y verificación Ego Lite de la corrección desplegada. No se ejecutó Mentor/Review IA ni se guardó el borrador de producción.
