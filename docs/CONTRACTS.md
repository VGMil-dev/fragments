# Contratos que planner fija antes de 6 workers

1. Request/Response DTO compartidos `packages/contracts/src/index.ts` versionados con Zod; no tipos duplicados.
2. `ApiResult<T> = {ok:true,data:T}|{ok:false,error:{code:string,message:string}}`.
3. `FeedbackFinding = {criterionId,status:'verified'|'not_verified'|'failed',evidence:EvidenceReference[],file?:string,lines?:[number,number],reason:string,guidanceLevel:1|2|3|4}`. Every finding needs at least one source reference. `EvidenceReference` points either to a repository path+line range or a proposal field and includes a SHA-256 digest of the source snapshot.
4. `RepositorySnapshot = {owner,repo,commitSha,files: Array<{path,content,sha}>,digest}`; no raw fetch URLs enviados por usuarios.
5. `AiAnalysis = {rubricVersion,score,findings,limitations,modelId,inputDigest}`; IA sin autoridad para establecer calificación final.
6. The student-facing `InspectorChallenge` contains `{evaluationId,sourceEvidence,precondition,mutation,demonstration,restoration,estimatedMinutes}`. The private teacher variant adds `teacherHint`; serialize and validate student responses with the public schema so the hint is rejected if present.
7. `SubmissionSnapshot = {kind:'mentor'|'review',sourceId,score,snapshotJson,contentHash,verificationCode,rubricVersion,createdAt}`. No almacenar PDFs ni README.
8. Idempotencia por `(projectId,commitSha,rubricVersion,evaluatorVersion)`; Mentor por JSON canónico+rúbrica.
9. Provider drivers (`AiProvider`, `RepoDriver`, `PackerDriver`, `PdfRenderer`, `EvaluationRepository`) con fake in-memory para pruebas; no API framework coupling en dominio.
10. Prohibido modificar packages/contracts tras congelar interfaz sin aprobación y actualización de consumidores. Evitar complejidad incidental: un solo API+worker desde misma app, una SQLite y no redis.

## DTOs para F02/F04/F05

Estos DTOs son parte del contrato versionado de `@fragments/contracts` y se envuelven en `ApiResult<T>` en respuestas HTTP:

- `GET /api/gallery` responde `GalleryResponse`: tarjetas públicas opt-in con id, título, resumen, habilidades, etiquetas y duración estimada. No acepta identidad de alumno ni datos de repositorio.
- `POST /api/proposals` acepta `CreateProposalRequest`; editar usa `PUT /api/proposals/:id` con `UpdateProposalRequest` (borrador completo y `expectedVersion`) y responde `ProposalResponse` con versión incrementada. Una versión obsoleta devuelve `VERSION_CONFLICT`.
- Publicar u ocultar un borrador en la galería usa `POST /api/proposals/:id/gallery` con `GalleryOptInRequest`. Editar, cambiar el opt-in, evaluar y generar una entrega requieren la cookie de propiedad opaca `HttpOnly` emitida al crear la propuesta; el token no aparece en DTOs públicos ni en tarjetas.
- Evaluaciones y coincidencias usan `ProposalEvaluationResponse`: cada coincidencia apunta a un `galleryId` opt-in y explica el solapamiento sin revelar identidad o nota de otro proyecto.
- `POST /api/reviews` acepta `ReviewRequest` con `owner`, `repo` y SHA exacto; se rechazan URLs arbitrarias. La creación devuelve `ReviewQueuedResponse`; consulta devuelve `ReviewResponse` discriminada por estado y nunca expone trazas internas.
- Las solicitudes de entrega usan `CreateMentorSubmissionRequest` y `CreateReviewSubmissionRequest`; sus respuestas `MentorSubmissionResponse` y `ReviewSubmissionResponse` incluyen un `id` de servidor junto al `SubmissionSnapshot` inmutable. Usa el `id` para descargar artefactos; `verificationCode` solo sirve para verificación.
- Las descargas de README y PDF devuelven respectivamente `text/markdown` y `application/pdf` sin envoltura JSON; errores y respuestas de API normales usan `ApiResult<T>`.
- La verificación pública usa `VerifySubmissionResponse`, un resumen mínimo de integridad, rúbrica, nota y fecha; no incluye nombre ni datos privados.
