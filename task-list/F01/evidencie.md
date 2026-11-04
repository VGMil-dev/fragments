# F01 — Evidence / evidencie

Estado: COMPLETE — implementado, integrado y verificado en la rama de trabajo.
Owner: W1

## Skills leídas y decisiones

- `ego-browser`: leído desde `C:\Program Files\Citro Labs\ego lite\Application\0.6.2.7\ego-skills\ego-browser\SKILL.md`; `ego-browser skill` terminó con código 0 y mostró la guía v2.2.0 completa. Se usó ego(lite) para las capturas, navegación, métricas de viewport, teclado y preferencia de movimiento. La ventana inició minimizada; se confirmó con `Browser.getWindowForTarget` y se restauró con el comando documentado `Browser.setWindowBounds` antes de capturar.
- `frontend-design` original: [SKILL.md de anthropics/skills](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md). Adopté decisiones específicas al tema, una ilustración como punto memorable, copy corto y crítica visual por capturas. Descarté tarjetas repetidas, gradients y movimiento de plantilla. Conservé pequeñas etiquetas, color de énfasis y flecha en el CTA porque identifican secciones y el salto interno a “Cómo funciona”.
- `react-best-practices` original: [SKILL.md de vercel-labs/agent-skills](https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-best-practices/SKILL.md). Apliqué imports directos, React mínimo y optimización del hero. No añadí reglas de caché, fetch, Suspense o memoización porque F01 no tiene datos remotos ni estado interactivo.
- `web-design-guidelines` original: [SKILL.md de vercel-labs/agent-skills](https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/web-design-guidelines/SKILL.md) y sus [reglas de auditoría vigentes](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Revisión sin hallazgos bloqueantes en `App.tsx`, `main.css` e `index.html`: semántica, anclas y copy específico, imágenes con dimensiones/alt, foco visible, `scroll-padding`, movimiento reducido, transición por propiedades y prioridad del hero. Formularios, listas largas, datos y motion de video no aplican. Los adornos SVG de 242 y 412 bytes permanecen eager; difiero `loading="lazy"` para no añadir complejidad por recursos mínimos. Los botones y encabezados usan sentence case en español; las etiquetas informativas conservan versales como acento editorial.
- Los originales no estaban instalados en `C:\Users\vgmil\.codex\skills` ni `C:\Users\vgmil\.agents\skills`; se leyeron directamente de sus fuentes verificadas, sin instalación ni ejecución de scripts. Se siguió también el brief Pixel Garden, la paleta y los criterios del repositorio.
- Dirección visual: composición editorial propia con el arte original de Fragments, jerarquía tipográfica sans, paleta aprobada y una sola acción primaria que lleva a “Cómo funciona”. No se copió la referencia suministrada.
- Accesibilidad: landmarks semánticos, enlace para saltar al contenido, foco de teclado visible, anclas funcionales, etiquetas y alt decorativo apropiados. Se respeta `prefers-reduced-motion` con transiciones casi nulas y cero animaciones activas. No se añadieron dependencias de animación.
- Rendimiento: app React mínima con Vite; no se añadió router, estado global ni código de cliente innecesario. El hero quedó en WebP de 146,180 bytes (origen PNG: 1,643,283 bytes) y se carga con prioridad alta porque aparece en el primer viewport.

## Rutas cambiadas

- `apps/web/index.html`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`
- `apps/web/src/App.tsx`, `apps/web/src/main.tsx`, `apps/web/src/components/brand/BrandMark.tsx`, `apps/web/src/components/brand/brand-mark.svg`
- `apps/web/src/styles/main.css`, `apps/web/src/styles/tokens.css`
- `apps/web/public/icon.svg`, `apps/web/public/favicon.svg`, `apps/web/public/apple-touch-icon.svg`, `apps/web/public/og-image.svg`, `apps/web/public/hero-fragments.webp`, `apps/web/public/flower.svg`, `apps/web/public/sparkle.svg`
- `task-list/F01/intent.md`, `task-list/F01/spec.md`, `task-list/F01/validate-f01.mjs`, `task-list/F01/screenshots/*`

## Comandos ejecutados y resultados

- `ego-browser skill` — salida completa v2.2.0; código 0.
- `pnpm install --filter @fragments/web --lockfile=false --ignore-scripts --offline` — código 1; el paquete Vite no estaba en cache local (`ERR_PNPM_NO_OFFLINE_TARBALL`).
- `pnpm import` — código 1 (`ERR_PNPM_LOCKFILE_NOT_FOUND`). Al revisar el estado tras los intentos pnpm, el lockfile rastreado faltaba; se restauró inmediatamente con `git restore -- pnpm-lock.yaml` y quedó sin cambios.
- `npm install --ignore-scripts --no-save --package-lock=false --workspaces=false` desde `apps/web` — código 0 en los dos bootstraps; instaló Vite y luego React/types localmente, sin modificar manifiestos de lock.
- `npm run typecheck` desde `apps/web` — código 0.
- `npm run build` desde `apps/web` — código 0; Vite 8.3.5 transformó 17 módulos y generó HTML, CSS y JS (225.30 kB, 70.18 kB gzip).
- `ego-browser nodejs -e "await import('file:///C:/Users/vgmil/.codex/worktrees/f01-brand/Fragments/task-list/F01/validate-f01.mjs')"` — código 0. Salida de viewport: 390: documento/cuerpo 390 px; 768: 768 px; 1440: 1425 px. En los tres tamaños el CTA quedó dentro del viewport, el hero cargó y no hubo anclas rotas.
- Teclado ego(lite): primer Tab enfocó “Saltar al contenido” con outline sólido de 3 px; Enter activó el enlace. Enter en el CTA llegó a `#como-funciona`.
- Motion ego(lite): `prefers-reduced-motion` activo, transición `1e-05s`, cero elementos con animación activa.
- Metadata ego(lite): title, description, theme-color y etiquetas Open Graph devolvieron los valores Fragments configurados.
- Recursos ego(lite): icon.svg, favicon.svg, apple-touch-icon.svg, og-image.svg, hero-fragments.webp, flower.svg y sparkle.svg devolvieron HTTP 200.

## Capturas

- `task-list/F01/screenshots/f01-mobile-390.png`
- `task-list/F01/screenshots/f01-tablet-768.png`
- `task-list/F01/screenshots/f01-desktop-1440.png`
- `task-list/F01/screenshots/f01-tablet-focus-768.png`

Las cuatro capturas se generaron con ego(lite) y se inspeccionaron visualmente. En móvil el título, la explicación y el CTA aparecen antes de la ilustración. En tablet la ilustración queda completa dentro del ancho disponible. En escritorio se conserva la composición de dos columnas.

## Hash / commit

Implementación aislada: `d0f9a56a4683fd4c187afa368297efc1807a55ee` — `feat(f01): crear identidad y landing`.
Integración en `codex/fragments-mvp`: `2a92524`.

## Verificación de integración

- `pnpm install --lockfile-only --ignore-scripts` → código 0; lockfile actualizado para `@fragments/web`.
- `pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments` → código 0.
- `pnpm build` → 2 paquetes exitosos (`@fragments/contracts`, `@fragments/web`).
- `pnpm typecheck` → 2 paquetes exitosos.
- `pnpm test` → 9/9 pruebas de contratos aprobadas.
- `pnpm lint` → contrato aprobado; web no declara tarea lint.

## Limitaciones

- Los originales `SKILL.md` de diseño no están instalados localmente; se leyeron directamente desde sus repositorios oficiales, sin instalar skills ni ejecutar scripts.
- F01 solo entrega la landing e identidad. La galería y los flujos de dominio corresponden a tareas posteriores.
- No se leyó ni tocó `.env`.
