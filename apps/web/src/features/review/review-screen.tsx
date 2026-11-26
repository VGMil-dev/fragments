import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, GitBranch, Github, Info, LoaderCircle, Search } from "lucide-react";
import type {
  ApiResult,
  CreateReviewSubmissionRequest,
  EvidenceReference,
  MissionDeliveryHistory,
  ReviewRequest,
  ReviewResponse,
  ReviewSubmissionResponse,
  ProposalDraftResponse,
} from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { SubmissionDownloads } from "../submissions/submission-downloads";
import { validateReviewRequest, type ReviewFields } from "./review-validation";
import { parseCommitReference, parsePublicGitHubRepository, repositoryLookupError, type ReviewCommitOption, type ReviewRepository, type ReviewRepositoryLookup } from "./repository-selection";
import repositoryArtwork from "./assets/review-repositorio.webp";
import commitArtwork from "./assets/review-commit.webp";
import confirmationArtwork from "./assets/review-confirmacion.webp";
import "./review-screen.css";

export interface ReviewScreenProps {
  initialReview?: AsyncState<ReviewResponse>;
  onQueue: (request: ReviewRequest) => Promise<ApiResult<ReviewResponse>>;
  onRetry: (reviewId: string) => Promise<ApiResult<ReviewResponse>>;
  onRefresh: (reviewId: string) => Promise<ApiResult<ReviewResponse>>;
  onGenerateSubmission: (request: CreateReviewSubmissionRequest) => Promise<ApiResult<ReviewSubmissionResponse>>;
  onPdf: (submissionId: string) => Promise<ApiResult<Blob>>;
  onBack: () => void;
  onOpenTrainer?: (reviewId?: string) => void;
  mode?: DataMode;
  linkedProposals?: ProposalDraftResponse[];
  initialProposalId?: string;
  onLoadDeliveryHistory?: (proposalId: string) => Promise<ApiResult<MissionDeliveryHistory>>;
  repositoryLookup?: ReviewRepositoryLookup;
}

const EMPTY_FIELDS: ReviewFields = { owner: "", repo: "", commitSha: "" };

function evidenceLabel(evidence: EvidenceReference): string {
  return evidence.source === "repository"
    ? `${evidence.path}:${evidence.lines[0]}–${evidence.lines[1]}`
    : `Campo: ${evidence.field}`;
}

function formatCommitDate(value: string | null): string {
  if (!value) return "Fecha no disponible";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" }).format(timestamp);
}

