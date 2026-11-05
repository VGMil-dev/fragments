# F02 — Specification

**Objetivo:** cliente tipado y recorrido de estudiante con datos reales o fake claramente etiquetados.

## Entradas y API
- DTO y esquemas exclusivamente desde `@fragments/contracts`.
- Cliente HTTP centralizado, con manejo de `ApiResult`, timeout y errores sin registrar datos sensibles.
- Fake API solo para desarrollo/pruebas, identificada en UI y documentación.

## Salida y UI
- Superficies de galería, Mentor, Review y entregas ubicadas bajo las rutas asignadas.
- Formularios con validación legible, carga, vacío, éxito, error y recuperación.
- Navegación que lleva y devuelve a la superficie anterior sin etiquetas técnicas.

## Criterios GIVEN / WHEN / THEN
- [ ] GIVEN API disponible, WHEN el estudiante carga la galería, THEN ve entradas publicadas opt-in desde el contrato compartido.
- [ ] GIVEN propuesta inválida o una falla del servidor, WHEN evalúa, THEN ve qué corregir y puede reintentar sin datos sensibles en el mensaje.
- [ ] GIVEN una evaluación Mentor o Review, WHEN se muestra al estudiante, THEN no se inventan nota, hallazgos ni estados; provienen de la respuesta API o de un fake rotulado.
- [ ] GIVEN que se genera una entrega, WHEN se confirma, THEN cliente usa el contrato compartido y muestra enlace/descarga recibida, sin guardar PDF ni token fuera del flujo indicado.
- [ ] GIVEN carga, vacío o error, WHEN la API responde cada estado, THEN la pantalla indica estado y siguiente acción.
- [ ] GIVEN vista móvil y teclado, WHEN se navega el flujo, THEN controles son operables, focus visible y no hay scroll horizontal esencial.

## Pruebas y límites
- Unit tests de cliente/hooks y estados; validación exploratoria con ego(lite) en Windows.
- No editar identidad/hero de W1, lógica de API, contratos ni nota académica.
