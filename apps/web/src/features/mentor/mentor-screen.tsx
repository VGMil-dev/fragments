import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ApiResult,
  CreateMentorSubmissionRequest,
  CreateProposalDraftRequest,
  MentorSubmissionResponse,
  ProposalEvaluationResponse,
  ProposalDraftResponse,
  UpdateProposalDraftRequest,
} from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { SubmissionDownloads } from "../submissions/submission-downloads";
import { validateProposalDraft, type ProposalDraftFields } from "./proposal-validation";
import { importMentorDocx, MentorDocxImportError } from "./docx-import";
import "./mentor-screen.css";

export interface MentorScreenProps {
  initialProposal?: ProposalDraftResponse | undefined;
  initialEvaluation?: AsyncState<ProposalEvaluationResponse> | undefined;
  restoreEvaluation?: boolean;
  savedProposals: ProposalDraftResponse[];
  proposalsLoading: boolean;
  proposalsError?: boolean;
  onRetryProposals?: () => void;
  onResolveConflict?: () => void;
  onOpenProposal: (proposal: ProposalDraftResponse) => void;
  onSave: (draft: CreateProposalDraftRequest) => Promise<ApiResult<ProposalDraftResponse>>;
  onUpdate: (proposalId: string, draft: UpdateProposalDraftRequest) => Promise<ApiResult<ProposalDraftResponse>>;
  onEvaluate: (proposalId: string) => Promise<ApiResult<ProposalEvaluationResponse>>;
  onRecoverEvaluation: (proposalId: string) => Promise<ApiResult<ProposalEvaluationResponse>>;
  onGenerateSubmission: (request: CreateMentorSubmissionRequest) => Promise<ApiResult<MentorSubmissionResponse>>;
  onReadme: (submissionId: string) => Promise<ApiResult<string>>;
  onPdf: (submissionId: string) => Promise<ApiResult<Blob>>;
  onBack: () => void;
  mode?: DataMode;
}

const EMPTY_DRAFT: ProposalDraftFields = {
  title: "",
  problem: "",
  solution: "",
  description: "",
  purpose: "",
  goals: "",
  skills: "",
  scope: "",
  constraints: "",
};

const MENTOR_STAGES = ["Idea", "Contexto", "Habilidades", "Objetivos", "Evaluación", "Portada"] as const;

function fieldsFromProposal(proposal: ProposalDraftResponse): ProposalDraftFields {
  return {
    title: proposal.proposal.title ?? "",
    problem: proposal.proposal.problem ?? "",
    solution: proposal.proposal.solution ?? "",
    description: proposal.proposal.description ?? "",
    purpose: proposal.proposal.purpose ?? "",
    goals: proposal.proposal.goals?.join("\n") ?? "",
    skills: proposal.proposal.skills?.join("\n") ?? "",
    scope: proposal.proposal.scope ?? "",
    constraints: proposal.proposal.constraints?.join("\n") ?? "",
  };
}

function viabilityLabel(value: ProposalEvaluationResponse["viability"]): string {
  switch (value) {
    case "feasible": return "La propuesta es viable";
    case "needs_revision": return "La propuesta necesita algunos ajustes";
    case "not_feasible": return "Conviene revisar el alcance";
  }
}

function findingStatusLabel(status: ProposalEvaluationResponse["analysis"]["findings"][number]["status"]): string {
  switch (status) {
    case "verified": return "Verificado";
    case "not_verified": return "Aún no verificado";
    case "failed": return "Necesita revisión";
  }
}

function evidenceLabel(evidence: ProposalEvaluationResponse["analysis"]["findings"][number]["evidence"][number]): string {
  return evidence.source === "repository"
    ? `${evidence.path}:${evidence.lines[0]}–${evidence.lines[1]}`
    : `Campo de propuesta: ${evidence.field}`;
}

function draftPayload(fields: ProposalDraftFields): CreateProposalDraftRequest {
  return { proposal: {
    title: fields.title.trim(), problem: fields.problem.trim(), solution: fields.solution.trim(),
    description: fields.description.trim(), purpose: fields.purpose.trim(),
    goals: fields.goals.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    skills: fields.skills.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    scope: fields.scope.trim(), constraints: fields.constraints.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  } };
}

