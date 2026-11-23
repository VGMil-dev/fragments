# F22.12 — Eventos operativos de evaluaciones Mentor

## Problema

La consola F22 ya expone eventos operativos de Review, pero los fallos y resultados de Mentor no están disponibles en el feed administrativo. Diagnosticar una evaluación requiere revisar el host y la información dispersa de stdout.

## Resultado esperado

Registrar eventos reales de éxito/fallo en la frontera de evaluación Mentor y exponer una muestra acotada en una vista admin de solo lectura. Los datos se redactan antes de escribirlos y antes de mostrarlos. El buffer es volátil y no crea tablas ni migraciones.

## Límites

- No invocar proveedores IA reales durante tests.
- No mostrar puntuación, rúbrica, propuesta, identidad, IDs académicos, prompts, modelo/proveedor ni mensajes de excepción.
- La consulta admin exige Better Auth admin y registra auditoría antes de leer; si auth o auditoría falla, no devuelve eventos.
- No cambiar la ruta existente de Review ni su retención.
- Producción y eventos de Mentor reales quedan NO COMPROBADOS si no ocurre una evaluación legítima después del despliegue.

## Continuidad de verificación · 2026-11-23

- Cerrar el hueco entre pruebas unitarias separadas conectando un evaluador fake, el buffer operativo y la lectura admin auditada en una sola prueba local. Esto comprueba el cableado del flujo sin inferir que existan eventos en producción ni requerir IA real.
- Verificar adicionalmente que la puerta admin del endpoint funciona con una sesión Better Auth creada por el proveedor real sobre PostgreSQL local efímero, manteniendo sintéticos el usuario y evento y limitando la limpieza al ID propio.
- Ampliar la prueba compuesta para que la solicitud POST de evaluación atraviese el handler HTTP real con un evaluador Mentor fake local; la misma sesión admin de Better Auth lee el evento generado por el buffer.

## Continuidad de administración · consulta auditable desde el registro

- Problema: el endpoint de eventos Mentor ya emite `admin.mentor_events.read` antes de consultar el buffer, pero el cliente del registro administrativo no reconocía ese tipo. Si la muestra incluía la consulta de Mentor, rechazaba toda la respuesta y tampoco permitía filtrarla.
- Objetivo: representar y filtrar ese tipo de lectura en el registro admin existente, manteniendo el parser estricto de campos y eventos allowlisted.
- No objetivos: cambiar API, contratos, persistencia/retención, controles de acceso, rutas compartidas o contenido de los eventos Mentor.
- Owner: implementación local en el módulo web `admin-audit-log` y pruebas API/UI focales.
