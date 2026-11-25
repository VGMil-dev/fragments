# Evidencia F22.18

**Estado:** implementado, integrado y desplegado en producción; preflight IA verificado sin ejecutar evaluaciones.

## Implementación
- GET admin-only `/api/admin/ai-diagnostics`, `no-store`, validación Better Auth, registro `admin.ai_diagnostics.read` y acceso al actor antes de la consulta.
- Respuesta allowlisted: estado de configuración de clave (sin valor), modelo/proveedor, tarifas configuradas y agregado persistido liquidado/reservado/incierto.
- Saldo de proveedor y tope global responden `unknown`; errores y agregados inválidos del ledger producen 503, no ceros.
- Página `/admin/ai-diagnostics` en Pixel Night con navegación, estados, reintento y explicación de límites. Se agrega familia a los diagnósticos y etiqueta en el registro admin.
- Sin cambios a esquema, migraciones, contrato compartido, configuración, proveedores, prompts, rúbricas ni datos. Sin llamadas IA ni escrituras de datos productivos.

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
- CI requerido `Fragments CI`, run `45540404028`: SUCCESS.

## Integración y producción
- PR #281: https://github.com/VGMil-dev/fragments/pull/281; merge commit `9da4bbb9b180cc79dec6cb7539389fe51c07cb62`.
- Release anotada `v0.5.77`, apuntando exactamente al merge commit.
- F14 run `45540924178`: SUCCESS en verify-build, attest-package y publish-approved-release. Ledger marcó release `deployed`; aplicación terminó `Result=success`, `ExecMainStatus=0`.
- Imágenes API/web del SHA exacto reportaron healthy; `/health` respondió `200`, `status=ok`, `database=ready`.
- Ego Lite docente Space 44/Profile 3 abrió `/admin/ai-diagnostics` en producción. Se verificó proveedor `alibaba`, modelo `alibaba/qwen3.7-flash`, tarifas de entrada/salida configuradas, ledger liquidado USD 0.000859, reservado USD 0 e incierto USD 0. Saldo del proveedor y límite global permanecieron explícitamente desconocidos.
- Captura auténtica: `C:\Users\vgmil\ego\fragments-f22-18-20261125\production-admin-ai-diagnostics.png`; SHA-256 `4762A1ADEB56C9FDAF572F48A95C17066C6426F7EA48B86AC9057F8BC9A627A5`.
- `/admin/ai-diagnostics` y el preflight de configuración/ledger: PASS en producción. No se ejecutó una evaluación IA pagada. Calidad semántica, saldo externo y presupuesto global: NO COMPROBADOS; requieren una fuente verificable del saldo y del límite disponible antes de autorizar llamadas.
- Espacio libre de disco durante esta release: NO COMPROBADO.
- La sesión y pestañas Ego Lite se conservaron; no se cerró ni reinició la sesión del estudiante o docente.

## Commits
- Implementación: `db02e19a1592bbc3653dd669181b16b32c3e51d6` (PR #281).
- Esta reconciliación documental: se registra en el commit siguiente.
