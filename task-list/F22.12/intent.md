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
