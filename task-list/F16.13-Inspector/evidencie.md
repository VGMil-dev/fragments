# Evidencia F16.13 — Inspector docente Pixel Night

## Alcance aplicado
- La sala docente organiza la revisión/commit, evidencia del reto, precondición, mutación, demostración y restauración.
- El resumen de defensa aparece solo cuando `record.defense` está presente; muestra las dos confirmaciones persistidas y su fecha. No añade notas, puntajes ni progreso derivados.
- `teacherHint` se mantiene únicamente como orientación secundaria cuando `teacherAuthorized` es verdadero. El Workspace lo pasa solo después del gate Better Auth de cuenta docente/admin; queda oculto por defecto y fuera del DOM cuando el flag no es autorizado.
- Se conserva navegación Inicio, login/logout, selección/carga de revisión, creación idempotente, asignación y registro; no se cambian handlers, autorización servidor, rutas, contratos ni APIs.
- CSS migrado a tokens semánticos F16, con controles/foco visibles y reflow en la regla de 560px. No se agregaron activos ni dependencias.

## Pruebas y compilación
- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/web exec vitest run src/features/inspector/InspectorTeacherPanel.test.tsx src/features/inspector/InspectorTeacherWorkspace.test.tsx` — PASS, 2 archivos y 7 pruebas. Los fixtures de revisión/defensa/sesión están marcados fake; verifican ayuda privada solo con autorización explícita, contexto/evidencia, resumen persistido, handlers y bloqueo del API para cuenta no docente.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Vite conserva advertencias de chunk >500 kB y `use client` desde Lucide.
- `git diff --check` — PASS.

## No comprobado / límites
- No se abrió Ego Lite, perfiles ni navegador, conforme a la instrucción de conservar las sesiones y delegar la QA visual post-release al probador independiente.
- Tamaños 320/390/768/1024/1440, contraste y teclado/foco no tuvieron validación visual interactiva; solo revisión estática de CSS y tests jsdom.
- Los estados de acceso en tests usan una respuesta fake de sesión; la sesión docente real, persistencia productiva y defensas reales no se probaron.
- Build no falla, pero las advertencias de chunks y directivas del paquete Lucide continúan.

## Skill aplicada
- Leída `vercel-react-best-practices/SKILL.md`; aplicación selectiva a derivación simple de props y evitar estado/recomputación añadidos. Se descartó optimización de bundle/caché porque este cambio visual no añade dependencias ni solicitudes.

## Commit
- Implementación: `c217026` (`feat(F16.13): reencuadra Inspector docente`).

