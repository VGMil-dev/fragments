# Especificación F17.11

## Entrada
Propuestas propias, aulas activas y misiones publicadas obtenidas con el cliente y DTO existentes.

## Salida
El Dashboard conserva la prioridad del borrador más reciente. Si no hay borrador, consulta las misiones publicadas de aulas activas y ofrece iniciar la más reciente en Mentor. La misión completa se conserva para fijar contexto y habilidades requeridas.

## Criterios de aceptación
- DADO que hay un borrador CUANDO se carga el Dashboard ENTONCES se ofrece continuar ese borrador.
- DADO que no hay borrador y sí misión publicada CUANDO se carga el Dashboard ENTONCES aparece el título real y un CTA para iniciar esa misión.
- DADO que el estudiante inicia la misión ENTONCES Mentor recibe la misma versión, contexto publicado y habilidades requeridas.
- DADO que las misiones fallan CUANDO se renderiza el Dashboard ENTONCES se informa el error y se permite reintentar.
- DADO que falla la consulta de aulas ENTONCES no se asume que no hay misiones y el reintento vuelve a consultar las aulas.
- DADO que no hay aula activa o misión publicada ENTONCES se conserva el CTA existente para crear una propuesta.
