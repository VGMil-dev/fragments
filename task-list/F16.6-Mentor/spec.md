# F16.6 — especificación

## Criterios

1. Mentor mantiene el stepper superior de seis etapas y una sola etapa visible; la navegación global permanece intacta.
2. El progreso porcentual del borrador sigue separado y calculado a partir de campos válidos.
3. El paso Contexto solo aparece completado cuando existe contexto publicado (`success`). `empty`, `loading` y `error` se exponen como modo personal, consulta en curso y contexto no disponible, respectivamente.
4. Se conservan borradores, permisos, validación y acciones Anterior/Guardar y continuar.
5. Pruebas Mentor, typecheck y build web pasan. No se hacen capturas autenticadas ni despliegues en esta tarea.
