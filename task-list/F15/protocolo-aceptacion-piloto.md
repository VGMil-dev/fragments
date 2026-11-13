# F15 — Protocolo de aceptación para el primer proyecto auténtico

## Estado y límites

Este protocolo sirve para validar el primer proyecto real del piloto sin fabricar datos académicos. El login GitHub de estudiante y la separación de rol ya se comprobaron en producción `v0.4.4`; no se repiten.

La sesión productiva comprobada tenía cero propuestas propias y la galería cero publicaciones. Por eso, las comprobaciones de almacenamiento, propiedad y vista docente descritas abajo quedan preparadas para ejecutarse cuando el estudiante guarde un proyecto auténtico con conocimiento de que el docente autorizado podrá consultarlo. No crear propuestas sintéticas ni introducir información personal innecesaria.

La fase de guardado no llama al proveedor IA. No pulsar «Evaluar» ni invocar `POST /api/proposals/:id/review` durante esa fase.

## Participantes y consentimiento

- Estudiante A: titular del proyecto auténtico y de su sesión GitHub.
- Estudiante B: segunda cuenta GitHub personal autorizada para una prueba de aislamiento.
- Docente: cuenta docente autorizada para consultar el proyecto dentro de las funciones del panel.
- Antes de guardar, A revisa que el texto no incluya contraseñas, tokens, correos privados, datos sensibles ni código de repositorios privados. El estudiante confirma que está de acuerdo con almacenarlo y con la consulta del docente.
- Antes de evaluar con IA hace falta, además, consentimiento explícito de A para enviar el contenido académico al proveedor, y autorización explícita del propietario para la única evaluación productiva.

## Fase 1 — Guardar sin IA ni publicación

1. Confirmar que A usa la sesión GitHub autorizada y abrir Mentor desde Fragments. Guardar una sola vez desde la UI normal; no enviar `ownerUserId` ni ningún campo de propiedad desde el cliente.
2. Esperar la respuesta guardada y comprobar el mensaje de éxito. La referencia del proyecto se mantiene privada para la sesión de QA; no copiar título, cuerpo, usuario ni ID a logs o evidencia.
3. Consultar «Mis propuestas» (`GET /api/me/proposals`) con A. Debe aparecer su propuesta y versión.
4. Antes de IA, consultar la galería autenticada (`GET /api/gallery`) con A. La nueva propuesta no debe aparecer; el listado debe seguir con 0 publicaciones si no hay otras auténticas.
5. Confirmar que no se llamó a `/api/proposals/:id/review`, que no existe evaluación para la versión recién guardada y que el contador de llamadas al proveedor no aumentó. En producción, usar solo la UI y lecturas; no consultar SQLite ni secretos.

**Pasa si:** el guardado responde 201, la propuesta aparece solo en la lista propia de A, la galería no la muestra y no hubo evaluación.

## Fase 2 — Aislamiento de otro estudiante

1. Cerrar la sesión de A y entrar como B con su propia cuenta GitHub.
2. Consultar `GET /api/me/proposals`: el proyecto de A no debe aparecer.
3. Con la referencia temporal del proyecto, consultar únicamente `GET /api/proposals/:id/versions`; se espera 404 genérico sin título ni cuerpo. No enviar una edición válida contra el proyecto auténtico desde B: aunque se espera 404, una regresión podría modificar datos reales. La denegación de edición se verifica en el test local aislado con proveedor fake.
4. No invocar la ruta de evaluación con B. Una petición no autorizada a evaluación podría consumir presupuesto si hubiera una regresión; su rechazo previo al evaluador se cubre con la prueba automatizada local etiquetada con proveedor fake.

**Pasa si:** B no encuentra el proyecto en su lista, la historia y edición responden 404 sin contenido privado y los datos de A no cambian.

## Fase 3 — Consulta docente autorizada

1. Cerrar sesión de B y entrar con la cuenta docente que conserva `isTeacher`/rol confirmado por el servidor.
2. Consultar el roster (`GET /api/teacher/students`) y la vista del proyecto (`GET /api/teacher/students/:userId/projects`). Se espera HTTP 200 para docente y que aparezca el borrador no evaluado con `published=false`.
3. La revisión se limita a confirmar la vista y el estado de publicación. No copiar ni incluir en evidencia el contenido de la propuesta, el usuario, correo o ID.
4. Con A y B, ambas rutas docentes deben responder HTTP 403. Sin sesión deben responder HTTP 401.

**Pasa si:** solo la sesión docente autorizada puede consultar la vista docente y el borrador permanece sin publicar.

## Fase 4 — Evaluación con IA (bloqueada hasta dos autorizaciones)

Esta fase no se ejecuta por este protocolo ni se autoriza por el mero hecho de guardar el proyecto. Requiere las dos condiciones previas:

1. Consentimiento explícito del estudiante titular para procesar el proyecto auténtico con el proveedor de IA y compartir con usuarios autenticados la revisión elegible que se publicará.
2. Autorización explícita del propietario para una única evaluación productiva.

Después de recibirlas:

1. Verificar el presupuesto vigente y disponible en la fuente oficial, sin revelar claves. Registrar únicamente la comprobación de que cubre una sola evaluación y su fecha. Si no se puede verificar el saldo o el límite, detenerse.
2. Revisar que el proyecto no contenga información que no se deba enviar al proveedor y que la pantalla explique la publicación automática de una versión evaluada.
3. Activar una única evaluación desde la UI normal. No reintentar un POST por timeout, error o respuesta ambigua. En caso de duda, consultar solo `GET /api/proposals/:id/review` para recuperar un resultado ya persistido; pedir nueva autorización antes de cualquier nuevo POST.
4. Tras una evaluación exitosa, revisar en la galería de A y B que aparezca la revisión exacta evaluada y la versión histórica correcta de la rúbrica. Revisar que la ficha pública no muestre puntaje, notas, comentarios privados, correo, tokens ni información de Inspector/Trainer.
5. Verificar la misma revisión y estado académico en la vista docente. Registrar solo estados HTTP, versión y conteos, no el contenido del proyecto ni de la evaluación.

**Pasa si:** una sola evaluación queda persistida; la publicación automática apunta a esa revisión/rúbrica; A, B y el docente ven únicamente los campos autorizados; la propiedad continúa perteneciendo a A.

## Evidencia mínima

Registrar fecha, release/SHA, estados HTTP, versión y conteos; no guardar cookies, nombres, correos, IDs de proveedor, textos académicos, prompts o respuestas completas. No leer ni copiar SQLite productiva. Si cualquier respuesta revela contenido a B o publica el borrador antes de una evaluación, detener la prueba y preservar únicamente evidencia redactada sin datos personales.

## Resultados locales ya verificados

Los tests de integración con proveedores `fake` cubren: propiedad calculada en servidor, edición/historia por titular, aislamiento entre estudiantes, galería vacía antes de evaluación, publicación de una revisión evaluada, historial/versionado de rúbrica y rol docente. Estos tests no sustituyen la fase real del proyecto piloto.
