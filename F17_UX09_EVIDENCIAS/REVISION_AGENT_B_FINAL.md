# Revisión independiente Agent B — UX-09 (ronda final)

## Resultado

**REVISAR global. PASS visual e interacción local; falta QA con persistencia y permisos reales en `fragments_test`.** No se afirma que la evaluación o el guardado reales hayan sido validados: esta revisión instaló fixtures sintéticas en Ego Lite y bloqueó todas las escrituras.

## Referencia y versión observada

- Referencia: `referencia-aprobada.png`, 1672 × 941, SHA-256 `76a1b15c63ba87ce655f2e63f193beb1dd7d8242e62adb7599e73c0c3c11330c`.
- Ego Lite local: `http://127.0.0.1:5173/student/mentor`, propuesta de fixture sintética `proposal-ux09-fixture` (versión 7), sin DB.
- Rama `codex/f17-ux09-evaluation`; HEAD base `1cdeae04b0e0930663c79cde7ef72efe6f8c6054`, archivos del agente A modificados sin commit durante la revisión. SHA-256 del snapshot mostrado: `mentor-screen.tsx` `181DD1C9BE2F98CACBDB59F94F9822E7BC807FE6D67F018776A7C6E7600D590`; `mentor-screen.css` `8D11E1C4AEFA5AABEFD036DD1715BA58295FB215090C55618FC0D8E109199590`.
- Capturas finales de Ego Lite: `ego-review-r5-320.png`, `ego-review-r5-390.png`, `ego-review-r5-768.png`, `ego-review-r5-1024.png`, `ego-review-r5-1440.png`, `ego-review-r5-1672.png`.

## Resultado visual y responsive

La composición final sigue la referencia aprobada: una sola navegación de seis etapas en escritorio amplio; resumen en el orden Idea → Contexto → Habilidades → Objetivos; panel lateral con rueda, botones y microcopy de publicación; sin bloque «Evaluación formativa», tarjeta de aviso ni acciones DOCX. El formulario vacío dejó de ocupar espacio. El aviso de Galería ahora es texto simple y visible antes de evaluar.

| Ancho CSS | Navegación | `scrollWidth` | Overflow |
|---:|---|---:|:---:|
| 320 | Selector compacto + Anterior/Siguiente | 303 | No |
| 390 | Selector compacto + Anterior/Siguiente | 373 | No |
| 768 | Selector compacto + Anterior/Siguiente | 751 | No |
| 1024 | Selector compacto + Anterior/Siguiente | 1008 | No |
| 1440 | Stepper horizontal | 1423 | No |
| 1672 | Stepper horizontal | 1672 | No |

Las diferencias de 17 px corresponden al ancho de la barra vertical del navegador. A 1024 px el panel derecho queda estrecho pero el texto, la rueda y ambos CTA siguen legibles; no considero necesario apilarlo bajo el resumen. En la última comprobación de 1672 px, el contenido principal mide 1364 px, desde x≈288 hasta x≈1652; queda alineado con el borde derecho de la referencia y no produce overflow (`innerWidth=scrollWidth=1672`). El subtítulo ocupa una sola línea. La captura local también lleva la insignia `dev`, propia de este entorno.

## Interacciones y accesibilidad

- «Editar» Idea, Habilidades y Objetivos llevó a la etapa correcta; «Ver contexto» llevó al contexto personal en solo lectura (cero inputs); «Anterior» llegó a Objetivos y «Continuar» volvió a Evaluación.
- En 1024 px, el selector de etapa recibió foco de teclado con `:focus-visible` y contorno sólido; `ArrowUp` cambió de Evaluación a Objetivos. Tab llevó el foco a «Anterior» con foco visible. La lista horizontal conserva `aria-current="step"` en escritorio y el selector tiene nombre accesible.
- La rueda expone `role="progressbar"`, `aria-valuemin`, `aria-valuemax` y `aria-valuenow`. El borrador sintético completo y guardado mostraba 100 % y permitía evaluar.
- Al cambiar el título sin guardar, la rueda siguió reflejando campos completos, el aviso «Tienes cambios pendientes de guardar» apareció y «Evaluar propuesta» quedó deshabilitado.
- Al pulsar «Evaluar propuesta», el stub interceptó la llamada `POST /api/proposals/proposal-ux09-fixture/review` y respondió 405 `QA_WRITE_BLOCKED`; la pantalla mostró un estado de error recuperable. «Recuperar evaluación» hizo un `GET` al stub y conservó el error esperado al no existir resultado en la fixture.
- La captura/lectura final no registró errores de consola ni excepciones del navegador. No se llamó a un proveedor IA.

## Pendiente para cerrar la revisión funcional

El stub respondió `/api/me`, propuestas, aulas y contexto; todas las llamadas `POST/PUT/PATCH/DELETE` quedaron bloqueadas. Por ello esta revisión no prueba guardado persistente, evaluación persistida/resultados, aislamiento entre usuarios ni controles de versión frente a PostgreSQL. Hace falta ejecutar esas comprobaciones desde el coordinador exclusivamente contra `fragments_test`, y anexar evidencia de ese resultado. No se inspeccionó ni modificó una base de datos. La URL configurada localmente no identificó `fragments_test`; el preflight la rechazó antes de conexión o consulta.

La ronda inicial REVISAR y sus capturas anteriores documentan los problemas que se corrigieron: formulario vacío visible, desbordamiento y navegación de tablet ilegible. Esta ronda final ya no reproduce esos defectos; el estado global sigue REVISAR solo por las verificaciones de backend pendientes.


