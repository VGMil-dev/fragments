# F17.17 — Especificación

1. Una propuesta existente sin cambios de habilidades conserva el estado completado de Habilidades cuando se editan campos de Idea, contexto, objetivos/alcance o portada.
2. Si la selección de habilidades cambia, Habilidades queda pendiente hasta guardar correctamente; si el guardado falla, permanece pendiente.
3. `isDirty` continúa bloqueando la evaluación hasta guardar los cambios de la propuesta.
4. No se cambia el payload, contrato, API, persistencia ni proveedor de IA.

## Verificación

- Prueba de regresión en `MentorScreen`: cambiar alcance sin cambiar habilidades y comprobar que la etapa sigue completada.
- Prueba existente de selección de habilidad: cambiar habilidades y comprobar que la etapa queda pendiente hasta guardar.
- Pruebas focales Mentor, suite web, typecheck y build.
- Producción Ego Lite tras integración/F14: solo si el despliegue legítimo se procesa; no evaluar IA.
