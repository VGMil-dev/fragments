# F16.6 — evidencia

## Implementación

En `apps/web/src/features/mentor/mentor-screen.tsx`, Contexto solo se considera completado al cargar un contexto publicado correctamente. El stepper distingue `Contexto disponible`, `Modo personal`, `Consultando contexto` y `Contexto no disponible`; si Contexto es la etapa activa, conserva además la indicación de etapa actual. La vista de formulario y los controles de navegación no cambiaron.

En `apps/web/src/features/mentor/mentor-screen.test.tsx`, se añadió una regresión para impedir que el modo personal vacío se presente como etapa completada. Las expectativas existentes ahora comprueban que solo una etapa incompleta no se cuente como completada y que el contenido de Contexto no se muestre fuera de esa etapa.

## Verificación local

- Rojo TDD: el nuevo test falló antes del cambio; recibía `Contexto: Completada` en vez de `Contexto: Modo personal`.
- `pnpm --filter @fragments/contracts build`: PASS, exit 0 (necesario para resolver el paquete workspace en pruebas).
- `pnpm --dir apps/web exec vitest run src/features/mentor/mentor-screen.test.tsx`: PASS, 37/37.
- `pnpm --filter @fragments/web test`: PASS, 241/241 en 49 archivos.
- `pnpm --filter @fragments/web typecheck`: PASS, exit 0.
- `pnpm --filter @fragments/web build`: PASS, exit 0. Vite informó el aviso preexistente/ajeno al cambio sobre bundle >500 kB y directivas `use client` de Lucide.
- No se realizó prueba visual con Ego Lite, sesión autenticada, despliegue ni validación de producción.

Commit: pendiente al preparar este archivo; se añadirá el SHA después de confirmar el commit.
