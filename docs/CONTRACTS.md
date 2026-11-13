# Contratos que planner fija antes de 6 workers

1. Request/Response DTO compartidos `packages/contracts/src/index.ts` versionados con Zod; no tipos duplicados.
2. `ApiResult<T> = {ok:true,data:T}|{ok:false,error:{code:string,message:string}}`.
3. `FeedbackFinding = {criterionId,status:'verified'|'not_verified'|'failed',evidence:EvidenceReference[],file?:string,lines?:[number,number],reason:string,guidanceLevel:1|2|3|4}`. Every finding needs at least one source reference. `EvidenceReference` points either to a repository path+line range or a proposal field and includes a SHA-256 digest of the source snapshot.
4. `RepositorySnapshot = {owner,repo,commitSha,files: Array<{path,content,sha}>,digest}`; no raw fetch URLs enviados por usuarios.
5. `AiAnalysis = {rubricVersion,score,findings,limitations,modelId,inputDigest}`; IA sin autoridad para establecer calificación final.
6. The student-facing `InspectorChallenge` contains `{evaluationId,sourceEvidence,precondition,mutation,demonstration,restoration,estimatedMinutes}`. The private teacher variant adds `teacherHint`; serialize and validate student responses with the public schema so the hint is rejected if present.
7. Inspector teacher routes use `InspectorChallengeRecordResponseSchema` for private state, `InspectorDefenseRecordRequestSchema` for mutation/restoration notes (strict, maximum 2000 characters), and `InspectorStudentChallengeResponseSchema` for public assigned challenges. Assignment accepts only an empty strict object. The API verifies a teacher session before reading or changing private challenge records.
7. `SubmissionSnapshot = {kind:'mentor'|'review',sourceId,score,snapshotJson,contentHash,verificationCode,rubricVersion,createdAt}`. No almacenar PDFs ni README.
8. Idempotencia por `(projectId,commitSha,rubricVersion,evaluatorVersion)`; Mentor por JSON canónico+rúbrica.
9. Provider drivers (`AiProvider`, `RepoDriver`, `PackerDriver`, `PdfRenderer`, `EvaluationRepository`) con fake in-memory para pruebas; no API framework coupling en dominio.
10. Prohibido modificar packages/contracts tras congelar interfaz sin aprobación y actualización de consumidores. Evitar complejidad incidental: un solo API+worker desde misma app, una SQLite y no redis.

## DTOs para F02/F04/F05

Estos DTOs son parte del contrato versionado de `@fragments/contracts` y se envuelven en `ApiResult<T>` en respuestas HTTP:

- `GET /api/gallery` responde páginas autenticadas `AcademicGalleryPage` de proyectos evaluados con contexto versionado; `GET /api/gallery/:projectId` responde el detalle y sus revisiones elegibles.
- `POST /api/proposals` acepta `CreateProposalRequest`; editar usa `PUT /api/proposals/:id` con `UpdateProposalRequest` (borrador completo y `expectedVersion`) y responde `ProposalResponse` con versión incrementada. Una versión obsoleta devuelve `VERSION_CONFLICT`.
- La publicación no tiene opt-in del estudiante: una evaluación persistida y versionada publica la revisión automáticamente. La ruta antigua `/api/proposals/:id/gallery-opt-in` responde `410 PUBLICATION_AUTOMATIC`.
- Crear, editar, evaluar, recuperar evaluación y generar entrega Mentor requieren sesión GitHub; el servidor deriva el propietario de la sesión. Evaluaciones y coincidencias usan `ProposalEvaluationResponse` y apuntan a proyectos elegibles sin revelar nota o datos privados.
- `POST /api/reviews` acepta `ReviewRequest` con `owner`, `repo` y SHA exacto; se rechazan URLs arbitrarias. La creación devuelve `ReviewQueuedResponse`; consulta devuelve `ReviewResponse` discriminada por estado y nunca expone trazas internas.
- Las solicitudes de entrega usan `CreateMentorSubmissionRequest` y `CreateReviewSubmissionRequest`; sus respuestas `MentorSubmissionResponse` y `ReviewSubmissionResponse` incluyen un `id` de servidor junto al `SubmissionSnapshot` inmutable. Usa el `id` para descargar artefactos; `verificationCode` solo sirve para verificación.
- Las descargas de README y PDF devuelven respectivamente `text/markdown` y `application/pdf` sin envoltura JSON; errores y respuestas de API normales usan `ApiResult<T>`.
- La verificación pública usa `VerifySubmissionResponse`, un resumen mínimo de integridad, rúbrica, nota y fecha; no incluye nombre ni datos privados.
- Better Auth expone acceso por email/contraseña docente, `POST /api/auth/sign-in/social` con GitHub estudiantil, `POST /api/auth/sign-out` y `GET /api/auth/get-session`; las sesiones usan cookies HttpOnly. La identidad docente procede del usuario SQLite (`isTeacher`) o del rol `admin`; la propiedad del estudiante usa la cuenta vinculada `providerId=github` + `accountId`. El acceso estudiantil por email no autentica rutas académicas.

## DTOs y permisos F15

- `POST /api/auth/sign-in/social` acepta `provider: "github"` para estudiantes. La ruta de contraseña sigue reservada al acceso docente y no hay formulario de registro estudiantil por email.
- `/api/me` devuelve una identidad GitHub pública mínima o un estado de acceso con motivo seguro (`session_required`, `role_not_student`, `github_account_not_linked`, `invalid_github_identity`). La autorización estudiantil se basa en la sesión y `accountId` estable de GitHub; el correo y `githubLogin` no son claves de identidad. `githubLogin` y `profileUrl` pueden ser nulos en el perfil para que un nombre público ausente no bloquee el acceso. `GET /api/me/proposals` y las rutas Mentor requieren sesión GitHub.
- `/api/proposals` y las rutas de edición/evaluación no aceptan propietario ni campos de publicación. El API asigna `owner_user_id` desde la sesión.
- `GET /api/gallery?offset=&limit=` y `GET /api/gallery/:projectId` requieren sesión GitHub. Responden `AcademicGalleryPage`/`AcademicGalleryDetail`, con autoría GitHub y contexto/rúbrica originales; nunca exponen nota ni datos privados.
- Una evaluación Mentor persistida solo crea una publicación cuando coinciden revisión, digest, evaluación y versión publicada de configuración. La publicación es automática y única por proyecto/revisión; una revisión nueva no sustituye una anterior elegible hasta completar su evaluación.
- `POST /api/me/proposals/:id/claim` requiere sesión GitHub y la cookie anónima original. Es de una sola vez y no se ejecuta por coincidencia de correo, título o login.
- `/api/teacher/students*`, `/api/teacher/historical-projects` y `POST /api/teacher/projects/:id/withdraw` comprueban rol docente en cada petición. La retirada conserva el proyecto y registra motivo y docente.
- Better Auth enlaza `providerId = github` y `accountId`. Solo se solicitan `read:user` y `user:email`; `isTeacher`, rol y titularidad no son campos de entrada del cliente. La vinculación implícita por correo está deshabilitada.
