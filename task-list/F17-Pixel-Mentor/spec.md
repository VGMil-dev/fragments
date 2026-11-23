# F17 Pixel Night Mentor — Especificación

## Entradas y estado
- Conserva las seis etapas ya existentes y sus fuentes de estado.
- Evaluación, portada y habilidades siguen leyendo únicamente los callbacks/props ya disponibles.
- El porcentaje se deriva de los campos requeridos que pasan sus validaciones y de campos opcionales cuando están informados.

## UI
- Stepper superior con Idea, Contexto, Habilidades, Objetivos y alcance, Evaluación y Portada.
- Una etapa de contenido visible a la vez.
- Stepper de texto a escritorio; en anchos de hasta 1100 CSS px se presenta `Etapa N de 6` con selector, evitando desbordamiento horizontal.
- Estados accesibles: etapa actual, completada, anterior o pendiente; el estado actual usa `aria-current="step"`.
- `Anterior` regresa a la etapa previa. `Guardar y continuar` somete el formulario al guardado existente y avanza solo si el guardado se completa. Los errores/conflictos mantienen la etapa.
- `Guardar borrador` permanece separado.

## Criterios de aceptación
- GIVEN cualquier etapa de Mentor, WHEN se renderiza, THEN el stepper horizontal común aparece encima de su contenido.
- GIVEN viewport de 320–1100 CSS px, WHEN se renderiza, THEN se ofrece un selector compacto de etapa sin fila desplazable.
- GIVEN cambios de borrador, WHEN se activa `Guardar y continuar`, THEN se invoca el callback existente de crear/actualizar; solo una respuesta satisfactoria cambia de etapa.
- GIVEN fallo de guardado, WHEN se activa `Guardar y continuar`, THEN se conserva la etapa y se muestra el error existente.
- GIVEN valores incompletos, WHEN se muestra el progreso, THEN solo los campos válidos cuentan.
- GIVEN etapa Evaluación, WHEN se muestra el stepper, THEN evaluación/puntuación/controles siguen basados en respuesta persistida de Mentor.

## Límites de verificación
La responsividad en navegador Ego Lite, navegación por teclado/foco, contraste y QA visual siguen pendientes del agente QA independiente.
