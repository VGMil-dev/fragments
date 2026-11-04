import { useState, type FormEvent } from "react";
import type {
  ApiResult,
  CreateReviewSubmissionRequest,
  EvidenceReference,
  ReviewRequest,
  ReviewResponse,
  ReviewSubmissionResponse,
} from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { SubmissionDownloads } from "../submissions/submission-downloads";
import { validateReviewRequest, type ReviewFields } from "./review-validation";
import "./review-screen.css";

export interface ReviewScreenProps {
  initialReview?: AsyncState<ReviewResponse>;
  onQueue: (request: ReviewRequest) => Promise<ApiResult<ReviewResponse>>;
  onRefresh: (reviewId: string) => Promise<ApiResult<ReviewResponse>>;
  onGenerateSubmission: (request: CreateReviewSubmissionRequest) => Promise<ApiResult<ReviewSubmissionResponse>>;
  onPdf: (submissionId: string) => Promise<ApiResult<Blob>>;
  onBack: () => void;
  mode?: DataMode;
}

const EMPTY_FIELDS: ReviewFields = { owner: "", repo: "", commitSha: "" };

function evidenceLabel(evidence: EvidenceReference): string {
  return evidence.source === "repository"
    ? `${evidence.path}:${evidence.lines[0]}–${evidence.lines[1]}`
    : `Campo: ${evidence.field}`;
}

