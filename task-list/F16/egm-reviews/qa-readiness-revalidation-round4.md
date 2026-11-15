# EGM — revalidación QA/readiness F16, ronda 4

**Hito:** revalidación final ordinaria de la galería visual del propietario. **Objeto revisado:** commit `e4119159b03de9f39fb98459c1db63a669f03810` en `feature/f16-experience-redesign`. **Resultado:** dos Majors, cero Nits; R4 no queda limpia.

## Protocolo y participación

- Tres revisiones independientes, solo lectura, GPT-6 Luna Medio, medium, contextos frescos (`fork_turns: none`), delimitadas a los fixes R3, estado/hash, alternativa de layout, evidencias y claims del fixture.
- Implementation Readiness: `/root/f16_r4_readiness`. Revisión documental y estática; no ejecutó app, browser ni tests.
- Structural: `/root/f16_r4_structural`. Revisó el commit indicado con `git show`, porque su checkout físico activo correspondía a otra rama/worktree; no editó ni ejecutó app.
- Codebase Details: `/root/f16_r4_codebase`. Revisión estática de rutas de archivos/fixtures; no navegó ni ejecutó la aplicación.
- Modelo principal sigue `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE`. Los tres revisores se solicitaron explícitamente en GPT-6 Luna Medio/medium; no se declara verificación API del principal.

## Resultados Goldfish

### Implementation Readiness — un Major

- **Major — referencia de hash no llegaba al estado documental revisado.** TASKS y evidencia nombraban el checkpoint visual `141be056dbf07bf7f1c39efed2022c14a6801cc0`, pero no identificaban el commit de sincronización `e4119159b03de9f39fb98459c1db63a669f03810` que R4 inspeccionó. Aunque ambos documentos concordaban en el hash del artefacto visual, la transición de estado/hash actual no estaba documentada. **Fix posterior del Elephant:** las dos filas ahora distinguen el checkpoint de contenido visual (`141be056…`) del commit de sincronización/objeto revisado R4 (`e411915…`). Este cambio queda sin ronda adicional.
- Los otros checks Readiness solicitados pasaron: exactitud del allowlist y separación read-only; comparación solo si ambas capturas cargan y coinciden; estado/limitaciones no proclaman convergencia ni readiness de merge.

### Structural — un Major

- **Major — afirmaciones responsive contradictorias.** `spec.md` aún ordenaba no declarar `scrollWidth` medido por la diferencia del viewport de Ego Lite, mientras QA-26/evidencia sí registraban la medición posterior del arreglo mediante `Emulation.setDeviceMetricsOverride`. **Fix posterior del Elephant:** se actualizó la especificación para describir ese método y sus cifras observadas: 320/375 con inner/client/scroll iguales; 768/1440 con barra vertical de 15 px, scroll igual a client y sin hijos fuera del ancho CSS útil. Se precisa que es emulación CSS, no verificación de zoom real. La documentación quedó alineada; no se pedirá R5 por el límite de rondas.
- El Major R3 `Alternatives Considered` aparece resuelto: la especificación compara layout superior, sidebar/drawer, Astryx/componentes locales y opciones de entrega con trade-offs de alcance, ancho y navegación. El Nit histórico de API R2 continúa delimitado a la revisión previa al fixture y apunta a QA actual.

### Codebase Details — limpio

- Sin hallazgos en su alcance: QA-10/galería no llaman PDF válido a la descarga fake de Review; QA-07 permanece específico de Mentor; confirmó 11 rutas, 22 capturas principales, 11 estados extra, 44 comparaciones baseline/current, 88 archivos QA y existencia de las referencias estáticas.
- El resultado es estático; no afirma navegación, ejecución, dimensiones de captura ni funcionalidad real.

## Estado EGM y límite de rondas

- R3 encontró cuatro Majors. R4 encontró dos Majors y no fue limpia.
- Los dos hallazgos R4 recibieron fixes del Elephant después de las revisiones. No se iniciará otra ronda ordinaria: R3 y R4 consumen las dos rondas autorizadas para esta extensión. No hubo dos rondas consecutivas limpias; por el estándar EGM no se declara convergencia ni aprobación Goldfish de readiness.
- Los fixes post-R4 quedan explícitamente como cambios de Elephant sin validación Goldfish independiente. El paquete local puede pasar a la revisión visual humana del propietario, pero esta evidencia no autoriza merge ni publicación.
