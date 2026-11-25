# Evidencia F22.18

**Estado:** implementación local completa, pendiente de PR/CI, integración, release y verificación productiva.

## Implementación
- GET admin-only `/api/admin/ai-diagnostics`, `no-store`, validación Better Auth, registro `admin.ai_diagnostics.read` y acceso al actor antes de la consulta.
- Respuesta allowlisted: estado de configuración de clave (sin valor), modelo/proveedor, tarifas configuradas y agregado persistido liquidado/reservado/incierto.
- Saldo de proveedor y tope global responden `unknown`; errores y agregados inválidos del ledger producen 503, no ceros.
- Página `/admin/ai-diagnostics` en Pixel Night con navegación, estados, reintento y explicación de límites. Se agrega familia a los diagnósticos y etiqueta en el registro admin.
- Sin cambios a esquema, migraciones, contrato compartido, configuración, proveedores, prompts, rúbricas ni datos. Sin llamadas IA ni conexión a producción.

## Verificación local
- `pnpm --filter @fragments/api prisma:generate` PASS desde el esquema versionado.
- `pnpm --filter @fragments/api test` PASS: 52 archivos, 198 pruebas; 20 archivos/75 pruebas omitidas (dependencias externas/DB).
- `pnpm --filter @fragments/web test` PASS: 56 archivos, 316 pruebas.
- `pnpm --filter @fragments/api typecheck` PASS.
- `pnpm --filter @fragments/web typecheck` PASS.
- `pnpm --filter @fragments/api build` PASS.
- `pnpm --filter @fragments/web build` PASS, con advertencias existentes de chunk >500 kB y directivas `use client` de Lucide.
- `git diff --check` PASS; solo reportó aviso de conversión CRLF de `task-list/TASKS.md`.
- Nuevas pruebas API usan auth, actor, ledger y sink de auditoría fake; cubren 401, 403, 200, no-store, auditoría, secretos no expuestos y fallo de ledger 503.
- No hubo pruebas de DB PostgreSQL aislada; producción, acceso admin real, proveedor/saldo externo y validez de las tarifas respecto a la cuenta siguen NO COMPROBADOS.

## Integración
- Commit/PR/CI/release/deploy: pendientes.
- No iniciar llamadas IA pagadas: proveedor puede configurarse, pero saldo y tope global no son observables por este mecanismo.
