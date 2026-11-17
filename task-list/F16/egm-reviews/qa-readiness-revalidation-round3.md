# EGM — revalidación de QA/readiness F16, ronda 3

**Hito:** galería local de aprobación visual y hallazgos de readiness pendientes de R2. **Estado:** R3 encontró cuatro Majors; no convergente. Revisión estática de los tres roles, contextos frescos, sin cambios de Goldfish.

## Protocolo y participación

- Elephant incorporó el cambio del propietario, la galería autónoma y el merge de `origin/main` hacia la rama F16 antes de solicitar la revisión.
- Revisores independientes R3: Implementation Readiness (`/root/f16_r3_readiness`), Codebase Details (`/root/f16_r3_codebase`) y Structural (`/root/f16_r3_structural`). Cada uno usó contexto nuevo (`fork_turns: none`), GPT-6 Luna Medio, esfuerzo medium y revisión de solo lectura.
- Alcance limitado a `spec.md`, `TASKS.md`, `GOAL.md`, estado de evidencia, HTML de galería, comparaciones, límites de fixture y secciones modificadas por los fixes de R2. Codebase Details hizo chequeo estático de archivos y referencias; no abrió navegador ni ejecutó la aplicación.
- Selección de modelo del principal: `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE`; no verificable vía API. No se afirma lo contrario.

## Hallazgos R3

### Implementation Readiness — tres Majors

1. **Allowlist demasiado amplia:** el glob de screenshots permitía salidas no enumeradas. **Resuelto por Elephant:** la especificación ahora trata `baseline/`, `current/` y capturas QA existentes como entradas read-only; enumera de forma cerrada el HTML nuevo y `review-gallery-1440.png`. La captura de galería `review-gallery-320.png` se retiró al descubrir que medía 447 px; no se conserva una afirmación de tamaño inexacta.
2. **Estado y evidencia desincronizados:** la nueva galería no tenía QA interactivo ni commit/hash asociado, pero la tarea aún aparecía cerrada con hash viejo. **Resuelto documentalmente tras la ejecución de QA:** se actualizan QA-26, GOAL, evidencia y fila F16; el hash final se incorpora después de los commits de cierre. Este hallazgo solo se considera cerrado cuando se compruebe la igualdad del hash en los documentos.
3. **Comparador no verificaba los pares:** el botón podía ofrecer capturas inexistentes o con viewports distintos. **Resuelto por Elephant y verificado por navegador:** espera a que carguen ambas imágenes, habilita solo pares de igual dimensión; 11/11 comparaciones de escritorio se abren. Los nueve pares móviles 390×844 se abren; Review y Trainer quedan deshabilitados con causa explícita (baseline 419×907 vs current 390×844).

### Codebase Details — sin hallazgos

- Confirmó la etiqueta correcta del PDF Review sintético, la separación QA-07 Mentor/QA-10 Review y la evidencia de Nit histórico del API; estos fixes de R2 persisten.
- Confirmó estáticamente existencia de 22 capturas principales y 44 archivos de comparaciones; revisión sin ejecución de navegador.
- El revisor no certifica interacción o carga visual real. Elephant ejecutó esa comprobación por separado con Ego Lite y la documenta en QA-26.

### Structural — un Major

- **Faltaba la sección normativa `Alternatives Considered`. Resuelto por Elephant:** `spec.md` contiene dicha sección bilingüe, compara encabezado superior con sidebar y drawer, evalúa Astryx frente a componentes locales, y galería HTML frente a ruta de producto/PDF, justificando trade-offs de ancho a 320 px, visibilidad de rutas y alcance.
- El Nit de R2 sobre frase histórica de API permanece corregido; Structural R3 lo verificó como tal.

## Revisión de los tres Majors y dos Nits de R2

| Hallazgo R2 | Resultado actual |
|---|---|
| Readiness Major: allowlist sin rutas documentales exactas | Corregido en R2; el glob de capturas se volvió a estrechar tras R3 y ahora permite solo el HTML y PNG desktop nombrados. |
| Readiness Major: TASKS/evidencia/hash desincronizados | R2 fue sincronizada con `61b268d…`; el nuevo trabajo volvió a dejar la fila pendiente de un hash fresco. Se sincroniza tras el commit final de galería y se confirma en R4. |
| Codebase Major: descarga Review rotulada como PDF válido aunque el fixture solo entrega marcador | Corregido: QA-10/evidencia hablan de payload fake descargado, estructura/validez `NOT_RUN`; Codebase R3 confirmó la descripción. |
| Codebase Nit: QA-07 agrupaba Mentor y Review | Corregido: QA-07 solo Mentor y QA-09/10 Review; confirmado por Codebase R3. |
| Structural Nit: oración histórica de API sin rotular | Corregido: encabezado limita la afirmación a QA inicial pre-fixture y remite a QA vigente; confirmado por Structural R3. |

## Resultado de R3

- Totales: **4 Majors, 0 Nits** (Readiness 3 Majors, Codebase 0, Structural 1 Major).
- Los cuatro Majors tuvieron un fix concreto del Elephant y se revalidarán de forma independiente en R4, la segunda y última ronda ordinaria solicitada para este hito.
- No hay convergencia: R3 tuvo hallazgos y no existen dos rondas limpias consecutivas. Una R4 limpia no bastará para reclamar convergencia; no se iniciará una quinta ronda sin instrucción nueva.
