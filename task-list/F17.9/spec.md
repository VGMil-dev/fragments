# Especificación F17.9 — Mentor Pixel Night

## Criterios de aceptación

- GIVEN Mentor se abre, WHEN la persona inicia una propuesta, THEN Idea aparece primero y permite comenzar sin depender de una matrícula.
- GIVEN la etapa Contexto, WHEN existe contexto académico autorizado, THEN muestra solo datos reales; los estados personal, vacío o de error siguen siendo explícitos.
- El orden del indicador y sus acciones es Idea → Contexto → Habilidades → Objetivos y alcance → Evaluación → Portada.
- GIVEN el indicador de etapas, WHEN se navega entre ellas, THEN los seis nombres, vistas y acciones Editar/Ver contexto corresponden a la etapa correcta.
- GIVEN un borrador con cambios, WHEN se activa Guardar y continuar, THEN solo avanza si el guardado existente termina satisfactoriamente.
- El progreso conserva su semántica de campos obligatorios válidos y es independiente de la etapa visitada.
- El shell global permanece intacto y no aparece un segundo título “Tu propuesta”.
- No se cambian contratos, rutas, permisos, proveedor ni persistencia.
