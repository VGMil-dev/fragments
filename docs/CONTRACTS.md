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
