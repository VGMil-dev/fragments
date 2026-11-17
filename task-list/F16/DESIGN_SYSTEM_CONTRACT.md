# F16 Design System Contract — Pixel Night

**Autoridad:** decisión explícita del propietario del 2026-11-14. F16 reemplaza las directrices crema/azules históricas y se aplica a todas las rutas. **Estado:** decisión cromática definitiva; tokens semánticos documentados. EGM de drift de implementación terminó sin drift en la segunda ronda. La readiness de los documentos del hito conserva los hallazgos abiertos de su tope de dos rondas; los flujos autenticados, zoom y la inspección completa de accesibilidad visual siguen limitados/no verificados y no se declaran aprobados.

## Marca y regla de uso

| Token | Valor | Estado | Uso |
|---|---|---|---|
| `color.brand.night` | `#030407` | aprobado por propietario F16 | fondo principal y marco oscuro |
| `color.brand.cobalt` | `#1558C9` | aprobado por propietario F16 | identidad, navegación y controles seleccionados |
| `color.brand.lime` | `#D4FF24` | aprobado por propietario F16 | acento, indicador activo y acción destacada sobre fondo oscuro |
| `color.surface.base` | `#0C1222` | propuesta kit | superficies de contenido |
| `color.surface.raised` | `#121C32` | propuesta kit | paneles/detalles |
| `color.text.primary` | `#F3F7FF` | propuesta kit | texto sobre fondos oscuros y Cobalt |
| `color.text.secondary` | `#ADBBD3` | propuesta kit | texto secundario solo en fondos oscuros |
| `color.border.subtle` | `#314363` | propuesta kit | divisores no esenciales; no usar como único borde de control |
| `color.state.info` | `#65B8FF` | propuesta kit | información sobre fondos oscuros |
| `color.state.success` | `#67DCAA` | propuesta kit | éxito sobre fondos oscuros |
| `color.state.warning` | `#FFD166` | propuesta kit | advertencia sobre fondos oscuros |
| `color.state.danger` | `#FF7785` | propuesta kit | error sobre fondos oscuros |

Todos los estados deben acompañarse de texto, icono/forma o `role`; no basta el color. Texto muted/estado no se coloca sobre Cobalt para texto pequeño: el contraste del muted sobre Cobalt es 3.31:1 y no alcanza AA de texto normal. Texto principal sobre Cobalt alcanza 5.98:1. Los cálculos WCAG de contraste relativo, redondeados a dos decimales, están anotados en `evidencie.md`; la validación de controles y pixels se completa en navegador.

## Tokens semánticos provisionales

| Grupo | Tokens |
|---|---|
| Fondo/superficies | `--f16-color-canvas`, `--f16-color-surface`, `--f16-color-surface-raised`, `--f16-color-surface-overlay` |
| Texto | `--f16-color-text-primary`, `--f16-color-text-secondary`, `--f16-color-text-inverse` |
| Marca/estado | `--f16-color-brand-primary`, `--f16-color-brand-accent`, `--f16-color-info`, `--f16-color-success`, `--f16-color-warning`, `--f16-color-danger` |
| Bordes/foco | `--f16-color-border`, `--f16-color-border-strong`, `--f16-color-focus` |
| Espaciado | `--f16-space-1`…`--f16-space-12`: escala base 4 px; páginas usan gutter 16/24/32 px según viewport |
| Tipografía | `--f16-font-body: system-ui`; `--f16-font-display: system-ui`; body 16 px / 1.5; small 14 px; H1 48–64 desktop, 36–44 mobile |
| Radios | `--f16-radius-control: 8px`; `--f16-radius-card: 14px`; `--f16-radius-panel: 20px` |
| Elevación | `--f16-shadow-card`, `--f16-shadow-dialog`; sombras oscuras contenidas sin glow constante |
| Motion | `--f16-motion-fast: 140ms`; `--f16-motion-normal: 220ms`; `--f16-motion-enter: 180ms`; reduced = 0/d-none |
| Layout | `--f16-content-max: 1280px`; `--f16-header-height: 72px` (altura flexible en tablet/móvil) |
| Breakpoints | `390px` viewport móvil de QA; `768px` cambio tablet/móvil; `1024px` navegación escritorio; `1440px` escritorio de QA |

La escala exacta para tokens auxiliares se implementa en `apps/web/src/styles/tokens.css`. Los tokens legacy se sustituyen solo tras migrar todos sus consumidores; F16 no mantiene una segunda paleta crema activa.

## Tipografía y legibilidad

No se empaqueta tipografía remota ni bitmap. System sans para cuerpo, formularios, tabla y controles. Un detalle display pixelado solo se admite si ya existe recurso licenciado en el repo; si no, se usa sans con tracking, sin pseudo-pixelar letras. Cuerpo mínimo 16 px (14 px solo metadatos no esenciales), interlineado ≥1.5 y longitud de lectura limitada.

## Iconos y arte

Botones y navegación deben conservar texto visible. Los 16 iconos PNG del kit son `CANDIDATE`, requieren inspección transparente a 20–32 px y licencia/procedencia en manifiesto; por defecto solo usarlos como acento de sección, no como icono funcional de acciones críticas. El sprite aprobado se carga con `width`/`height`; respetar pixel grid. Para reduced-motion renderizar el PNG estático correspondiente mediante `<picture>`/`source media` u otra técnica verificada que evite que el navegador descargue/ejecute la animación cuando sea posible.

## Componentes Astryx verificados

Estado al inicio: no instalado en `apps/web`. La fuente oficial dice React 19+, CSS precompilado y CLI `component --list`/`component <Name>`. Antes de adoptar hay que registrar la versión exacta, peer dependencies, export path, props y test/build. Candidatos: Button/Card/Stack. `Text`, `TextField`, `Select`, `Tabs`, `Dialog`, `Table`, `Badge`, `Alert`, `Skeleton`, `Progress`, `Navigation` no son API confirmada a partir del kit. Si adopción falla en versiones/API o añade conflicto al reset, mantener controles existentes con estilos F16 y dejar ADR con evidencia.

## Layout responsive

Public layout: header de altura flexible; hero editorial; columnas apiladas bajo 768 px; CTA antes del arte. Student y Teacher usan el mismo patrón de header superior con labels visibles y `aria-current`; no sidebar, drawer ni menú oculto. En anchos donde no caben los enlaces, solo la fila de navegación puede desplazarse horizontalmente; foco y controles nunca quedan recortados. Contenido móvil va en una columna, controles ≥44 px cuando sea posible. Nunca depender de hover. Tablas preservan semántica y usan scroll local solo para el dato ancho.

## Focus, motion y accesibilidad

Foco de teclado lime de 2–3 px con offset sobre fondo; asegurar que se vea dentro del scroll y no se recorte. No desactivar outline sin reemplazo. Transition solo en color/borde/transform corto. En `prefers-reduced-motion: reduce`: quitar animación, smooth scroll, parallax y sprite animado; mostrar frame estático, sin esconder información. Cumplir contraste WCAG AA para texto, controles, gráficos esenciales y estados.