export function ReviewScreen({ initialReview, onQueue, onRefresh, onGenerateSubmission, onPdf, onBack, mode = "real" }: ReviewScreenProps) {
  const initialData = initialReview?.status === "success" ? initialReview.data : undefined;
  const [fields, setFields] = useState<ReviewFields>(() => initialData
    ? { owner: initialData.owner, repo: initialData.repo, commitSha: initialData.commitSha }
    : EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReviewFields, string>>>({});
  const [reviewState, setReviewState] = useState<AsyncState<ReviewResponse> | null>(initialReview ?? null);
  const [submission, setSubmission] = useState<AsyncState<ReviewSubmissionResponse> | null>(null);

  function updateField(field: keyof ReviewFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setReviewState(null);
    setSubmission(null);
  }

  async function queueReview(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const validated = validateReviewRequest(fields);
    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors);
      return;
    }

    setFieldErrors({});
    setReviewState({ status: "loading" });
    setSubmission(null);
    try {
      const result = await onQueue(validated.data);
      setReviewState(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void queueReview() });
    } catch {
      setReviewState({ status: "error", retry: () => void queueReview() });
    }
  }

  async function refreshReview(reviewId: string) {
    setReviewState({ status: "loading" });
    try {
      const result = await onRefresh(reviewId);
      setReviewState(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void refreshReview(reviewId) });
    } catch {
      setReviewState({ status: "error", retry: () => void refreshReview(reviewId) });
    }
  }

  async function generateSubmission(reviewId: string) {
    setSubmission({ status: "loading" });
    try {
      const result = await onGenerateSubmission({ reviewId });
      setSubmission(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void generateSubmission(reviewId) });
    } catch {
      setSubmission({ status: "error", retry: () => void generateSubmission(reviewId) });
    }
  }

  const currentReview = reviewState?.status === "success" ? reviewState.data : undefined;
  const reviewIsBusy = reviewState?.status === "loading";

  return (
    <main className="student-screen review-screen" aria-labelledby="review-title">
      <header className="student-screen__header">
        <div>
          <button className="review-screen__back" type="button" onClick={onBack}>← Volver a Mentor</button>
          <p className="student-screen__eyebrow">REVIEW · COMMIT</p>
          <h1 id="review-title">Revisa un commit</h1>
          <p className="student-screen__lead">Elige el repositorio y el commit exacto que quieres entender mejor.</p>
        </div>
        <DataSourceBadge mode={mode} {...(currentReview?.status === "completed" ? { modelId: currentReview.analysis.modelId } : {})} />
      </header>

      <form className="review-form" onSubmit={(event) => void queueReview(event)} noValidate>
        <label className="review-field">
          <span>Usuario u organización</span>
          <input autoComplete="off" value={fields.owner} maxLength={39} disabled={reviewIsBusy} onChange={(event) => updateField("owner", event.target.value)} aria-invalid={Boolean(fieldErrors.owner)} aria-describedby={fieldErrors.owner ? "review-owner-error" : undefined} />
          {fieldErrors.owner ? <small id="review-owner-error" role="alert">{fieldErrors.owner}</small> : null}
        </label>
        <label className="review-field">
          <span>Nombre del repositorio</span>
          <input autoComplete="off" value={fields.repo} maxLength={100} disabled={reviewIsBusy} onChange={(event) => updateField("repo", event.target.value)} aria-invalid={Boolean(fieldErrors.repo)} aria-describedby={fieldErrors.repo ? "review-repo-error" : undefined} />
          {fieldErrors.repo ? <small id="review-repo-error" role="alert">{fieldErrors.repo}</small> : null}
        </label>
        <label className="review-field review-field--wide">
          <span>SHA del commit</span>
          <input autoComplete="off" spellCheck={false} value={fields.commitSha} maxLength={64} disabled={reviewIsBusy} onChange={(event) => updateField("commitSha", event.target.value)} aria-invalid={Boolean(fieldErrors.commitSha)} aria-describedby={fieldErrors.commitSha ? "review-sha-help review-sha-error" : "review-sha-help"} />
          <small id="review-sha-help">Pega el identificador completo del commit, de 40 o 64 caracteres hexadecimales.</small>
          {fieldErrors.commitSha ? <small id="review-sha-error" role="alert">{fieldErrors.commitSha}</small> : null}
        </label>
        <div className="review-form__footer">
          <p>La revisión se vincula al commit que elegiste.</p>
          <button className="button button--primary" type="submit" disabled={reviewIsBusy}>
            {reviewIsBusy ? "Enviando commit…" : "Evaluar commit"}
          </button>
        </div>
      </form>

      <section className="review-result" aria-labelledby="review-result-title">
        <div className="review-result__heading">
          <div>
            <p className="student-screen__eyebrow">ESTADO Y ORIENTACIÓN</p>
            <h2 id="review-result-title">Tu revisión</h2>
          </div>
          {currentReview && (currentReview.status === "queued" || currentReview.status === "running") ? (
            <button className="button button--light" type="button" disabled={reviewIsBusy} onClick={() => void refreshReview(currentReview.id)}>Actualizar estado</button>
          ) : null}
        </div>
        {!reviewState ? <p className="review-screen__hint">Envía un commit para ver el estado de su revisión.</p> : null}
        {reviewState?.status === "loading" ? <AsyncStateView state={reviewState} render={() => null} /> : null}
        {reviewState?.status === "error" ? <AsyncStateView state={reviewState} render={() => null} /> : null}
        {currentReview?.status === "queued" ? (
          <div className="review-progress" role="status" aria-live="polite">
            <h3>Tu commit está en la cola</h3>
            <p>La revisión comenzará cuando haya espacio. Puedes actualizar el estado en un momento.</p>
            {currentReview.progress !== undefined ? <progress max={100} value={currentReview.progress} aria-label="Avance de la revisión" /> : null}
          </div>
        ) : null}
        {currentReview?.status === "running" ? (
          <div className="review-progress" role="status" aria-live="polite">
            <h3>Estamos revisando este commit</h3>
            <p>Cuando termine, aquí verás los hallazgos devueltos por la revisión.</p>
            <progress max={100} value={currentReview.progress} aria-label="Avance de la revisión" />
          </div>
        ) : null}
        {currentReview?.status === "failed" ? (
          <div className="review-failed" role="alert">
            <h3>No se pudo completar este análisis</h3>
            <p>Revisa el commit e inténtalo de nuevo.</p>
            <button className="button button--light" type="button" onClick={() => void queueReview()}>Intentar de nuevo</button>
          </div>
        ) : null}
        {currentReview?.status === "completed" ? (
          <div className="review-analysis">
            <div className="review-analysis__summary">
              <div>
                <h3>Orientación para este commit</h3>
                <p><code>{currentReview.owner}/{currentReview.repo}@{currentReview.commitSha}</code></p>
              </div>
              <p className="review-analysis__score">{currentReview.analysis.score}/100</p>
            </div>
            {currentReview.analysis.findings.length ? (
              <ul className="review-findings">
                {currentReview.analysis.findings.map((finding, index) => (
                  <li key={`${finding.criterionId}-${index}`}>
                    <p className="review-finding__status">{finding.status === "verified" ? "Verificado" : finding.status === "not_verified" ? "Aún no verificado" : "Necesita revisión"}</p>
                    <p>{finding.reason}</p>
                    <ul>{finding.evidence.map((item, evidenceIndex) => <li key={`${finding.criterionId}-${evidenceIndex}`}>{evidenceLabel(item)}</li>)}</ul>
                  </li>
                ))}
              </ul>
            ) : null}
            {currentReview.analysis.limitations.length ? <p className="review-screen__hint">Límites de esta orientación: {currentReview.analysis.limitations.join(" ")}</p> : null}
            <button className="button button--primary" type="button" disabled={submission?.status === "loading"} onClick={() => void generateSubmission(currentReview.id)}>
              {submission?.status === "loading" ? "Preparando entrega…" : "Generar entrega"}
            </button>
          </div>
        ) : null}
      </section>

      {submission?.status === "success" ? (
        <SubmissionDownloads submission={submission.data} onPdf={onPdf} />
      ) : submission ? (
        <AsyncStateView state={submission} render={() => null} />
      ) : null}
    </main>
  );
}
