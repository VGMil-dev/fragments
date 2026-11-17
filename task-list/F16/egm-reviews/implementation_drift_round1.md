# EGM — Drift de implementación F16, ronda 1

**Revisor:** Goldfish independiente, GPT-6 Luna Medio, contexto nuevo.
**Alcance:** documentos F16 y fuente visual del frontend, sin cambios.
**Resultado:** cuatro discrepancias accionables. Revisión estática; no constituye aprobación de la especificación completa.

## Hallazgos

1. A ≤640 px, una regla heredada ocultaba `.site-nav` después de los overrides móviles, contra la navegación visible definida en `design_draft.md`.
2. Entre 641–760 px, `@media(max-width:900px)` fijaba 76 px de alto al header de dos filas y podía recortar la navegación.
3. `docs/DESIGN_TOKENS.md` aún permitía sidebar aunque F16 decidió header superior compartido sin sidebar.
4. `skills/fragments-f16/SKILL.md` no figuraba en el allowlist de `spec.md`.

## Resolución por el Elephant

- Override móvil definitivo al final de la cascada conserva `.site-nav` visible a 320/390 px, con enlace de 44 px y scroll horizontal local.
- Alto del header flexible también en 641–760 px.
- `docs/DESIGN_TOKENS.md` ahora dice que el header compartido va sin sidebar, drawer ni menú oculto; retirado el token de ancho de sidebar.
- Retirado `skills/fragments-f16/SKILL.md`; no se amplió allowlist.
- Ego Lite confirma nav visible y ancho de documento 320/390 px; header `auto` de 131 px sin recorte en 641/760 px.

## Ronda 2 — delta de resolución

Goldfish independiente, GPT-6 Luna Medio/contexto nuevo, verificó los cuatro puntos corregidos junto con paleta, top header sin sidebar, montaje sin sesión de Review/Trainer, reducción de movimiento y 320 px. Resultado: **No drift detected**. Sin hallazgo actual accionable en este alcance.

## Límite de aprobación

Esta revisión es una auditoría de consistencia de implementación, no una aprobación general de readiness. Los hallazgos de readiness del hito de diseño permanecen sin revalidación Goldfish porque ya se consumieron las dos rondas ordinarias de ese hito.
