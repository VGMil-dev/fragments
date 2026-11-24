# Evidencia F17.12 — Elección de misión desde Dashboard

## Estado

Implementado y verificado localmente; PR e integración pendientes. Si no existe un borrador y hay varias misiones publicadas, ya no se promueve la de mayor `createdAt` como prioridad. La CTA principal lleva a Mis aulas y las opciones conservan sus objetivos, habilidades y acciones secundarias reales.

## Alcance aplicado

- Un borrador propio conserva prioridad.
- Una misión publicada conserva la tarjeta y el inicio directo.
- Varias misiones muestran «Elige una misión para comenzar», CTA primaria «Ir a Mis aulas» y hasta tres opciones; el enlace existente conduce a las restantes.
- No hubo cambios a contratos, backend, rutas, autenticación, persistencia, infraestructura ni dependencias.
- Archivos de código: `apps/web/src/features/student/StudentDashboard.tsx` y `StudentDashboard.test.tsx`.

## Verificación fresca

- Prueba roja previa a la implementación: fallaron las expectativas del estado de elección múltiple y del límite/enlace de opciones.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — PASS, 13/13.
- La prueba de interacción pulsa la CTA y confirma que llama exactamente a `onNavigate("/student/classrooms")`.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; permanecen avisos existentes de chunk principal >500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.
- Revisión independiente — CLEAN para lógica, alcance y estados. El revisor señaló y se cerró la brecha de prueba de destino de CTA.
- Commit de implementación: `ec07d6c527883a5270b0eff4b0f6542c0fd21bf8`.

## No comprobado

- La sesión Ego Lite estudiantil no estaba disponible en esta sesión. QA visual en 320/390/768/1024/1440 px, foco, contraste, zoom, lector de pantalla y comportamiento de la nueva vista en producción quedan NO COMPROBADOS.
- No se usaron datos productivos ni se modificaron sesiones de usuario.
