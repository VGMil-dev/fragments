# Especificación F16.19

## Alcance

- Mentor conserva el stepper superior de seis etapas, Idea → Contexto → Habilidades → Objetivos y alcance → Evaluación → Portada.
- La etapa activa, las etapas completas y los estados de Contexto se derivan del estado real del formulario, del borrador y de las respuestas de contexto/evaluación.
- El stepper controla un único formulario con el ID `mentor-proposal-form`; cada uno de sus seis botones declara `aria-controls="mentor-proposal-form"`.
- `aria-current="step"` identifica únicamente la etapa activa. Los nombres y estados accesibles existentes se conservan.
- La implementación existente conserva el porcentaje separado calculado con los campos válidos, el contexto académico, la navegación Anterior y Guardar y continuar, y el reflow compacto/responsivo.

## Criterios de aceptación

- GIVEN Mentor muestra cualquiera de las seis etapas, WHEN se inspecciona su stepper, THEN hay seis controles y todos apuntan al formulario único.
- GIVEN una etapa está activa, WHEN se inspecciona la navegación, THEN solo esa etapa lleva `aria-current="step"` y las etiquetas conservan el estado real.
- GIVEN los anchos compactos configurados por F16.14, WHEN se lee el CSS, THEN las seis etapas y sus estados se organizan en cuadrícula adaptable sin recuperar la navegación lateral secundaria.
- GIVEN esta tarea, WHEN se guarda o cambia de etapa, THEN no cambian campos, cálculo de completitud, contexto, callbacks, persistencia, rutas, contratos ni APIs.

## Fuera de alcance

QA visual autenticada Ego Lite, revisión propietaria, accesibilidad formal con lector/zoom/contraste, cambios de shell/rutas, nuevos assets y despliegue.
