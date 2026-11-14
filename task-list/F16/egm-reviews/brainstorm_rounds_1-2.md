# EGM Brainstorm — reportes consolidados

**Artefacto revisado:** `task-list/F16/concepts_brief.md`.
**Modelos Goldfish:** GPT-6 Luna Medio en los subagentes indicados.
**Límite:** máximo ordinario dos rondas; no se declara aprobación del concepto, y la aprobación visual humana sigue pendiente.

## Ronda 1 — diagnóstico de concepto (3 lentes)

### Design Critic — `egm-brainstorm-design`

Lecturas verificadas: `agents/design_critic.md`, `resources/document_standards/heilmeier-standard.md`, `resources/execution_instructions.md`, brief inicial.

- **Major — esfuerzo y cobertura:** alcance amplio sin priorización de matriz route/action/state/viewport. Resolución: verificar inventario y Astryx antes del cierre; establecer cobertura de alto riesgo y estados representativos.
- **Major — recursos/coste:** faltaba estimación de tiempo/presupuesto. Resolución: estimación explícita de 8–12 días hábiles, supuestos y dependencias, sin coste de servicios.
- **Major — problema actual:** no había evidencia de interfaz actual ni mejora esperada. Resolución: describir la composición/capas CSS observadas y dejar claro que el defecto visual solo se determina con capturas.
- **Major — umbral de aceptación:** AA y QA sin umbrales. Resolución: definir contraste, viewport, rutas/acciones, teclado y estados.
- **Nit — discrepancias del kit:** resolverlas sin alterar permisos y documentar qué prevalece. Resolución: prevalece el código/contrato actual; discrepancias se registran y no se cambia acceso dentro de F16.

### Zoom Out — `egm-brainstorm-zoom`

Lecturas verificadas: `agents/zoom_out.md`, `resources/document_standards/zoom-out-standard.md`, `resources/execution_instructions.md`, brief inicial. Contraste read-only de `App.tsx` y features.

- **Major — tareas reales:** brief no listaba rutas/tareas. Resolución: inventory con once rutas y seis estados.
- **Major — accesibilidad:** faltaban reflow 320 px, objetivos, tablas y contraste de controles. Resolución: requisitos explícitos de WCAG 2.2 AA y QA a 320 px.
- **Nit — pixel-art:** riesgo de interferir con acciones/datos. Resolución: arte restringido a landing y estado vacío pertinente, subordinado a controles, reduced motion estático.
- **Nit — QA cartesiana:** cobertura sin límites. Resolución: todas las rutas en viewports críticos, cada acción una vez, estados representativos y excepciones explicadas.

### Inventive Catalyst — `egm-brainstorm-inventive`

Lecturas verificadas: `agents/inventive_catalyst.md`, estándar Zoom Out, instrucciones de ejecución y brief inicial.

- **Major — exceso de QA:** riesgo de multiplicar combinaciones. Resolución: cobertura estratificada por riesgo y reutilización de tests existentes.
- **Major — tope de rondas:** el número de rondas no puede excusar defectos. Resolución: el tope organiza reviews; acceptance criteria bloquean cierre si hay fallos críticos/altos.
- **Nit — acoplamiento a estilos:** revisar convenciones actuales antes de wrappers; resuelto con auditoría CSS y componentes locales mínimos.
- **Nit — adopción Astryx:** no había criterio comparativo. Resolución: adoptar solo tras API real y compatibilidad; fallback local explícito.

## Ronda 2 — verificación tras actualizar el brief (4 lentes)

### Codebase Details — `egm-brainstorm-codebase`

Lecturas verificadas: persona oficial, estándar feature-spec, instrucciones de ejecución, brief actualizado, `App.tsx`, estilos y componentes listados. Checkout correcto confirmado en F16 HEAD.

- **P2 — access gate divergente:** `StudentWorkspace` comprueba `getMe()` para Gallery/Mentor; Review/Trainer se montan sin ese guard frontend compartido. Brief actualizado lo describe y lo preserva; no se deduce la autorización del backend.
- **P2/P3 — rutas y herramientas:** las rutas docentes, callback y reset sí están activas; inventario actualizado en consecuencia.
- **P3 — identidad:** `StudentLoginScreen` incluye OAuth/configuración/error/retry; callback distingue rol/identidad; Teacher Reset combina solicitud de enlace y establecimiento por `#token`.
- **P3 — estado vacío docente:** `TeacherStudentsWorkspace` no muestra empty state explícito de estudiantes o proyectos, aunque el inventario inicial lo infería. Resolución: la tabla ahora lo marca como no existente y clasifica una explicación visual como mejora candidata, sin crear datos.
- **N/A — telemetría/escalabilidad:** F16 no añade operación ni backend; no se requiere tracing/instrumentación nueva. Conservar errores y reintentos existentes.

### Structural — `egm-brainstorm-structural`

Lecturas verificadas: persona/estándar/instrucciones oficiales y brief actualizado.

- **Major — procedencia:** faltaba fuente concreta y relación elemento/estado. La separación de autoridad existe, pero aún requiere tabla fuente→estado por recurso/concepto.
- **Major — riesgos:** faltaba sección de modos de fallo y mitigación explícita (Astryx incompatible, CSS responsivo, reduced-motion y acceso/privacidad). Pendiente añadir una matriz; seguridad/escalabilidad deben marcarse fuera de alcance sin cambios backend.
- **Nit — arquitectura visual:** detallar qué es layout compartido y qué permanece local a cada feature. Pendiente agregar resumen explícito de ownership.
- **Formato:** jerarquía H1/H2 y Markdown válidos.

### Implementation Readiness — `egm-brainstorm-readiness`

Lecturas verificadas: persona/estándar/instrucciones oficiales, brief e inventario actualizados.

- **Major — rollback:** por ser frontend-only no hay migración de datos; faltaba regla de reversión visual por grupo si CSS/layout rompe una ruta/acción. Pendiente agregar checkpoints reversibles en el plan.
- **Nit — baseline:** faltan capturas iniciales, y los tokens comunes pueden afectar superficies aún no revisadas. Pendiente capturar baseline Ego Lite antes de cambiar código visual.

## Resoluciones del Elephant

Aceptadas: priorización de cobertura, umbrales, alcance de sprites, diferencia real de los guards, y máximo de rondas como cadencia y no como waiver. No aceptadas como hecho: “mala UI” sin baseline, autorización de nuevas rutas o cambios de acceso, y estados vacíos donde el código no los expone.

## Resoluciones posteriores del Elephant

- Añadida tabla fuente/estado/ruta para colores, rutas, iconos, animaciones y Astryx; `CANDIDATE` se conserva como etiqueta inglesa literal.
- Añadidos riesgos, mitigaciones y declaración fundada de no aplicabilidad a backend/escalabilidad/telemetría.
- Añadida distribución tokens globales/shells comunes/estado local a feature.
- Añadida reversibilidad por grupo y obligación de capturar baseline antes del primer cambio visual.
- `TeacherStudentsWorkspace` carece de empty state de lista/proyectos. Inventario marca como candidata una explicación de respuesta vacía, sin tratarla como estado existente.

**Estado del hito:** dos rondas de feedback cubrieron siete lentes en dos oleadas (la primera sobre el brief inicial, la segunda sobre la actualización y el código). No se declara aprobación final porque diseño de implementación/readiness aún no se revisó y el baseline visual sólo se ha capturado parcialmente. Se preservan los hallazgos/resoluciones anteriores arriba y el operador verá la evaluación pendiente.
