# F13 — Evidence / evidencie

**Estado:** IMPLEMENTADA; pendiente contrastar el objeto real de `v0.3.1` (2026-11-12). No marcar como completada todavía.

## Rutas

- `apps/web/src/build/release-metadata.ts`: valida formato, tag anotada, SHA completo igual a `HEAD`, ascendencia en `origin/main` y árbol limpio. Sin variables de release devuelve `dev` y `commit: null`.
- `apps/web/src/components/brand/BuildVersion.tsx`, `apps/web/src/App.tsx` y hojas de estilo: muestra versión en pie de landing, espacio estudiantil y rutas docentes; el SHA completo se ofrece en tooltip y nombre accesible.
- `.github/workflows/release-build-candidate.yml`: disparo manual desde `main`, permisos `contents: read`, checkout del SHA validado y artefacto web. No tiene secretos ni pasos de despliegue.
- Pruebas en `apps/web/src/build/release-metadata.test.ts` y `apps/web/src/components/brand/BuildVersion.test.tsx`.

## Verificación fresca

Se creó una copia temporal desde los archivos rastreados y los cambios F13 en `C:\Users\vgmil\AppData\Local\Temp\fragments-f13-check-c2c524caabb7444e91568913e2fdfb77` para ejecutar Node/pnpm: el volumen `D:` es exFAT y rechaza los symlinks de pnpm, incluso con `node-linker=hoisted`. No se cambió la configuración ni el lockfile del proyecto.

- `pnpm build` — salida 0; contracts, API y web (3 tareas). El bundle de build local contiene metadata `dev` sin SHA, comprobado por script local de inspección del artefacto.
- `pnpm test` — salida 0; contracts 19/19, API 95/95, web 65/65 (179 pruebas). Las advertencias Better Auth de usuario inexistente son de fixtures de reset-password y no fallan la suite.
- `pnpm typecheck` — salida 0; 4 tareas del workspace.
- `pnpm lint` — salida 0; la configuración existente solo ejecuta lint de contracts.
- `pnpm --filter @fragments/web exec vitest run src/build/release-metadata.test.ts src/components/brand/BuildVersion.test.tsx` — 10/10.
- `git diff --check` — salida 0 en el checkout de la tarea antes del commit.
- `ego-browser` skill v2.2.0 leída y ejecutada antes de QA visual. Landing a 1600px de escritorio y 390×844 móvil; muestra `dev` al pie, sin cubrir contenido. En móvil `documentWidth=390` (sin desbordamiento horizontal). Capturas temporales: `C:\Users\vgmil\AppData\Local\Temp\fragments-f13-check-c2c524caabb7444e91568913e2fdfb77\version-desktop-footer.png` y `...\version-mobile-footer.png`.

## Límites pendientes

- El checkout local solo contiene tags hasta `v0.3.0`; no contiene `v0.3.1` ni el objeto `50e2ace697afc125bb3bfdd9a705f0e383796a83`. La prueba unitaria simula esa tag/SHA para cubrir la aceptación del resolver, pero no acredita el objeto histórico real ni construye desde él.
- No se consultó GitHub ni se modificó, movió o recreó ningún tag. Hace falta ejecutar la comprobación con el objeto real en el pipeline autorizado. Como `v0.3.1` es histórica, esta mejora debe publicarse en la siguiente versión y no debe generar un despliegue adicional.
- El workflow candidato no se ejecutó en GitHub y no despliega; el control de aprobación/protección de cualquier despliegue futuro corresponde al mecanismo F14 y no está acreditado aquí.
- No hubo despliegue, cambios remotos, contacto a servicios externos ni acceso a producción.

## Commit

- Código F13: `065e3b2a7da42eded9b02d1a30a801cd93779efd` — `feat(f13): muestra version verificable en la interfaz`.
- Evidencia guardada en este commit documental posterior. La identidad del commit de código es `Codex <codex@localhost>` aplicada solo a ese commit; no se cambió configuración global.
