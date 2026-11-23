# Evidencia F22.12 — Eventos operativos Mentor

## Implementación

- Worker integrado: `codex/f22-mentor-real-events` SHA `e5463e2157f2580677675b45d6e5e7cbb3aac2dd`; merge local en `283aec0`. Commit del slice F22.12: `7c9478db5abc887a577cc91a8722727ea3721c7f`.
- F22 worker registra en el límite HTTP eventos allowlisted de evaluación Mentor finalizada o fallida. La proyección conserva etapa y código genérico; excluye identidades, propuestas, prompts, notas, puntuaciones y proveedor/modelo.
- F22.12 añade buffer en memoria (máximo 100), `GET /api/admin/mentor-events?limit=50` (máximo 50) y `/admin/mentor-events` con carga, vacío, error/403 y reintento.
- La consulta requiere Better Auth admin, registra `admin.mentor_events.read` antes de leer, y falla cerrada si auth/auditoría no están disponibles. La ruta envía `no-store` y `nosniff`.
- Sin contratos compartidos, migraciones, escrituras académicas ni llamadas a proveedores reales.

## Verificación local

Fecha: 2026-11-22.

- API focal: `pnpm --filter @fragments/api exec vitest run src/features/mentor/operational-events.test.ts src/features/mentor/operational-log.test.ts src/features/admin-mentor-events/http.test.ts --maxWorkers=1` — 3 archivos, 11/11 PASS.
- Web focal: `pnpm --filter @fragments/web exec vitest run src/features/admin-mentor-events --maxWorkers=1` — 2 archivos, 5/5 PASS.
- Suite API: 44 archivos PASS, 17 omitidos; 160 tests PASS, 69 omitidos.
- Suite web: 47 archivos PASS; 196 tests PASS.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS.
- Builds API y web — PASS. Vite emitió advertencias preexistentes del bundle >500 kB y directivas `use client` de lucide-react.
- Cobertura incluye 401/403, rechazo de límites, auditoría previa a lectura, fallo cerrado, buffer y códigos redactados, validación estricta de respuesta y estados básicos de UI.
- Revisión independiente del HEAD de integración `283aec0` — PASS.
- Skill aplicada: `vercel-react-best-practices`; se usaron estados localizados, efecto cancelable al desmontar y actualización funcional. No había skills locales `backend-architecture`, `test-driven-development` ni `verification-before-completion`; se siguieron las pruebas focales red→verde, revisión estática y verificación de salidas.

## Pendiente de CI y producción

- PR, CI y revisión independiente pendientes.
- No se generó una evaluación real de Mentor. Existencia/retención de eventos productivos y acceso con una sesión admin quedan **NO COMPROBADOS**.
- Ego Lite: **NO COMPROBADO**. El verificador conservó las pestañas, encontró sesiones de perfil Milton, docente y estudiante, sin sesión admin disponible; no abrió la ruta, no consultó el endpoint y no accedió a producción.
- El buffer se pierde al reiniciar el proceso de API; no sustituye almacenamiento duradero ni logs externos.
