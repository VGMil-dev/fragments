# Evidencia F17.15

Estado: integrado por PR #270; CI #45482864543 y F14 v0.5.72 PASS. La recuperación autenticada de la propuesta tras recarga quedó verificada en producción.

- Hallazgo de producción: v0.5.71/SHA `a0e75e33ca5a3115392fef093b9ba40230953416`, Ego Lite Space 80/Profile 5. Abrir una propuesta guardada mostró el proyecto FRAG-QA persistido; recargar `/student/mentor` volvió a Idea vacía (0 %), aunque la propuesta seguía listada. Reabrirla desde “Mis propuestas guardadas” recuperó el resumen, contexto y habilidad fijados. Solo lectura; sin guardado ni evaluación.
- Rutas de navegador y evidencias: `C:\Users\vgmil\ego\fragments-academic-cus-20261124\`; no se capturó imagen en esta observación.
- Skills: `ego-browser` v2.2.1 aplicado para observación; `vercel-react-best-practices` aplicado a selección derivada y no persistencia redundante.
- TDD: las tres pruebas nuevas fallaron antes de la implementación para la restauración por URL, la seguridad del ID no propio y la actualización del query al continuar; tras implementar pasaron.
- Verificación fresca tras conservar el ID al volver de Review: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — 16/16 PASS; `pnpm --filter @fragments/web test` — 54 archivos, 308/308 PASS; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS; `git diff --check` PASS.
- El build mantiene advertencias preexistentes: chunk JavaScript de 665 kB, y directivas `use client` de Lucide. No se modificó bundle splitting.
- Alcance validado: selección persistente en query y recuperada desde `GET /api/me/proposals`; ID ajeno/inexistente no abre editor; error de consulta conserva estado recuperable. No hay escritura de propuestas ni llamada IA.
- Commits de implementación: `844bdf7f8bcd41a52f5f7e4f12fbcf7b745f5c68` (`feat(F17.15): recuperar propuesta Mentor tras recarga`) y `c49b96c` (`fix(F17.15): conservar propuesta al volver de Review`).
- PR #270: merge normal en `7fb029958cf0921840e3ea260e6fe89e99f9b2dc`; CI #45482864543 SUCCESS sobre `268ae0b53cc0916bd19e6a84cf6f906b62fc5d2f`.
- La observación previa en `v0.5.71` documentó la limitación antes de la integración. El resultado post-release se registra abajo.

## Verificación post-release en producción — 2026-11-24 20:53 UTC

- F14 run `45483763133` para `v0.5.72` terminó SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`; tag/SHA exactos `v0.5.72` / `7fb029958cf0921840e3ea260e6fe89e99f9b2dc`.
- El poller y aplicador normales dejaron `release_deployed`; `fragments-release-apply.service` finalizó `Result=success`, `ExecMainStatus=0`. No hubo deploy manual ni reinicio.
- SSH read-only confirmó web y API `healthy` sobre `sha-7fb029958cf0921840e3ea260e6fe89e99f9b2dc`; PostgreSQL `healthy`. El disco raíz conserva 136 GB libres (30 %) y 7 % de inodos usados. GET `/health` devolvió `ok`, `database=ready`; el bundle público `/assets/index-B8mFYIw9.js` contiene v0.5.72 y el SHA esperado.
- Ego Lite, Profile 5 (Estudiante), TaskSpace 80 preservado: desde Mis proyectos se abrió la propuesta propia FRAG-QA; la ruta Mentor retuvo el identificador de propuesta. Una recarga en `/student/mentor` restauró el resumen del mismo proyecto, contexto `Desarrollo móvil`, habilidad requerida y etapa `Evaluación`; versión/SHA visibles. Sin guardar, crear propuesta ni solicitar evaluación IA.
- La ruta funcional de F17.15 está comprobada en QA de código y en producción. Para CU-16 global continúan NO COMPROBADOS la continuidad al abrir una misión desde Dashboard/Mis aulas y la conservación de CTA independientes para dos misiones.
- Evidencia Ego Lite de esta comprobación: observación textual/snapshot auténtica en la sesión de la tarea, sin PNG exportado; no se fabrica captura.
