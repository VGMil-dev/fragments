# F15 — Especificación

## Entradas

- Sesión Better Auth autenticada por GitHub para rutas estudiantiles.
- Sesión Better Auth con `isTeacher` o rol `admin` para rutas docentes.
- Cookie `fragments_proposal_owner` solo como prueba de propiedad histórica durante el reclamo explícito.
- Solicitudes Mentor existentes, sin campos de propiedad ni publicación suministrados por cliente.

## Salidas

- `/api/me` informa identidad pública GitHub mínima y fecha de registro; `/api/me/proposals` lista solo las propuestas propias.
- `/api/gallery` devuelve páginas de versiones académicas publicadas, con perfil público GitHub, consigna/contexto y rúbrica históricos, sin nota ni datos privados.
- `/api/gallery/:id` devuelve detalle histórico elegible y valida que revisión, evaluación y contexto correspondan.
- `/api/teacher/students` pagina estudiantes con GitHub; `/api/teacher/students/:userId/projects` da revisiones y estado académico; `/api/teacher/historical-projects` separa registros sin autor acreditado.
- Retirada docente guarda un motivo y conserva el registro interno.
- Crear, editar, evaluar y consultar propuestas exige sesión estudiantil GitHub. El servidor calcula `owner_user_id`.

## Datos

- Migración SQLite secuencial e idempotente para titularidad GitHub, perfil GitHub, publicaciones/versiones académicas y auditoría de retirada.
- Reutilizar `proposal_revisions`, `mentor_evaluations` y `mentor_control_versions`; no guardar copias de documentos de configuración.
- Publicación automática y evaluación persistida comparten transacción e idempotencia por propuesta/revisión.
- Un cambio de revisión no oculta la última versión elegible hasta que se evalúe la nueva.
- Propuestas existentes permanecen anónimas, no publicadas y reclamables una sola vez con cookie válida.

## UI

- Entrada estudiantil solo con GitHub; no ofrecer registro o acceso estudiantil por email/contraseña.
- Explicar antes de enviar que un proyecto evaluado y elegible se comparte con estudiantes autenticados y docentes.
- Galería y detalle accesibles y adaptables; no mostrar notas, comentarios privados ni datos de Trainer.
- Superficie docente muestra estudiantes, proyectos/revisiones y registros históricos no reclamados por separado.

## Aceptación

- Dado un visitante sin sesión, cuando crea/consulta/edita/evalúa una propuesta, responde 401 sin mutar datos.
- Dado un estudiante autenticado, cuando crea un proyecto, su ID se asigna en servidor y otro estudiante no lo puede consultar ni reclamar.
- Dada una evaluación persistida con contexto versionado, cuando termina la transacción, hay una publicación elegible única asociada a esa revisión.
- Dada una nueva revisión sin evaluación, la galería sigue usando la última revisión ya publicada.
- Dado un proyecto histórico, solo la cookie propietaria original y una sesión GitHub pueden reclamarlo; la operación no se repite ni gana carreras.
- Dado un usuario sin rol docente, cada endpoint docente responde 401/403 y no filtra datos.
- Dados datos de rúbrica histórica, se representa su configuración original; los registros sin contexto se marcan como no acreditados.
- La sesión de email/contraseña docente sigue activa y el usuario OAuth no puede elevar su rol.

## Actualización de alcance autorizada — 2026-11-12

- Se integra F15 con F13/F14 mediante merge normal y PR.
- El propietario autoriza aprobación manual por el mantenedor único, aun cuando publique la tag. Se registra la menor independencia; el bypass administrativo debe seguir desactivado.
- `v0.4.0` se publica solo si las credenciales OAuth están instaladas en configuración persistente privada y la API las consume tras el despliegue; el login real y la galería se verifican después. Si algún control falla, no crear la tag ni desplegar.

## Protocolo de aceptación del primer proyecto auténtico — 2026-11-13

- El guardado se valida sin invocar IA: propiedad derivada de la sesión, lectura del titular, lista ajena sin el proyecto, lectura/edición ajena con 404 y borrador fuera de la galería.
- Un docente autenticado puede consultar la información permitida; sesiones anónimas reciben 401 y estudiantes 403 en rutas docentes.
- La evaluación productiva queda bloqueada hasta tener consentimiento del estudiante y autorización explícita del propietario, además de comprobar presupuesto vigente.
- El procedimiento detallado y los resultados de prueba están en `task-list/F15/protocolo-aceptacion-piloto.md` y `task-list/F15/evidencie.md`.
- F15 no se completa mientras no se acredite con un proyecto auténtico la evaluación persistida y publicación automática, o no se documente que ambas siguen pendientes del piloto.

## Addendum — resultado del piloto real — 2026-11-13

El propietario autorizó una evaluación real inicial y el estudiante consintió la propuesta. Se guardó el proyecto por la UI estudiantil, se comprobó la lista propia y su persistencia, y la galería permaneció vacía antes de evaluar. Tras no poder recuperar la propuesta guardada desde la pantalla Mentor, se hizo una única solicitud al endpoint oficial autenticado de evaluación; la respuesta quedó persistida y una revisión elegible apareció en la galería. No hubo reintento. La sesión estudiantil recibió 403 en endpoints docentes. La vista del proyecto con una sesión docente auténtica y el aislamiento con una segunda cuenta no se ejecutaron. El informe completo, incluido el desvío de UI y límites, está en `task-list/F15/evidencie.md`.
