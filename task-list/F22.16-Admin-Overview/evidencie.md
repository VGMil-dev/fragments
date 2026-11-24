# Evidencia F22.16

Estado: PR #248 integrada y release `v0.5.62` aplicada. La vista `/admin` consume únicamente los endpoints admin existentes de diagnósticos y resumen de cola. Contratos, endpoints y persistencia quedan fuera de alcance.

- Contexto Notion F22 consultado el 2026-11-24: consola privada, primera lectura/observabilidad, RBAC separado, redacción de campos sensibles y prohibición de exponer shell/SQL/secretos; F22.15 ya publicó eventos Trainer persistidos.
- Brechas observadas: herramientas administrativas existen como rutas separadas; no hay una entrada/resumen que reúna los diagnósticos allowlisted recientes y el resumen agregado de cola.
- Los eventos/productividad con sesión admin real siguen NO COMPROBADOS. No se usarán filas fake en runtime ni se ejecutarán escrituras productivas.
- Commits implementados: `c63cada` (componente resumen y pruebas) y `5ffb06f` (ruta `/admin`, navegación compartida y prueba SSR).
- Verificación fresca en `codex/f22-16-admin-overview`: prueba focal `pnpm --filter @fragments/web exec vitest run src/features/admin-console/AdminOverviewScreen.test.tsx src/App.admin-overview.test.tsx` PASS, 2 archivos/5 pruebas; suite `pnpm --filter @fragments/web test` PASS, 54 archivos/282 pruebas; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS; `git diff --check` PASS. Build conserva advertencias del bundle >500 kB y directivas `use client` de Lucide.
- La vista presenta agregados de la muestra recibida, errores HTTP 5xx y conteos/timestamp de cola; estados de carga, vacío, 401/403, error recuperable y reintento. No presenta payloads ni filas individuales de diagnósticos.
- Integración/release: PR #248 merge normal en `main` como `2467bd5a39173f0b1ccd6a120940a67d5e3e41b3`; CI #45345250401 SUCCESS; revisión reflexiva CLEAN. Tag anotada `v0.5.62`; F14 run #45345672429 SUCCESS (verify-build, attest-package, publish-approved-release).
- Verificación productiva read-only: `fragments-release-apply.service` terminó `Result=success`, `ExecMainStatus=0`, `ActiveState=inactive`; API/web healthy en imagen SHA `2467bd5a39173f0b1ccd6a120940a67d5e3e41b3`; `/health` responde `ok`, `database=ready`; bundle `/assets/index-c9eVHk86.js` contiene tag `v0.5.62` y SHA exacto. No se reinició producción ni se accedió a DB.
- La ruta no se validó con sesión admin autorizada. Los diagnósticos productivos visibles, conteos reales de cola desde UI autenticada, autorización RBAC en navegador y utilidad operacional siguen NO COMPROBADOS. No se usaron datos fake en runtime ni se ejecutaron escrituras productivas.
- Pendiente: validar la vista con una sesión admin legítima cuando esté disponible; no elevar roles ni inventar actividad.
