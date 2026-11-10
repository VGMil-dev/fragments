# F11 — Especificación

## Configuración

- Una configuración global contiene temática, consigna, requisitos, nivel esperado y criterios de rúbrica con peso entero.
- Los pesos publicados suman 100. Cada criterio tiene identificador estable, nombre e instrucción de evaluación.
- El docente puede guardar un borrador sin publicarlo. Publicar crea una versión inmutable y la convierte en la única versión activa. La primera migración crea una configuración general compatible con Mentor existente.
- La configuración activa es pública de solo lectura para que Mentor muestre el contexto al estudiante. Leer o cambiar el borrador, publicar y consultar evaluaciones exige sesión autorizada docente Better Auth.

## Evaluación

- El evaluador recibe la propuesta y la instantánea exacta de la configuración activa. Devuelve un juicio por cada criterio con estado, evidencia en campos de la propuesta y explicación; no devuelve nota.
- El servidor valida que no falten, sobren ni se repitan criterios. Calcula puntos: `verified = peso`, `not_verified = mitad redondeada hacia arriba`, `failed = 0`; suma y limita a 100.
- Se persisten en cada evaluación la propuesta, digest, versión de configuración, temática, rúbrica, pesos, estados, puntos, resultado IA y fecha. Las notas históricas no se recalculan.
- Repetir una evaluación con la misma revisión de propuesta, digest y versión publicada devuelve el mismo registro y no invoca el proveedor. Una revisión modificada o una nueva publicación permite una evaluación nueva.

## API

- `GET /api/mentor/context`: configuración activa, lectura pública.
- `GET /api/teacher/mentor-control`: borrador, versión activa y evaluaciones recientes. Better Auth docente.
- `PUT /api/teacher/mentor-control/draft`: valida y guarda el borrador. Better Auth docente.
- `POST /api/teacher/mentor-control/publish`: publica el borrador como siguiente versión inmutable. Better Auth docente.

## UI

- Ruta `/teacher/mentor-control`, inicia sesión mediante Better Auth y permite editar contexto/rúbrica, guardar borrador, publicar y consultar evaluaciones.
- Mentor muestra la temática/consigna vigente y desglosa puntos por criterio junto con el total.
- La vista histórica muestra versión, nota original, desglose y fecha; no edita ni recalcula registros.

## Aceptación

- [x] Configuración general sembrada en migración; actualización y publicación de versiones preservan las anteriores.
- [x] Rutas protegidas rechazan sesiones sin autorización docente.
- [x] El evaluador fake devuelve etiquetas estructuradas; el servidor obtiene el puntaje ponderado esperado.
- [x] Evaluación idéntica reutiliza id, nota y desglose sin segunda llamada; una nueva versión permite evaluar otra vez.
- [x] Migración conserva el JSON, ID y nota de evaluaciones previas sin asignarles una versión nueva.
- [x] Suite de regresión, typecheck, build y lint ejecutados; flujo vertical probado con Ego Lite y fake provider.
- [x] Evidencia local ignorada por Git: seis archivos con manifiesto, debajo del máximo de 20.