export function MentorScreen({
  initialProposal,
  initialEvaluation,
  restoreEvaluation = false,
  savedProposals,
  proposalsLoading,
  proposalsError = false,
  onRetryProposals,
  onResolveConflict,
  onOpenProposal,
  onSave,
  onUpdate,
  onEvaluate,
  onRecoverEvaluation,
  onGenerateSubmission,
  onReadme,
  onPdf,
  onBack,
  mode = "real",
}: MentorScreenProps) {
  const [fields, setFields] = useState<ProposalDraftFields>(() => initialProposal ? fieldsFromProposal(initialProposal) : EMPTY_DRAFT);
  const [activeStage, setActiveStage] = useState(() => initialEvaluation || restoreEvaluation ? 4 : 0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProposalDraftFields, string>>>({});
  const [proposal, setProposal] = useState<ProposalDraftResponse | undefined>(initialProposal);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [evaluation, setEvaluation] = useState<AsyncState<ProposalEvaluationResponse> | null>(initialEvaluation ?? null);
  const [submission, setSubmission] = useState<AsyncState<MentorSubmissionResponse> | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [coverCopyMessage, setCoverCopyMessage] = useState<string | null>(null);
  const formBusy = saving || evaluation?.status === "loading" || submission?.status === "loading";
  const validText = (value: string, max: number) => value.trim().length > 0 && value.trim().length <= max;
  const goals = fields.goals.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const completedRequiredFields = [
    validText(fields.title, 160), validText(fields.problem, 3000), validText(fields.solution, 3000),
    validText(fields.description, 3000), validText(fields.purpose, 1000),
    goals.length >= 1 && goals.length <= 12 && goals.every((goal) => goal.length <= 240), validText(fields.scope, 3000),
  ].filter(Boolean).length;
  const draftProgress = Math.round(completedRequiredFields / 7 * 100);
  const evaluationReady = validateProposalDraft(fields).ok;
  const coverReady = evaluation?.status === "success" && evaluation.data.proposalVersion === proposal?.version;
  const coverPrompt = `Ilustración geométrica para “${fields.title.trim()}”, con formas simples que representen ${fields.problem.trim().slice(0, 180)}. Paleta Fragments azul cobalto, lima y azul noche. Sin texto, formato horizontal.`;

  async function copyCoverPrompt() {
    try {
      await navigator.clipboard.writeText(coverPrompt);
      setCoverCopyMessage("Prompt copiado.");
    } catch { setCoverCopyMessage("No pudimos copiarlo. Selecciona y copia el texto del prompt."); }
  }

  useEffect(() => {
    if (!restoreEvaluation || !initialProposal || initialEvaluation) return;
    let active = true;
    void onRecoverEvaluation(initialProposal.id).then((result) => {
      if (active) setEvaluation(result.ok ? { status: "success", data: result.data } : null);
    }).catch(() => { if (active) setEvaluation(null); });
    return () => { active = false; };
  }, [restoreEvaluation, initialProposal, initialEvaluation, onRecoverEvaluation]);

  function updateField(field: keyof ProposalDraftFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setIsDirty(true);
    setEvaluation(null);
    setSubmission(null);
    setSaveMessage(null);
    setSaveError(null);
    setVersionConflict(false);
    setImportMessage(null);
  }

  async function importProposal(file?: File) {
    setImportError(null);
    setImportMessage(null);
    if (!file) return;
    try {
      const result = await importMentorDocx(file);
      setFields(result.fields);
      setFieldErrors({});
      setIsDirty(true);
      setEvaluation(null);
      setSubmission(null);
      setSaveMessage(null);
      setSaveError(null);
      setVersionConflict(false);
      setImportMessage(result.hasAnswers
        ? "Revisa y edita los campos importados. Guarda la propuesta para confirmar antes de evaluarla."
        : "La plantilla no contiene respuestas. Puedes completar el formulario manualmente.");
    } catch (error) {
      setImportError(error instanceof MentorDocxImportError ? error.message : "No pudimos leer el documento. Descarga la plantilla y vuelve a intentarlo.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  async function saveProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setSaveError(null);
    setVersionConflict(false);
    setFieldErrors({});
    setSaving(true);
    try {
      const payload = draftPayload(fields);
      const result = proposal
        ? await onUpdate(proposal.id, { ...payload, expectedVersion: proposal.version })
        : await onSave(payload);
      if (!result.ok) {
        const conflicted = result.error.code === "VERSION_CONFLICT";
        setVersionConflict(conflicted);
        setSaveError(conflicted
          ? "Otra versión se guardó antes. Tus cambios no sobrescribieron la versión actual. Recarga el proyecto antes de continuar."
          : "No pudimos guardar tu propuesta. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      setProposal(result.data);
      setFields(fieldsFromProposal(result.data));
      setIsDirty(false);
      setEvaluation(null);
      setSubmission(null);
      setSaveMessage("Borrador guardado. La evaluación está disponible cuando completes los campos requeridos.");
    } catch {
      setVersionConflict(false);
      setSaveError("No pudimos guardar tu propuesta. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function recoverEvaluation() {
    if (!proposal) return;
    setEvaluation({ status: "loading" });
    try {
      const result = await onRecoverEvaluation(proposal.id);
      if (!result.ok) {
        setEvaluation({ status: "error", retry: () => void recoverEvaluation() });
        return;
      }
      setEvaluation({ status: "success", data: result.data });
      setSubmission(null);
    } catch {
      setEvaluation({ status: "error", retry: () => void recoverEvaluation() });
    }
  }

  async function evaluateProposal() {
    if (!proposal) return;
    setEvaluation({ status: "loading" });
    try {
      const result = await onEvaluate(proposal.id);
      if (!result.ok) {
        if (result.error.code === "AI_BUDGET_UNAVAILABLE" || result.error.code === "AI_GATEWAY_BUDGET_EXCEEDED") {
          setEvaluation({
            status: "error",
            message: result.error.message,
            retryLabel: "Volver a intentar",
            retry: () => void evaluateProposal(),
          });
          return;
        }
        await recoverEvaluation();
        return;
      }
      setEvaluation({ status: "success", data: result.data });
      setSubmission(null);
    } catch {
      await recoverEvaluation();
    }
  }

  async function generateSubmission() {
    if (!proposal || evaluation?.status !== "success") return;
    const request: CreateMentorSubmissionRequest = {
      proposalId: proposal.id,
      proposalVersion: proposal.version,
      evaluationId: evaluation.data.evaluationId,
    };
    setSubmission({ status: "loading" });
    try {
      const result = await onGenerateSubmission(request);
      setSubmission(result.ok
        ? { status: "success", data: result.data }
        : { status: "error", retry: () => void generateSubmission() });
    } catch {
      setSubmission({ status: "error", retry: () => void generateSubmission() });
    }
  }

  return (
    <main className="student-screen mentor-screen" aria-labelledby="mentor-title">
      <header className="student-screen__header">
        <div>
          <button className="mentor-screen__back" type="button" onClick={onBack}>← Volver a la galería</button>
          <p className="student-screen__eyebrow">MENTOR · PROPUESTA</p>
          <h1 id="mentor-title">Tu idea toma forma</h1>
          <p className="student-screen__lead">Desarrolla tu propuesta por etapas. Guardar conserva el borrador sin solicitar evaluación.</p>
        </div>
        <DataSourceBadge mode={mode} {...(evaluation?.status === "success" ? { modelId: evaluation.data.analysis.modelId } : {})} />
      </header>

      <div className="mentor-stage-layout">
      <nav className="mentor-stage-nav" aria-label="Etapas de tu propuesta">
        <p className="student-screen__eyebrow">TU PROPUESTA</p>
        {MENTOR_STAGES.map((label, index) => <button key={label} type="button" aria-current={index === activeStage ? "step" : undefined} onClick={() => setActiveStage(index)}>{index + 1}. {label}</button>)}
        <p className="mentor-progress" role="status">Borrador completado: {draftProgress} %</p>
        <label className="mentor-stage-nav__mobile"><span>Etapa</span><select value={activeStage} onChange={(event) => setActiveStage(Number(event.target.value))}>{MENTOR_STAGES.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
        <div className="mentor-stage-nav__mobile mentor-stage-nav__controls"><button type="button" disabled={activeStage === 0} onClick={() => setActiveStage((value) => Math.max(0, value - 1))}>Anterior</button><button type="button" disabled={activeStage === MENTOR_STAGES.length - 1} onClick={() => setActiveStage((value) => Math.min(MENTOR_STAGES.length - 1, value + 1))}>Siguiente</button></div>
      </nav>
      <div className="mentor-stage-content">

      {activeStage === 0 ? <section className="mentor-choices" aria-label="Cómo empezar tu propuesta">
        <div className="mentor-choices__template">
          <a className="button button--light" href="/templates/fragments-mentor-propuesta.docx" download="fragments-mentor-propuesta.docx">
            Descargar plantilla Word
          </a>
          <label className="button button--light mentor-choices__upload">
            Importar propuesta (.docx)
            <input
              ref={importInput}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={formBusy}
              onChange={(event) => void importProposal(event.currentTarget.files?.[0])}
              aria-label="Importar propuesta (.docx)"
            />
          </label>
        </div>
        <button className="mentor-choices__direct" type="button" onClick={() => titleInput.current?.focus()}>
          Crear propuesta directamente
        </button>
        {importMessage ? <p className="mentor-screen__success" role="status">{importMessage}</p> : null}
        {importError ? <p className="mentor-screen__error" role="alert">{importError}</p> : null}
      </section> : null}

      {activeStage === 0 ? <section className="mentor-saved-proposals" aria-labelledby="mentor-saved-title">
        <h2 id="mentor-saved-title">Mis propuestas guardadas</h2>
        {proposalsLoading ? <p role="status">Cargando tus propuestas…</p> : proposalsError ? (
          <div role="alert"><p>No pudimos cargar tus propuestas guardadas.</p><button type="button" onClick={onRetryProposals}>Volver a intentar</button></div>
        ) : savedProposals.length ? (
          <ul>
            {savedProposals.map((saved) => (
              <li key={saved.id}>
                <span>{saved.proposal.title || "Borrador sin título"}</span>
                <span className="mentor-saved-proposals__version">Versión {saved.version}</span>
                <button type="button" onClick={() => onOpenProposal(saved)}>{proposal?.id === saved.id ? "Propuesta abierta" : "Abrir propuesta"}</button>
              </li>
            ))}
          </ul>
        ) : <p>Aún no tienes propuestas guardadas.</p>}
      </section> : null}

      {activeStage === 1 ? <section className="mentor-context"><h2>Proyecto personal</h2><p>No hay un aula o misión académica disponible para esta propuesta. Esta etapa seguirá en modo personal hasta que F18 ofrezca el contexto autorizado de lectura.</p></section> : null}

      <form className="mentor-form" onSubmit={(event) => void saveProposal(event)} noValidate>
        {activeStage === 0 ? <><label className="mentor-field mentor-field--wide">
          <span>Título de la propuesta</span>
          <input ref={titleInput} value={fields.title} maxLength={160} disabled={formBusy} onChange={(event) => updateField("title", event.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "mentor-title-error" : undefined} />
          {fieldErrors.title ? <small id="mentor-title-error" role="alert">{fieldErrors.title}</small> : null}
        </label>

        <label className="mentor-field">
          <span>Describe brevemente tu proyecto</span>
          <textarea rows={3} value={fields.description} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("description", event.target.value)} />
        </label>

        <label className="mentor-field">
          <span>¿Para qué quieres construirlo?</span>
          <textarea rows={3} value={fields.purpose} maxLength={1000} disabled={formBusy} onChange={(event) => updateField("purpose", event.target.value)} />
        </label></> : null}

        {activeStage === 0 ? <label className="mentor-field">
          <span>¿Qué problema quieres resolver?</span>
          <textarea rows={4} value={fields.problem} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("problem", event.target.value)} aria-invalid={Boolean(fieldErrors.problem)} aria-describedby={fieldErrors.problem ? "mentor-problem-error" : undefined} />
          {fieldErrors.problem ? <small id="mentor-problem-error" role="alert">{fieldErrors.problem}</small> : null}
        </label> : null}

        {activeStage === 0 ? <label className="mentor-field">
          <span>¿Cómo ayudará tu proyecto?</span>
          <textarea rows={4} value={fields.solution} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("solution", event.target.value)} aria-invalid={Boolean(fieldErrors.solution)} aria-describedby={fieldErrors.solution ? "mentor-solution-error" : undefined} />
          {fieldErrors.solution ? <small id="mentor-solution-error" role="alert">{fieldErrors.solution}</small> : null}
        </label> : null}

        {activeStage === 3 ? <label className="mentor-field">
          <span>Objetivos, uno por línea</span>
          <textarea rows={3} value={fields.goals} disabled={formBusy} onChange={(event) => updateField("goals", event.target.value)} aria-invalid={Boolean(fieldErrors.goals)} aria-describedby={fieldErrors.goals ? "mentor-goals-help mentor-goals-error" : "mentor-goals-help"} />
          <small id="mentor-goals-help">Escribe al menos un objetivo concreto.</small>
          {fieldErrors.goals ? <small id="mentor-goals-error" role="alert">{fieldErrors.goals}</small> : null}
        </label> : null}

        {activeStage === 2 ? <div className="mentor-context"><h2>Habilidades</h2><p>El catálogo autorizado de habilidades de aula aún no está disponible. No puedes marcar habilidades docentes hasta que F18 lo proporcione.</p></div> : null}

        {activeStage === 3 ? <label className="mentor-field">
          <span>¿Qué incluirá la primera versión?</span>
          <textarea rows={4} value={fields.scope} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("scope", event.target.value)} aria-invalid={Boolean(fieldErrors.scope)} aria-describedby={fieldErrors.scope ? "mentor-scope-error" : undefined} />
          {fieldErrors.scope ? <small id="mentor-scope-error" role="alert">{fieldErrors.scope}</small> : null}
        </label> : null}

        {activeStage === 3 ? <label className="mentor-field">
          <span>Condiciones o límites, uno por línea</span>
          <textarea rows={3} value={fields.constraints} disabled={formBusy} onChange={(event) => updateField("constraints", event.target.value)} aria-invalid={Boolean(fieldErrors.constraints)} aria-describedby={fieldErrors.constraints ? "mentor-constraints-error" : undefined} />
          {fieldErrors.constraints ? <small id="mentor-constraints-error" role="alert">{fieldErrors.constraints}</small> : null}
        </label> : null}

        <div className="mentor-form__footer">
          <p>{activeStage === 4 ? "La orientación es formativa; no equivale a aprobación docente." : "Tu borrador se guarda sin solicitar una evaluación."}</p>
          <button className="button button--primary" type="submit" disabled={formBusy}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </button>
        </div>
      </form>

      {saveMessage ? <p className="mentor-screen__success" role="status">{saveMessage}</p> : null}
      {saveError ? <div className="mentor-screen__error" role="alert"><p>{saveError}</p>{versionConflict && onResolveConflict ? <button type="button" onClick={onResolveConflict}>Volver a Mis proyectos</button> : null}</div> : null}

      {activeStage === 4 ? <section className="mentor-evaluation" aria-labelledby="mentor-evaluation-title">
        <section className="mentor-review-summary" aria-label="Resumen de tu propuesta">
          <h2>{fields.title.trim() || "Tu idea"}</h2>
          <dl><dt>Problema</dt><dd>{fields.problem.trim() || "Aún sin completar"}</dd><dt>Solución</dt><dd>{fields.solution.trim() || "Aún sin completar"}</dd><dt>Descripción</dt><dd>{fields.description.trim() || "Aún sin completar"}</dd><dt>Propósito</dt><dd>{fields.purpose.trim() || "Aún sin completar"}</dd><dt>Objetivos</dt><dd>{goals.length ? goals.join(" · ") : "Aún sin completar"}</dd><dt>Alcance</dt><dd>{fields.scope.trim() || "Aún sin completar"}</dd></dl>
        </section>
        <div className="mentor-evaluation__heading">
          <div>
            <p className="student-screen__eyebrow">SIGUIENTE PASO</p>
            <h2 id="mentor-evaluation-title">Revisa tu propuesta</h2>
            <p>Guarda los cambios antes de pedir una nueva evaluación.</p>
          </div>
          <button className="button button--light" type="button" disabled={!proposal || !evaluationReady || isDirty || saving || evaluation?.status === "loading" || evaluation?.status === "error"} onClick={() => void evaluateProposal()}>
            {evaluation?.status === "success" ? "Reevaluar" : "Evaluar propuesta"}
          </button>
        </div>
        {!proposal ? <p className="mentor-screen__hint">Guarda tu propuesta para poder evaluarla.</p> : null}
        {proposal && !evaluationReady ? <p className="mentor-screen__hint">Completa título, problema, solución, descripción, propósito, al menos un objetivo y alcance antes de evaluar.</p> : null}
        {evaluation ? (
          <AsyncStateView
            state={evaluation}
            retryLabel="Recuperar evaluación"
            render={(result) => (
              <section className="mentor-result" aria-label="Resultado de la evaluación">
                <div className="mentor-result__summary">
                  <div>
                    <p className="mentor-result__label">Orientación formativa</p>
                    <h3>{viabilityLabel(result.viability)}</h3>
                  </div>
                  <p className="mentor-result__score">{result.analysis.score}/100</p>
                </div>
                {result.mentorContextVersion ? <p className="mentor-screen__hint">Evaluación con la versión {result.mentorContextVersion} de la rúbrica.</p> : null}
                {result.criterionBreakdown?.length ? <ul className="mentor-findings" aria-label="Puntaje por criterio">
                  {result.criterionBreakdown.map((criterion) => <li key={criterion.criterionId}>
                    <p className="mentor-finding__status">{criterion.title} · {criterion.points}/{criterion.weight}</p>
                    <p>{criterion.reason}</p>
                  </li>)}
                </ul> : null}
                {result.analysis.findings.length > 0 ? (
                  <ul className="mentor-findings">
                    {result.analysis.findings.map((finding, index) => (
                      <li key={`${finding.criterionId}-${index}`}>
                        <p className="mentor-finding__status">{findingStatusLabel(finding.status)}</p>
                        <p>{finding.reason}</p>
                        <ul className="mentor-finding__evidence">
                          {finding.evidence.map((item, evidenceIndex) => <li key={`${finding.criterionId}-${evidenceIndex}`}>{evidenceLabel(item)}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {result.guidance.length > 0 ? (
                  <div className="mentor-guidance">
                    <h3>Ideas para seguir</h3>
                    <ul>{result.guidance.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}</ul>
                  </div>
                ) : null}
                {result.similarityMatches.length > 0 ? (
                  <div className="mentor-similarity">
                    <h3>Proyectos parecidos de la galería</h3>
                    <ul>{result.similarityMatches.map((match) => <li key={match.galleryId}><strong>{match.title}</strong><span>{match.reason}</span></li>)}</ul>
                  </div>
                ) : null}
                {result.analysis.limitations.length > 0 ? (
                  <p className="mentor-screen__hint">Límites de esta orientación: {result.analysis.limitations.join(" ")}</p>
                ) : null}
                <button className="button button--primary" type="button" disabled={submission?.status === "loading"} onClick={() => void generateSubmission()}>
                  {submission?.status === "loading" ? "Preparando entrega…" : "Generar entrega"}
                </button>
              </section>
            )}
          />
        ) : (
          <p className="mentor-screen__hint">Al evaluar, verás solo la orientación devuelta por el servicio.</p>
        )}
      </section> : null}

      {activeStage === 5 ? <section className="mentor-cover" aria-labelledby="mentor-cover-title"><p className="student-screen__eyebrow">PERSONALIZA TU PROYECTO</p><h2 id="mentor-cover-title">Portada</h2>
        {coverReady ? <><p>Prompt sugerido para crear una portada geométrica coherente con tu idea:</p><pre>{coverPrompt}</pre><button type="button" className="button button--light" onClick={() => void copyCoverPrompt()}>Copiar prompt</button>{coverCopyMessage ? <p role="status">{coverCopyMessage}</p> : null}</> : <p>Completa una evaluación guardada para la versión actual antes de personalizar la portada.</p>}
        <div className="mentor-cover__fallback" role="img" aria-label={`Portada geométrica predeterminada para ${fields.title || "tu proyecto"}`}><span aria-hidden="true">✳</span></div><p>Usamos una portada predeterminada de Fragments. La carga de imágenes está deshabilitada porque el almacenamiento persistente y su recuperación aún no están verificados.</p>
      </section> : null}

      {submission?.status === "success" ? (
        <SubmissionDownloads submission={submission.data} onReadme={onReadme} onPdf={onPdf} />
      ) : submission ? (
        <AsyncStateView state={submission} render={() => null} />
      ) : null}
      </div></div>
    </main>
  );
}
