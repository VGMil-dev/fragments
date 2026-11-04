# F05 — Intent

Owner: W5

## Problema y objetivo

El estudiante necesita una revisión formativa ligada a un commit de GitHub concreto. El análisis debe usar solo un snapshot validado, limitar los datos enviados, justificar cada hallazgo con evidencia real y permitir generar un PDF verificable solo cuando se solicite.

## Alcance

- Validar `ReviewRequestSchema` compartido (propietario, repositorio y SHA completo); rechazar URLs, ramas y commits distintos.
- Empaquetar en memoria con presupuesto de bytes/tokens y omitir credenciales, binarios y archivos grandes; informar rutas omitidas.
- Mantener límites inyectables para GitHub, Repomix, IA, persistencia y PDF, con drivers falsos para pruebas offline.
- Mantener `projectId`, `rubricVersion` y `evaluatorVersion` como contexto interno separado del DTO público.
- Validar el esquema de IA, huella de entrada, rutas y líneas de evidencia; rechazar hallazgos no respaldados.
- Reutilizar resultados por proyecto/commit/rúbrica/evaluador, revelar pistas por nivel y generar PDF/token de verificación bajo demanda.
- Validar las salidas mediante los DTO compartidos `ReviewResponseSchema`, `SubmissionResponseSchema` y `VerifySubmissionResponseSchema`.
- Añadir fixtures Promptfoo deterministas con proveedor local falso.

## No objetivos

No ejecutar código del repositorio. No hacer solicitudes a GitHub, Gateway, Moodle o URLs dadas por el usuario. No guardar snapshots completos ni PDFs. No modificar contratos, crear `apps/api/package.json` ni conectar rutas/SQLite del API todavía inexistente en este checkout.

## Skills consultadas

- `backend-architecture` (`we-are-singular/skills`): aplicada directamente para mantener el dominio separado de puertos/adaptadores y evitar cadenas de servicios o infraestructura de más.
- `test-driven-development` (`obra/superpowers`): aplicada directamente con prueba roja antes de implementar y ciclo verde/refactor.
- `verification-before-completion` (`obra/superpowers`): aplicada directamente; las afirmaciones se basan en comandos frescos y códigos de salida.
- `Promptfoo` documentación oficial: criterio de formato para provider ESM y asserts JavaScript; no es una skill. Fixtures ejecutados solo contra un provider local falso.

El contenido de las skills originales se consultó desde sus repositorios oficiales porque no estaban instaladas en las rutas de skills locales; no se instalaron.
