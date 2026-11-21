# UX-09 — Especificación

## UI y navegación
- Mostrar «Evalúa tu propuesta», etapa 5 de 6 y un único stepper horizontal: Idea → Contexto → Habilidades → Objetivos y alcance → Evaluación → Portada.
- Etapa activa azul, etapas completadas verdes solo según validación real; incompletas distinguibles. En móvil ofrecer navegación compacta accesible sin desbordamiento.
- Resumen central, en orden: Idea y propósito; Contexto de clase de solo lectura; Habilidades y tecnologías guardadas; Objetivos y alcance. Cada enlace vuelve a su etapa y usa datos reales del borrador.
- Panel lateral con una rueda de preparación calculada a partir de validaciones reales, «Evaluar propuesta», «Guardar borrador» y consecuencia breve de publicación automática antes de evaluar.
- «Anterior» vuelve a Objetivos y alcance.
- Omitir en esta pantalla bloque «Evaluación formativa», tarjeta «Antes de evaluar · Galería», barra porcentual horizontal, descarga de plantilla Word e importación DOCX.

## Comportamiento
- Evaluar solo si la propuesta autenticada está completa, guardada y su versión es la actual. Mantener prevención de duplicados, carga, error/recuperación y resultado persistido existente.
- Mantener control de cambios sin guardar, guardado real y generación de entregas existentes.
- No mostrar datos inventados. Contexto autorizado permanece de solo lectura.

## Aceptación (Given / When / Then)
- Given un borrador incompleto, When se abre Evaluación, Then el porcentaje refleja sus validaciones y la evaluación está deshabilitada.
- Given una propuesta completa pero con cambios pendientes, When se abre Evaluación, Then se informa del guardado pendiente y no se habilita evaluar.
- Given una propuesta válida guardada en versión actual, When se abre Evaluación, Then se permite evaluar y los eventos duplicados se previenen.
- Given datos de propuesta reales, When se muestran secciones del resumen, Then enlaces Idea/Habilidades/Objetivos navegan a su editor y Contexto sigue siendo de solo lectura.
- Given anchos 320, 390, 768, 1024, 1440 y 1672 CSS px, When se recorre pantalla, Then no hay overflow horizontal ni pérdida de controles.
- Given un resultado persistido, When se abre Evaluación, Then se presentan hallazgos/criterios/recomendaciones existentes sin llamar IA pagada.