export function ReviewScreen({ initialReview, onQueue, onRetry, onRefresh, onGenerateSubmission, onPdf, onBack, onOpenTrainer, mode = "real", linkedProposals = [], initialProposalId = "", onLoadDeliveryHistory, repositoryLookup }: ReviewScreenProps) {
  const initialData = initialReview?.status === "success" ? initialReview.data : undefined;
  const [fields, setFields] = useState<ReviewFields>(() => initialData
    ? { owner: initialData.owner, repo: initialData.repo, commitSha: initialData.commitSha }
    : EMPTY_FIELDS);
  const [reviewState, setReviewState] = useState<AsyncState<ReviewResponse> | null>(initialReview ?? null);
  const [submission, setSubmission] = useState<AsyncState<ReviewSubmissionResponse> | null>(null);
  const [linkedProposalId, setLinkedProposalId] = useState(initialProposalId);
  const [deliveryHistory, setDeliveryHistory] = useState<{ status: "idle" | "loading" | "error" | "success"; data?: MissionDeliveryHistory }>({ status: "idle" });
  const [stage, setStage] = useState<0 | 1 | 2>(initialData ? 2 : 0);
  const [repositoryUrl, setRepositoryUrl] = useState(() => initialData ? `https://github.com/${initialData.owner}/${initialData.repo}` : "");
  const [repository, setRepository] = useState<ReviewRepository | null>(() => initialData ? { owner: initialData.owner, repo: initialData.repo, visibility: "public", defaultBranch: "" } : null);
  const [commits, setCommits] = useState<ReviewCommitOption[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<ReviewCommitOption | null>(() => initialData ? { sha: initialData.commitSha, message: "", author: "", committedAt: null } : null);
  const [manualReference, setManualReference] = useState("");
  const [selectionStatus, setSelectionStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [commitMode, setCommitMode] = useState<"recent" | "manual">("recent");
  const lookupRequestId = useRef(0);
  const deliveryRequestKey = useRef("");
  const linkedProposal = linkedProposals.find((proposal) => proposal.id === linkedProposalId);
  const nextDeliveryId = deliveryHistory.status === "success" ? deliveryHistory.data?.nextDeliverableId : null;
  const hasDeliveryPlan = Boolean(deliveryHistory.status === "success" && deliveryHistory.data?.deliveries.length);

  function clearRepositorySelection() {
    lookupRequestId.current += 1;
    setRepository(null);
    setCommits([]);
    setSelectedCommit(null);
    setFields(EMPTY_FIELDS);
    setStage(0);
    setSelectionStatus(null);
    setSelectionBusy(false);
    setReviewState(null);
    setSubmission(null);
  }

  async function detectRepository(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const parsed = parsePublicGitHubRepository(repositoryUrl);
    if (!parsed) {
      setSelectionStatus({ kind: "error", message: "Introduce la URL https://github.com/usuario/repositorio de un repositorio público." });
      return;
    }
    if (!repositoryLookup) {
      setSelectionStatus({ kind: "error", message: "No pudimos conectar con la verificación segura de Fragments. Inténtalo más tarde." });
      return;
    }
    const requestId = ++lookupRequestId.current;
    const controller = new AbortController();
    setSelectionBusy(true);
    setSelectionStatus(null);
    setRepository(null);
    setCommits([]);
    setSelectedCommit(null);
    setFields(EMPTY_FIELDS);
    setReviewState(null);
    setSubmission(null);
    try {
      const result = await repositoryLookup.detectRepository(parsed, controller.signal);
      if (requestId !== lookupRequestId.current) return;
      if (!result.ok) throw new Error(repositoryLookupError(result.error.code));
      const found = result.data;
      setRepository(found);
      setFields({ owner: found.owner, repo: found.repo, commitSha: "" });
      setRepositoryUrl(`https://github.com/${found.owner}/${found.repo}`);
      setSelectionStatus({ kind: "success", message: "Repositorio público verificado." });
      try {
        const commitsResult = await repositoryLookup.listCommits({ owner: found.owner, repo: found.repo, branch: found.defaultBranch, limit: 10 }, controller.signal);
        if (requestId !== lookupRequestId.current) return;
        if (!commitsResult.ok) setSelectionStatus({ kind: "error", message: repositoryLookupError(commitsResult.error.code) });
        else setCommits(commitsResult.data.slice(0, 10));
      } catch {
        if (requestId !== lookupRequestId.current) return;
        setSelectionStatus({ kind: "error", message: "El repositorio está verificado, pero no pudimos cargar sus commits. Reintenta o introduce un SHA manualmente." });
      }
    } catch (error) {
      if (requestId !== lookupRequestId.current) return;
      setRepository(null);
      setCommits([]);
      const message = error instanceof Error ? error.message : "";
      const knownFailure = ["No encontramos", "Este repositorio", "GitHub ha"].some((prefix) => message.startsWith(prefix));
      setSelectionStatus({ kind: "error", message: knownFailure ? message : "No pudimos verificar el repositorio y sus commits. Puedes volver a intentarlo." });
    } finally {
      if (requestId === lookupRequestId.current) setSelectionBusy(false);
    }
  }

  function selectCommit(commit: ReviewCommitOption) {
    setSelectedCommit(commit);
    setFields((current) => ({ ...current, commitSha: commit.sha }));
    setSelectionStatus(null);
  }

  async function verifyManualCommit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!repository || !repositoryLookup) {
      setSelectionStatus({ kind: "error", message: "Verifica primero un repositorio público." });
      return;
    }
    const sha = parseCommitReference(manualReference, repository);
    if (!sha) {
      setSelectionStatus({ kind: "error", message: "Introduce un SHA completo de 40 caracteres o un enlace GitHub al commit de este repositorio." });
      return;
    }
    const requestId = ++lookupRequestId.current;
    setSelectionBusy(true);
    setSelectionStatus(null);
    try {
      const result = await repositoryLookup.resolveCommit({ owner: repository.owner, repo: repository.repo, commitSha: sha });
      if (requestId !== lookupRequestId.current) return;
      if (!result.ok) {
        setSelectionStatus({ kind: "error", message: repositoryLookupError(result.error.code) });
        return;
      }
      if (result.data.sha.toLowerCase() !== sha) {
        setSelectionStatus({ kind: "error", message: "El SHA devuelto no coincide con el commit solicitado." });
        return;
      }
      selectCommit(result.data);
      setSelectionStatus({ kind: "success", message: "SHA verificado en el repositorio seleccionado." });
    } catch {
      if (requestId === lookupRequestId.current) setSelectionStatus({ kind: "error", message: "No pudimos verificar el commit. Comprueba la conexión e inténtalo de nuevo." });
    } finally {
      if (requestId === lookupRequestId.current) setSelectionBusy(false);
    }
  }

  async function queueReview(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (stage !== 2 || !repository || !selectedCommit || fields.commitSha !== selectedCommit.sha) return;
    const validated = validateReviewRequest(fields);
    if (!validated.ok) {
      setSelectionStatus({ kind: "error", message: "Selecciona un repositorio y un commit verificados antes de iniciar Review." });
      return;
    }

    setSelectionStatus(null);
    setReviewState({ status: "loading" });
    setSubmission(null);
    try {
      const result = await onQueue({ ...validated.data, ...(linkedProposal ? { linkedProposalId: linkedProposal.id } : {}), ...(hasDeliveryPlan && nextDeliveryId ? { assignmentDeliverableId: nextDeliveryId } : {}) });
      setReviewState(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void queueReview() });
    } catch {
      setReviewState({ status: "error", retry: () => void queueReview() });
    }
  }

  const loadDeliveryHistory = useCallback(async (proposalId: string) => {
    deliveryRequestKey.current = proposalId;
    setLinkedProposalId(proposalId);
    setReviewState(null);
    setSubmission(null);
    if (!proposalId || !onLoadDeliveryHistory) { setDeliveryHistory({ status: "idle" }); return; }
    setDeliveryHistory({ status: "loading" });
    try {
      const result = await onLoadDeliveryHistory(proposalId);
      if (deliveryRequestKey.current !== proposalId) return;
      if (!result.ok) {
        setDeliveryHistory({ status: "error" });
        return;
      }
      setDeliveryHistory({ status: "success", data: result.data });
      const attempts = result.data.deliveries.flatMap((delivery) => delivery.attempts);
      const latestAttempt = attempts.reduce<(typeof attempts)[number] | undefined>(
        (latest, attempt) => !latest || attempt.updatedAt > latest.updatedAt ? attempt : latest,
        undefined,
      );
      if (latestAttempt) {
        setReviewState({ status: "loading" });
        try {
          const recovered = await onRefresh(latestAttempt.reviewId);
          if (deliveryRequestKey.current !== proposalId) return;
          setReviewState(recovered.ok
            ? { status: "success", data: recovered.data }
            : { status: "error", retry: () => void refreshReview(latestAttempt.reviewId) });
        } catch {
          if (deliveryRequestKey.current === proposalId) {
            setReviewState({ status: "error", retry: () => void refreshReview(latestAttempt.reviewId) });
          }
        }
      }
    } catch { if (deliveryRequestKey.current === proposalId) setDeliveryHistory({ status: "error" }); }
  }, [onLoadDeliveryHistory, onRefresh]);

  useEffect(() => {
    if (initialProposalId && onLoadDeliveryHistory) void loadDeliveryHistory(initialProposalId);
  }, [initialProposalId, onLoadDeliveryHistory, loadDeliveryHistory]);

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

  async function retryReview(reviewId: string) {
    setReviewState({ status: "loading" });
    setSubmission(null);
    try {
      const result = await onRetry(reviewId);
      setReviewState(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void retryReview(reviewId) });
    } catch {
      setReviewState({ status: "error", retry: () => void retryReview(reviewId) });
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
      <header className="student-screen__header review-screen__page-header">
        <div>
          <button className="review-screen__back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" size={17} /> Volver a Mentor</button>
          <div className="review-screen__identity">
            <p className="student-screen__eyebrow">REVIEW <span aria-hidden="true">/</span> COMMIT</p>
          </div>
          <h1 id="review-title">Revisión de código</h1>
          <p className="student-screen__lead">Elige un repositorio y un commit para recibir orientación sobre tu proyecto.</p>
        </div>
        <DataSourceBadge mode={mode} {...(currentReview?.status === "completed" ? { modelId: currentReview.analysis.modelId } : {})} />
      </header>

      <section className="review-wizard" aria-label="Preparar Review">
        <nav className="review-stepper" aria-label="Etapas de Review">
          {(["Repositorio", "Commit", "Confirmación"] as const).map((label, index) => {
            const step = index as 0 | 1 | 2;
            const complete = stage > step || (step === 1 && Boolean(selectedCommit));
            const allowed = step === 0 || Boolean(repository) && (step === 1 || Boolean(selectedCommit));
            return <button key={label} type="button" className={`review-stepper__item${stage === step ? " is-current" : ""}${complete ? " is-complete" : ""}`} aria-current={stage === step ? "step" : undefined} disabled={!allowed || selectionBusy || reviewIsBusy} onClick={() => setStage(step)}>
              <span className="review-stepper__number">{complete ? <Check aria-hidden="true" size={15} /> : String(index + 1).padStart(2, "0")}</span>
              <span className="review-stepper__label">{label}</span>
            </button>;
          })}
        </nav>

        <form className="review-form review-wizard__form" onSubmit={(event) => stage === 0 ? void detectRepository(event) : stage === 1 ? void verifyManualCommit(event) : void queueReview(event)} noValidate>
          <div className="review-stage" aria-live="polite">
            <div className="review-stage__art"><img src={stage === 0 ? repositoryArtwork : stage === 1 ? commitArtwork : confirmationArtwork} alt="" aria-hidden="true" /></div>
            <div className="review-stage__content">
              <div className="review-stage__heading">
                <span className="review-stage__number">0{stage + 1}</span>
                <div><h2>{stage === 0 ? "Selecciona un repositorio" : stage === 1 ? "Elige el commit" : "Confirma tu selección"}</h2>
                  <p>{stage === 0 ? "Introduce el enlace de un repositorio público de GitHub." : stage === 1 ? "Elige una versión concreta de tu proyecto para revisar." : "Comprueba los datos antes de iniciar Review."}</p></div>
              </div>

              {stage === 0 ? <>
                <label className="review-field review-field--wide">
                  <span>URL del repositorio</span>
                  <span className="review-repo-input"><Github aria-hidden="true" size={19} /><input aria-label="URL del repositorio" type="url" inputMode="url" autoComplete="url" placeholder="https://github.com/usuario/repositorio" value={repositoryUrl} disabled={selectionBusy} onChange={(event) => { setRepositoryUrl(event.target.value); clearRepositorySelection(); }} /></span>
                </label>
                {repository ? <div className="review-repository-card" role="status"><Github aria-hidden="true" size={22} /><div><strong>{repository.owner}/{repository.repo}</strong><small>Repositorio público · rama predeterminada {repository.defaultBranch}</small></div></div> : null}
                <p className="review-stage__hint">La comprobación consulta el backend de Fragments. Elegir un repositorio no inicia una evaluación.</p>
                <button className="review-button review-button--secondary" type="submit" disabled={selectionBusy}><Search aria-hidden="true" size={16} /> {selectionBusy ? "Verificando…" : "Detectar repositorio"}</button>
              </> : null}

              {stage === 1 ? <>
                {repository ? <div className="review-repository-strip"><Github aria-hidden="true" size={17} /><span>{repository.owner}/{repository.repo}</span><span className="review-branch"><GitBranch aria-hidden="true" size={15} /> {repository.defaultBranch}</span></div> : null}
                <div className="review-mode" role="group" aria-label="Método de selección del commit">
                  <button type="button" className={commitMode === "recent" ? "is-active" : ""} aria-pressed={commitMode === "recent"} onClick={() => { setCommitMode("recent"); setSelectionStatus(null); }}>Commits recientes</button>
                  <button type="button" className={commitMode === "manual" ? "is-active" : ""} aria-pressed={commitMode === "manual"} onClick={() => { setCommitMode("manual"); setSelectedCommit(null); setFields((current) => ({ ...current, commitSha: "" })); setSelectionStatus(null); }}>Introducir SHA</button>
                </div>
                {commitMode === "recent" ? <>
                  <div className="review-commit-heading"><strong>Últimos commits de la rama predeterminada</strong><span>{commits.length} {commits.length === 1 ? "commit" : "commits"}</span></div>
                  {commits.length ? <fieldset className="review-commit-list"><legend className="visually-hidden">Selecciona un commit</legend>{commits.map((commit, index) => <label key={commit.sha} className={`review-commit${selectedCommit?.sha === commit.sha ? " is-selected" : ""}`}>
                    <input type="radio" name="review-commit" aria-label={`${commit.message} ${commit.sha.slice(0, 7)}`} checked={selectedCommit?.sha === commit.sha} onChange={() => selectCommit(commit)} />
                    <span className="review-commit__copy"><strong>{commit.message}</strong><small>{commit.author} · {formatCommitDate(commit.committedAt)}</small></span><span className="review-commit__trailing"><code>{commit.sha.slice(0, 7)}</code>{index === 0 ? <small>Más reciente</small> : null}</span>
                  </label>)}</fieldset> : <p className="review-empty-commits" role="status">No encontramos commits en la rama predeterminada. Puedes verificar un SHA manualmente.</p>}
                </> : <>
                  <label className="review-field review-field--wide"><span>SHA completo o enlace al commit</span><input aria-label="SHA completo o enlace al commit" autoComplete="off" spellCheck={false} placeholder="40 caracteres hexadecimales" value={manualReference} disabled={selectionBusy} onChange={(event) => { setManualReference(event.target.value); setSelectedCommit(null); setFields((current) => ({ ...current, commitSha: "" })); setSelectionStatus(null); }} /><small>El backend de Fragments verificará que el commit pertenezca a este repositorio.</small></label>
                  <button className="review-button review-button--secondary" type="submit" disabled={selectionBusy || !repository}><Search aria-hidden="true" size={16} /> {selectionBusy ? "Verificando…" : "Verificar SHA"}</button>
                </>}
              </> : null}

              {stage === 2 ? <>
                <div className="review-confirmation">
                  <div><small>Repositorio</small><strong>{repository?.owner}/{repository?.repo}</strong>{repository?.defaultBranch ? <span>Rama predeterminada: {repository.defaultBranch}</span> : null}</div>
                  <div><small>Commit seleccionado</small><code>{selectedCommit?.sha}</code>{selectedCommit?.message ? <span>{selectedCommit.message}</span> : null}</div>
                </div>
                {linkedProposals.length ? <label className="review-field review-field--wide">
          <span>Vincular a una propuesta y compartir con el docente (opcional)</span>
          <select aria-label="Vincular Review a una propuesta" value={linkedProposalId} disabled={reviewIsBusy} onChange={(event) => void loadDeliveryHistory(event.target.value)}>
            <option value="">Sin vínculo académico</option>
            {linkedProposals.map((proposal) => <option key={proposal.id} value={proposal.id}>
              {(proposal.proposal.title || "Propuesta sin título")} · {proposal.assignmentContext?.mentorContext.config.theme} · Contexto Mentor v{proposal.assignmentContext?.mentorContext.version}
            </option>)}
          </select>
          {linkedProposal ? <small>Solo puedes compartir un repositorio cuyo propietario sea tu cuenta GitHub vinculada. El docente de esa aula verá el estado, la puntuación y el commit.</small> : null}
        </label> : null}
        {linkedProposal && onLoadDeliveryHistory ? <section className="review-field review-field--wide" aria-label="Entregas del proyecto">
          <h3>Entregas del proyecto</h3>
          {deliveryHistory.status === "loading" ? <p role="status">Cargando historial de esta propuesta…</p> : null}
          {deliveryHistory.status === "error" ? <p role="alert">No se pudo recuperar el historial. Vuelve a seleccionar la propuesta antes de enviar un commit.</p> : null}
          {deliveryHistory.status === "success" && hasDeliveryPlan ? <>
            <ol>{deliveryHistory.data!.deliveries.map(({ deliverable, status, attempts }) => <li key={deliverable.id}>
              <strong>{deliverable.title}</strong> · {status === "not_started" ? "Pendiente" : status === "queued" ? "En cola" : status === "running" ? "En análisis" : status === "failed" ? "Falló" : "Review completada"}
              {deliverable.id === nextDeliveryId ? <span> · Siguiente entrega</span> : null}
              {attempts.length ? <ul>{attempts.map((attempt) => <li key={attempt.reviewId}>Commit <code>{attempt.commitSha}</code> · {attempt.status === "completed" ? "Review completada" : attempt.status === "queued" ? "En cola" : attempt.status === "running" ? "En análisis" : "Falló"}{attempt.status === "failed" ? <> · <button type="button" className="button button--light" onClick={() => void retryReview(attempt.reviewId)}>Reintentar esta Review</button></> : null}</li>)}</ul> : null}
            </li>)}</ol>
            <p className="review-screen__hint">Cada revisión es orientativa. Completarla no significa aprobación docente ni nota.</p>
          </> : null}
          {deliveryHistory.status === "success" && deliveryHistory.data?.deliveries.length === 0 ? <p>Esta misión no tiene entregas versionadas; se conserva el flujo de Review actual.</p> : null}
          {deliveryHistory.status === "success" && hasDeliveryPlan && !nextDeliveryId ? <p role="status">Todas las entregas tienen una Review completada. El historial permanece disponible.</p> : null}
        </section> : null}
                <div className="review-confirmation__notice"><Info aria-hidden="true" size={16} /><span>Elegir repositorio o commit no inicia IA. La revisión comienza cuando pulses «Evaluar commit».</span></div>
                <div className="review-form__footer"><p>{linkedProposal ? `Se compartirá con el docente de ${linkedProposal.assignmentContext?.mentorContext.config.theme}.` : "La revisión se vincula al commit que elegiste."}</p><button className="review-button review-button--primary" type="submit" disabled={!selectedCommit || reviewIsBusy || Boolean(linkedProposal && onLoadDeliveryHistory && deliveryHistory.status !== "success") || Boolean(hasDeliveryPlan && !nextDeliveryId)}>{reviewIsBusy ? <><LoaderCircle aria-hidden="true" size={17} className="is-spinning" /> Enviando commit…</> : <>Evaluar commit <ArrowRight aria-hidden="true" size={17} /></>}</button></div>
              </> : null}
            </div>
          </div>
          {selectionStatus ? <p className={`review-selection-status is-${selectionStatus.kind}`} role={selectionStatus.kind === "error" ? "alert" : "status"}>{selectionStatus.message}</p> : null}
          <div className="review-wizard__actions">
            <button type="button" className="review-button review-button--ghost" onClick={() => setStage((current) => (Math.max(0, current - 1) as 0 | 1 | 2))} disabled={stage === 0 || selectionBusy || reviewIsBusy}><ArrowLeft aria-hidden="true" size={16} /> Atrás</button>
            <span aria-live="polite">PASO 0{stage + 1} / 03</span>
            {stage < 2 ? <button type="button" className="review-button review-button--primary" onClick={() => setStage((current) => (Math.min(2, current + 1) as 0 | 1 | 2))} disabled={selectionBusy || (stage === 0 ? !repository : !selectedCommit)}>Continuar <ArrowRight aria-hidden="true" size={17} /></button> : <span />}
          </div>
        </form>
      </section>

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
        {reviewState?.status === "success" && linkedProposal ? <p className="review-screen__hint" role="status">Revisión vinculada a “{linkedProposal.proposal.title || "Propuesta sin título"}”. El docente autorizado podrá consultar su progreso.</p> : null}
        {currentReview ? <section className="review-source" aria-label="Commit en revisión">
          <dl>
            <div><dt>Repositorio</dt><dd><code>{currentReview.owner}/{currentReview.repo}</code></dd></div>
            <div><dt>Commit exacto</dt><dd><code>{currentReview.commitSha}</code></dd></div>
          </dl>
          <span className="review-source__status" data-status={currentReview.status}>{currentReview.status === "queued" ? "En cola" : currentReview.status === "running" ? "En análisis" : currentReview.status === "failed" ? "Falló" : "Completado"}</span>
        </section> : null}
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
            <button className="button button--light" type="button" onClick={() => void retryReview(currentReview.id)}>Intentar de nuevo</button>
          </div>
        ) : null}
        {currentReview?.status === "completed" ? (
          <div className="review-analysis">
            <div className="review-analysis__summary">
              <div>
                <h3>Orientación para este commit</h3>
                <p>Resultado devuelto por la revisión seleccionada.</p>
              </div>
              <p className="review-analysis__score" aria-label={`Puntuación devuelta: ${currentReview.analysis.score} de 100`}>{currentReview.analysis.score}/100</p>
            </div>
            {currentReview.analysis.findings.length ? (
              <>
                <h4 className="review-findings__title">Hallazgos devueltos · {currentReview.analysis.findings.length}</h4>
                <ul className="review-findings" aria-label="Hallazgos devueltos por Review">
                {currentReview.analysis.findings.map((finding, index) => (
                  <li key={`${finding.criterionId}-${index}`}>
                    <div className="review-finding__heading"><span>Hallazgo {index + 1}</span><p className="review-finding__status" data-status={finding.status}>{finding.status === "verified" ? "Verificado" : finding.status === "not_verified" ? "Aún no verificado" : "Necesita revisión"}</p></div>
                    <p>{finding.reason}</p>
                    <ul aria-label={`Evidencias del hallazgo ${index + 1}`}>{finding.evidence.map((item, evidenceIndex) => <li key={`${finding.criterionId}-${evidenceIndex}`}><code>{evidenceLabel(item)}</code></li>)}</ul>
                  </li>
                ))}
                </ul>
              </>
            ) : <><h4 className="review-findings__title">Hallazgos devueltos · 0</h4><p className="review-screen__hint">Esta revisión no devolvió hallazgos para mostrar.</p></>}
            {currentReview.analysis.limitations.length ? <p className="review-screen__hint">Límites de esta orientación: {currentReview.analysis.limitations.join(" ")}</p> : null}
            <button className="button button--primary" type="button" disabled={submission?.status === "loading"} onClick={() => void generateSubmission(currentReview.id)}>
              {submission?.status === "loading" ? "Preparando entrega…" : "Generar entrega"}
            </button>
            <a className="button button--light" href={`/student/trainer?reviewId=${encodeURIComponent(currentReview.id)}`} onClick={onOpenTrainer ? (event) => { event.preventDefault(); onOpenTrainer(currentReview.id); } : undefined}>Practicar en Trainer</a>
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
