# Evidencia F17.15

Estado: implementación local completada; integración y producción pendientes.

- Hallazgo de producción: v0.5.71/SHA `a0e75e33ca5a3115392fef093b9ba40230953416`, Ego Lite Space 80/Profile 5. Abrir una propuesta guardada mostró el proyecto FRAG-QA persistido; recargar `/student/mentor` volvió a Idea vacía (0 %), aunque la propuesta seguía listada. Reabrirla desde “Mis propuestas guardadas” recuperó el resumen, contexto y habilidad fijados. Solo lectura; sin guardado ni evaluación.
- Rutas de navegador y evidencias: `C:\Users\vgmil\ego\fragments-academic-cus-20261124\`; no se capturó imagen en esta observación.
- Skills: `ego-browser` v2.2.1 aplicado para observación; `vercel-react-best-practices` aplicado a selección derivada y no persistencia redundante.
- TDD: las tres pruebas nuevas fallaron antes de la implementación para la restauración por URL, la seguridad del ID no propio y la actualización del query al continuar; tras implementar pasaron.
- Verificación fresca: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — 15/15 PASS; `pnpm --filter @fragments/web test` — 54 archivos, 307/307 PASS; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS; `git diff --check` PASS.
- El build mantiene advertencias preexistentes: chunk JavaScript de 665 kB, y directivas `use client` de Lucide. No se modificó bundle splitting.
- Alcance validado: selección persistente en query y recuperada desde `GET /api/me/proposals`; ID ajeno/inexistente no abre editor; error de consulta conserva estado recuperable. No hay escritura de propuestas ni llamada IA.
- Commit de implementación: `844bdf7f8bcd41a52f5f7e4f12fbcf7b745f5c68` (`feat(F17.15): recuperar propuesta Mentor tras recarga`).
- PR y CI: pendientes de publicar/registrar.
- Despliegue y comprobación Ego Lite posterior al release: pendientes; producción actual observada sigue en `v0.5.71` y conserva la limitación documentada hasta desplegar este cambio.
