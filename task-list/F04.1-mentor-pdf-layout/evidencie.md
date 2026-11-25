# F04.1 — Evidencia

Estado: en desarrollo.

## Observación productiva previa

- 2026-11-25, `v0.5.78`, SHA `4e61e03868984546f8ab572a61d8ef93b838dd66`, Ego Lite Space 80/Profile 5. Se descargó una entrega Mentor propia desde Mis entregas, sin generar evaluación.
- El visor PDF de Ego Lite mostró duplicados los prefijos de los campos largos y omitió el texto restante. Una lectura autenticada de propuestas confirmó que los campos fuente eran de una sola línea y no repetían el texto.
- Causa localizada en `apps/api/src/features/mentor/local-fakes.ts`: tras dividir el texto, `wrapPdfLine` añadía `normalized.slice(0, 88)` en vez del fragmento restante.
- Evidencia de navegador, recortada para excluir el código de verificación: `FRAGMENTS_EVIDENCIAS_FINAL/CU29-pdf-layout-defect-crop.png`; SHA-256 `6353CC7E6C0E5621B4C1E257000802521737E6122CA374C485B1B990282BBC6B`.
- Se excluyó el PDF original del paquete porque contiene un código de verificación. No se modificó la entrega ni se hizo una llamada IA.

## Skills

- `ego-browser` v2.2.1: aplicada para descarga auténtica y observación de la entrega propia.
- Skill `pdf`: aplicada para inspección visual independiente con visor PDF Ego Lite y render Poppler. Poppler carece de algunas fuentes; la repetición también apareció en el visor PDF de Ego Lite, por lo que no se atribuye a Poppler.
- `test-driven-development`: aplicar ciclo rojo-verde al añadir regresión local. No se encontró SKILL.md local en el catálogo disponible; no se instaló.
- `verification-before-completion`: registrar comandos frescos, CI y limitaciones antes de completar. No se encontró SKILL.md local; no se instaló.

## Código y verificación

Pendiente.

## Integración

Pendiente PR, revisión/CI y decisión F14. No se publicará tag sin los controles aprobados.

## Código y verificación local

- Regresión añadida en `apps/api/src/features/mentor/service.test.ts`: una propuesta con campo de 113 caracteres debe contener una sola vez el bloque inicial de 88 y el sufijo de 25.
- Ciclo rojo: `pnpm --filter @fragments/contracts build`; `pnpm exec vitest run apps/api/src/features/mentor/service.test.ts` produjo 1 fallo / 8 pass: bloque inicial repetido (observación que reproduce el bug).
- Corrección: `wrapPdfLine` ahora recorre el texto en offsets de 88 y conserva el sufijo, incluyendo valores vacíos.
- Verde focal: `pnpm exec vitest run apps/api/src/features/mentor/service.test.ts` — 1 archivo, 12/12 pass (casos 113, 89, 176 y 177 caracteres).
- Preparación local: `pnpm --filter @fragments/contracts build` — PASS; `pnpm --filter @fragments/api prisma:generate` — PASS (solo genera el cliente desde el esquema del repo).
- Tipos: `pnpm --filter @fragments/api typecheck` — PASS.
- Suite API: primer intento en checkout limpio falló al cargar 46 suites por artefactos Contracts/Prisma aún no generados; después de generar Contracts y Prisma, `pnpm --filter @fragments/api test` — 52 archivos PASS, 20 omitidos; 202 tests PASS, 75 omitidos, 277 total.
- No se conectó a PostgreSQL, IA, GitHub externo del producto ni producción durante estas pruebas; el test usa el `fakeEvaluator` y renderer local.

## Estado de aceptación

- Reproducción productiva: FAIL confirmado en `v0.5.78`, evidencia descrita arriba.
- Código + regresión local: PASS.
- CI/PR, release F14, versión productiva y descarga/render del PDF corregido con Ego Lite: NO COMPROBADOS; no marcar CU-29 como resuelto hasta completar esas verificaciones.

## Integración

Commit de regresiones/documentación: `8ee42c67804fd48d447c16fd703f92d0645c2493`. El cambio funcional de wrapping está en el commit base de este checkout `4c4013b289a2994c1375441c8fc67ca9b2cf8403` (snapshot del worktree). PR pendiente; no crear tag hasta merge y controles CI requeridos; desplegar únicamente por el flujo F14 normal.
