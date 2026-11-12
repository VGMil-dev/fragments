import { useRef, useState, type FormEvent } from "react";
import type {
  ApiResult,
  CreateMentorSubmissionRequest,
  CreateProposalRequest,
  MentorSubmissionResponse,
  MentorPublishedConfig,
  ProposalEvaluationResponse,
  ProposalResponse,
} from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { SubmissionDownloads } from "../submissions/submission-downloads";
import { validateProposalDraft, type ProposalDraftFields } from "./proposal-validation";
import { importMentorDocx, MentorDocxImportError } from "./docx-import";
import "./mentor-screen.css";

export interface MentorScreenProps {
  mentorContext?: MentorPublishedConfig | undefined;
  initialProposal?: ProposalResponse;
  initialEvaluation?: AsyncState<ProposalEvaluationResponse>;
  onSave: (draft: CreateProposalRequest) => Promise<ApiResult<ProposalResponse>>;
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
  goals: "",
  skills: "",
  scope: "",
  constraints: "",
};

function fieldsFromProposal(proposal: ProposalResponse): ProposalDraftFields {
  return {
    title: proposal.proposal.title,
    problem: proposal.proposal.problem,
    solution: proposal.proposal.solution,
    goals: proposal.proposal.goals.join("\n"),
    skills: proposal.proposal.skills.join("\n"),
    scope: proposal.proposal.scope,
    constraints: proposal.proposal.constraints.join("\n"),
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

export function MentorScreen({
  mentorContext,
  initialProposal,
  initialEvaluation,
  onSave,
  onEvaluate,
  onRecoverEvaluation,
  onGenerateSubmission,
  onReadme,
  onPdf,
  onBack,
  mode = "real",
}: MentorScreenProps) {
  const [fields, setFields] = useState<ProposalDraftFields>(() => initialProposal ? fieldsFromProposal(initialProposal) : EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProposalDraftFields, string>>>({});
  const [proposal, setProposal] = useState<ProposalResponse | undefined>(initialProposal);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<AsyncState<ProposalEvaluationResponse> | null>(initialEvaluation ?? null);
  const [submission, setSubmission] = useState<AsyncState<MentorSubmissionResponse> | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const formBusy = saving || evaluation?.status === "loading" || submission?.status === "loading";

  function updateField(field: keyof ProposalDraftFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setIsDirty(true);
    setEvaluation(null);
    setSubmission(null);
    setSaveMessage(null);
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
    const validated = validateProposalDraft(fields);
    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      const result = await onSave(validated.data);
      if (!result.ok) {
        setSaveError("No pudimos guardar tu propuesta. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      setProposal(result.data);
      setFields(fieldsFromProposal(result.data));
      setIsDirty(false);
      setEvaluation(null);
      setSubmission(null);
      setSaveMessage("Propuesta guardada. Puedes evaluarla cuando quieras.");
    } catch {
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
          <p className="student-screen__lead">Describe qué quieres construir. Puedes cambiar la propuesta y evaluarla de nuevo.</p>
        </div>
        <DataSourceBadge mode={mode} {...(evaluation?.status === "success" ? { modelId: evaluation.data.analysis.modelId } : {})} />
      </header>

      <section className="mentor-choices" aria-label="Cómo empezar tu propuesta">
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
      </section>

      {mentorContext ? <section className="mentor-context" aria-label="Consigna de la evaluación">
        <p className="student-screen__eyebrow">{mentorContext.config.subject} · Versión {mentorContext.version}</p>
        <h2>{mentorContext.config.theme}</h2>
        <p>{mentorContext.config.assignment}</p>
        <p><strong>Nivel esperado:</strong> {mentorContext.config.expectedLevel}</p>
        {mentorContext.config.requirements.length ? <ul>{mentorContext.config.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul> : null}
      </section> : null}

      <form className="mentor-form" onSubmit={(event) => void saveProposal(event)} noValidate>
        <label className="mentor-field mentor-field--wide">
          <span>Título de la propuesta</span>
          <input ref={titleInput} value={fields.title} maxLength={160} disabled={formBusy} onChange={(event) => updateField("title", event.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "mentor-title-error" : undefined} />
          {fieldErrors.title ? <small id="mentor-title-error" role="alert">{fieldErrors.title}</small> : null}
        </label>

        <label className="mentor-field">
          <span>¿Qué problema quieres resolver?</span>
          <textarea rows={4} value={fields.problem} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("problem", event.target.value)} aria-invalid={Boolean(fieldErrors.problem)} aria-describedby={fieldErrors.problem ? "mentor-problem-error" : undefined} />
          {fieldErrors.problem ? <small id="mentor-problem-error" role="alert">{fieldErrors.problem}</small> : null}
        </label>

        <label className="mentor-field">
          <span>¿Cómo ayudará tu proyecto?</span>
          <textarea rows={4} value={fields.solution} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("solution", event.target.value)} aria-invalid={Boolean(fieldErrors.solution)} aria-describedby={fieldErrors.solution ? "mentor-solution-error" : undefined} />
          {fieldErrors.solution ? <small id="mentor-solution-error" role="alert">{fieldErrors.solution}</small> : null}
        </label>

        <label className="mentor-field">
          <span>Objetivos, uno por línea</span>
          <textarea rows={3} value={fields.goals} disabled={formBusy} onChange={(event) => updateField("goals", event.target.value)} aria-invalid={Boolean(fieldErrors.goals)} aria-describedby={fieldErrors.goals ? "mentor-goals-help mentor-goals-error" : "mentor-goals-help"} />
          <small id="mentor-goals-help">Escribe al menos un objetivo concreto.</small>
          {fieldErrors.goals ? <small id="mentor-goals-error" role="alert">{fieldErrors.goals}</small> : null}
        </label>

        <label className="mentor-field">
          <span>Habilidades que quieres practicar, una por línea</span>
          <textarea rows={3} value={fields.skills} disabled={formBusy} onChange={(event) => updateField("skills", event.target.value)} aria-invalid={Boolean(fieldErrors.skills)} aria-describedby={fieldErrors.skills ? "mentor-skills-error" : undefined} />
          {fieldErrors.skills ? <small id="mentor-skills-error" role="alert">{fieldErrors.skills}</small> : null}
        </label>

        <label className="mentor-field">
          <span>¿Qué incluirá la primera versión?</span>
          <textarea rows={4} value={fields.scope} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("scope", event.target.value)} aria-invalid={Boolean(fieldErrors.scope)} aria-describedby={fieldErrors.scope ? "mentor-scope-error" : undefined} />
          {fieldErrors.scope ? <small id="mentor-scope-error" role="alert">{fieldErrors.scope}</small> : null}
        </label>

        <label className="mentor-field">
          <span>Condiciones o límites, uno por línea</span>
          <textarea rows={3} value={fields.constraints} disabled={formBusy} onChange={(event) => updateField("constraints", event.target.value)} aria-invalid={Boolean(fieldErrors.constraints)} aria-describedby={fieldErrors.constraints ? "mentor-constraints-error" : undefined} />
          {fieldErrors.constraints ? <small id="mentor-constraints-error" role="alert">{fieldErrors.constraints}</small> : null}
        </label>

        <div className="mentor-form__footer">
          <p>La orientación es formativa. Tú decides si generar una entrega.</p>
          <button className="button button--primary" type="submit" disabled={formBusy}>
            {saving ? "Guardando…" : "Guardar propuesta"}
          </button>
        </div>
      </form>

      {saveMessage ? <p className="mentor-screen__success" role="status">{saveMessage}</p> : null}
      {saveError ? <p className="mentor-screen__error" role="alert">{saveError}</p> : null}

      <section className="mentor-evaluation" aria-labelledby="mentor-evaluation-title">
        <div className="mentor-evaluation__heading">
          <div>
            <p className="student-screen__eyebrow">SIGUIENTE PASO</p>
            <h2 id="mentor-evaluation-title">Revisa tu propuesta</h2>
            <p>Guarda los cambios antes de pedir una nueva evaluación.</p>
          </div>
          <button className="button button--light" type="button" disabled={!proposal || isDirty || saving || evaluation?.status === "loading" || evaluation?.status === "error"} onClick={() => void evaluateProposal()}>
            {evaluation?.status === "success" ? "Reevaluar" : "Evaluar propuesta"}
          </button>
        </div>
        {!proposal ? <p className="mentor-screen__hint">Guarda tu propuesta para poder evaluarla.</p> : null}
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
      </section>

      {submission?.status === "success" ? (
        <SubmissionDownloads submission={submission.data} onReadme={onReadme} onPdf={onPdf} />
      ) : submission ? (
        <AsyncStateView state={submission} render={() => null} />
      ) : null}
    </main>
  );
}
