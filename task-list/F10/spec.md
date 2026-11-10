# F10 — Especificación

## Entrada / datos

- Listado mínimo de Reviews completos (ID, repositorio, SHA y fecha).
- El servidor rehidrata el snapshot exacto de Review y valida digest, commit y referencias de evidencia verificadas antes de pedir retos al proveedor compartido de Inspector.
- Banco separado de `inspector_challenges`, con hasta cinco retos a partir de funcionalidades verificadas distintas; se guarda por análisis+commit, se marca listo y se reutiliza entre sorteos.
- Los bancos F10 heredados se amplían una vez, conservan sus retos/attempts y se coordinan mediante una reserva de generación SQLite con lease.
- Sesión estudiantil anónima en cookie opaca `HttpOnly`; solo se persiste su hash. Los intentos no aceptan identidad del cliente.
- Estados: `pending`, `in_progress`, `completed`, `need_more`; número de pistas y fecha quedan asociados al intento.

## API

- `GET /api/trainer/reviews`: análisis terminados disponibles.
- `GET /api/trainer/history?reviewId=...`: historial de la sesión actual.
- `POST /api/trainer/draw`: sorteo ponderado y persistencia/recuperación del banco.
- El sorteo incluye el tamaño público del banco (1–5); si solo hay un reto, la UI lo dice claramente y deja disponible la categoría de repaso.
- `POST /api/trainer/attempts`: guarda estado y cantidad de pistas del reto actual.
- Respuestas públicas estrictas no contienen `teacherHint`, datos de Inspector ni snapshot/código fuente.

## UI

- Ruta `/student/trainer`, navegación estudiante, selector Review, sorteo, reto y tres pistas progresivas sin nueva llamada al proveedor, registro de estado e historial.
- Estilo basado en tokens actuales con estados vacíos, error y móvil.

## Aceptación

- [x] Retos anclados a evidencia verificada del SHA Review seleccionado.
- [x] Selector redistribuye categorías vacías, evita la repetición inmediata cuando hay alternativas y admite repaso.
- [x] Pistas locales; intentos e historial aislados por cookie de sesión anónima.
- [x] Trainer tiene tablas propias y su respuesta no lee ni expone retos privados de Inspector.
- [x] Tests enfocados y de regresión, typecheck, build, lint configurado y recorrido/capturas con Ego Lite.
- [x] Paquete local ignorado de máximo 20 archivos, con manifiesto y rutas válidas.
- [x] Banco variado sin duplicar funcionalidad o instrucción, reuso tras sorteo, ampliación heredada y reserva concurrente en SQLite.
- [x] Prueba live de Review sobre `VGMil-dev/fragments-test-app` y SHA exacto; gasto de prueba acotado por un ledger temporal ≤ USD 0.05.
