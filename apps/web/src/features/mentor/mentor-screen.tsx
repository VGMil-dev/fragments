import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Code2, Flag, Layers3, Target, Trash2 } from "lucide-react";

import type {
  ApiResult,
  CreateMentorSubmissionRequest,
  CreateProposalDraftRequest,
  MentorSubmissionResponse,
  MentorPublishedConfig,
  ProposalEvaluationResponse,
  ProposalDraftResponse,
  ClassroomSummary,
  SkillCatalogEntry,
  UpdateProposalDraftRequest,
} from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { coverTemplateFor, ProjectCover } from "../covers/project-cover";
import { SubmissionDownloads } from "../submissions/submission-downloads";
import { validateProposalDraft, validateTechnologyList, type ProposalDraftFields } from "./proposal-validation";
import { importMentorDocx, MentorDocxImportError } from "./docx-import";
import { TechnologyPicker } from "./technology-picker";
import "./mentor-screen.css";

export interface MentorScreenProps {
  initialProposal?: ProposalDraftResponse | undefined;
  requiredMissionSkills?: Array<{ id: string; name: string }>;
  initialEvaluation?: AsyncState<ProposalEvaluationResponse> | undefined;
  restoreEvaluation?: boolean;
  savedProposals: ProposalDraftResponse[];
  proposalsLoading: boolean;
  proposalsError?: boolean;
  onRetryProposals?: () => void;
  classrooms?: ClassroomSummary[];
  classroomsLoading?: boolean;
  classroomsError?: string | null;
  onRetryClassrooms?: () => void;
  onLoadClassroomSkills?: (classroomId: string) => Promise<ApiResult<SkillCatalogEntry[]>>;
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
  contextState?: AsyncState<MentorPublishedConfig>;
}

const EMPTY_DRAFT: ProposalDraftFields = {
  title: "",
  problem: "",
  solution: "",
  description: "",
  purpose: "",
  goals: "",
  skills: "",
  technologies: "",
  expectedOutcome: "",
  scope: "",
  constraints: "",
};

const MENTOR_STAGES = ["Idea", "Contexto", "Habilidades", "Objetivos y alcance", "Evaluación", "Portada"] as const;
const EMPTY_MENTOR_CONTEXT: AsyncState<MentorPublishedConfig> = { status: "empty" };
type SkillCatalogState = { status: "loading" } | { status: "success"; data: SkillCatalogEntry[] } | { status: "error" };

function MentorContextStage({ state }: { state: AsyncState<MentorPublishedConfig> }) {
  if (state.status === "loading") {
    return <section className="mentor-context mentor-context--state" role="status" aria-live="polite" aria-busy="true">
      <h2>Cargando el contexto académico</h2>
      <p>Estamos consultando la configuración publicada por tu docente.</p>
    </section>;
  }
  if (state.status === "error") {
    return <section className="mentor-context mentor-context--state" role="alert" aria-labelledby="mentor-context-error-title">
      <h2 id="mentor-context-error-title">No pudimos cargar el contexto académico</h2>
      <p>{state.message ?? "Tu propuesta sigue disponible. Revisa la conexión e inténtalo de nuevo."}</p>
      <button className="button button--secondary" type="button" onClick={state.retry}>{state.retryLabel ?? "Volver a intentar"}</button>
    </section>;
  }
  if (state.status === "empty") {
    return <section className="mentor-context mentor-context--personal" aria-labelledby="mentor-context-personal-title">
      <div className="mentor-context__personal-icon" aria-hidden="true">◎</div>
      <h2 id="mentor-context-personal-title">Modo personal</h2>
      <p>No hay una configuración académica publicada para esta propuesta. Puedes continuar en modo personal; si tu docente publica un contexto, aparecerá aquí.</p>
    </section>;
  }

  const { config } = state.data;
  return <section className="mentor-context mentor-context--academic" aria-labelledby="mentor-context-title">
    <p className="mentor-context__available"><span aria-hidden="true">✓</span> Contexto académico disponible para esta propuesta</p>
    <div className="mentor-context__grid">
      <section className="mentor-context__card mentor-context__card--subject" aria-labelledby="mentor-context-title">
        <h2 id="mentor-context-title"><span aria-hidden="true">▱</span> Materia y consigna</h2>
        <dl>
          <div><dt>Asignatura</dt><dd>{config.subject}</dd></div>
          <div><dt>Temática</dt><dd>{config.theme}</dd></div>
          <div><dt>Consigna</dt><dd>{config.assignment}</dd></div>
        </dl>
      </section>
      <section className="mentor-context__card mentor-context__card--criteria" aria-labelledby="mentor-context-criteria-title">
        <h2 id="mentor-context-criteria-title"><span aria-hidden="true">◇</span> Restricciones y criterios</h2>
        {config.requirements.length > 0
          ? <ul className="mentor-context__requirements">{config.requirements.map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}</ul>
          : <p>El docente no ha definido restricciones adicionales.</p>}
        <p className="mentor-context__rubric">{config.rubricTitle}</p>
        <ul>{config.criteria.map((criterion) => <li key={criterion.id}>
          <span>{criterion.title}</span><small>{criterion.description} · {criterion.weight}%</small>
        </li>)}</ul>
      </section>
      <section className="mentor-context__card mentor-context__card--orientation" aria-labelledby="mentor-context-objectives-title">
        <h2 id="mentor-context-objectives-title"><span aria-hidden="true">◎</span> Orientación del docente</h2>
        <p className="mentor-context__expected"><strong>Nivel esperado:</strong> {config.expectedLevel}</p>
      </section>
    </div>
    <p className="mentor-context__readonly">Información de solo lectura definida por tu docente.</p>
  </section>;
}

function fieldsFromProposal(proposal: ProposalDraftResponse): ProposalDraftFields {
  return {
    title: proposal.proposal.title ?? "",
    problem: proposal.proposal.problem ?? "",
    solution: proposal.proposal.solution ?? "",
    description: proposal.proposal.description ?? "",
    purpose: proposal.proposal.purpose ?? "",
    goals: proposal.proposal.goals?.join("\n") ?? "",
    skills: proposal.proposal.skills?.join("\n") ?? "",
    technologies: proposal.proposal.technologies?.join("\n") ?? "",
    expectedOutcome: proposal.proposal.expectedOutcome ?? "",
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

function moveGoal(rows: string[], from: number, to: number): string {
  if (to < 0 || to >= rows.length) return rows.join("\n");
  const next = [...rows];
  const [goal] = next.splice(from, 1);
  next.splice(to, 0, goal ?? "");
  return next.join("\n");
}

function draftPayload(fields: ProposalDraftFields): CreateProposalDraftRequest {
  return { proposal: {
    title: fields.title.trim(), problem: fields.problem.trim(), solution: fields.solution.trim(),
    description: fields.description.trim(), purpose: fields.purpose.trim(),
    goals: fields.goals.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    technologies: fields.technologies.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    technologyIds: [],
    expectedOutcome: fields.expectedOutcome.trim(),
    scope: fields.scope.trim(), constraints: fields.constraints.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  } };
}

export function MentorScreen({
  initialProposal,
  requiredMissionSkills = [],
  initialEvaluation,
  restoreEvaluation = false,
  savedProposals,
  proposalsLoading,
  proposalsError = false,
  onRetryProposals,
  classrooms = [],
  classroomsLoading = false,
  classroomsError = null,
  onRetryClassrooms,
  onLoadClassroomSkills,
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
  contextState = EMPTY_MENTOR_CONTEXT,
}: MentorScreenProps) {
  const [fields, setFields] = useState<ProposalDraftFields>(() => initialProposal ? fieldsFromProposal(initialProposal) : EMPTY_DRAFT);
  const [technologyIds, setTechnologyIds] = useState<string[]>(() => initialProposal?.proposal.technologyIds ?? []);
  const [activeStage, setActiveStage] = useState(() => initialEvaluation || restoreEvaluation ? 4 : 0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProposalDraftFields, string>>>({});
  const [proposal, setProposal] = useState<ProposalDraftResponse | undefined>(initialProposal);
  const [skillClassroomId, setSkillClassroomId] = useState<string | null>(() => initialProposal?.proposal.mentorSkills?.classroomId ?? null);
  const [skillSelections, setSkillSelections] = useState<Record<string, string[]>>(() => {
    const selection = initialProposal?.proposal.mentorSkills;
    return selection?.classroomId ? { [selection.classroomId]: selection.selectedSkillIds } : {};
  });
  const [skillCatalogs, setSkillCatalogs] = useState<Record<string, SkillCatalogState>>({});
  const skillCatalogsRef = useRef<Record<string, SkillCatalogState>>({});
  const [skillSearch, setSkillSearch] = useState("");
  const [skillLimit, setSkillLimit] = useState(6);
  const [skillRetry, setSkillRetry] = useState(0);
  const [skillsChanged, setSkillsChanged] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [evaluation, setEvaluation] = useState<AsyncState<ProposalEvaluationResponse> | null>(initialEvaluation ?? null);
  const evaluationPendingRef = useRef(false);
  const [submission, setSubmission] = useState<AsyncState<MentorSubmissionResponse> | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [coverCopyMessage, setCoverCopyMessage] = useState<string | null>(null);
  const formBusy = saving || evaluation?.status === "loading" || submission?.status === "loading";
  const visibleRequiredMissionSkills = requiredMissionSkills.filter((skill) => skill.id && skill.name.trim());
  const validText = (value: string, max: number) => value.trim().length > 0 && value.trim().length <= max;
  const goalRows = fields.goals.length ? fields.goals.split(/\r?\n/) : [];
  const goals = fields.goals.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parseLines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const technologyEntries = parseLines(fields.technologies);
  const skillEntries = parseLines(fields.skills);
  const constraintEntries = parseLines(fields.constraints);
  const optionalProgressChecks = [
    ...(technologyEntries.length ? [technologyEntries.length <= 20 && technologyEntries.every((item) => item.length <= 80)] : []),
    ...(fields.expectedOutcome.trim() ? [fields.expectedOutcome.trim().length <= 3000] : []),
    ...(skillEntries.length ? [skillEntries.length <= 20 && skillEntries.every((item) => item.length <= 80)] : []),
    ...(constraintEntries.length ? [constraintEntries.length <= 20 && constraintEntries.every((item) => item.length <= 500)] : []),
  ];
  const progressChecks = [
    validText(fields.title, 160), validText(fields.problem, 3000), validText(fields.solution, 3000),
    validText(fields.description, 3000), validText(fields.purpose, 1000),
    goals.length >= 1 && goals.length <= 12 && goals.every((goal) => goal.length <= 240), validText(fields.scope, 3000),
  ];
  const allProgressChecks = [...progressChecks, ...optionalProgressChecks];
  const draftProgress = Math.round(allProgressChecks.filter(Boolean).length / allProgressChecks.length * 100);
  const evaluationReady = validateProposalDraft(fields).ok;
  const savedCurrentVersion = Boolean(proposal && !isDirty && !skillsChanged && !saving);
  const canEvaluate = Boolean(proposal && evaluationReady && savedCurrentVersion && evaluation?.status !== "loading");
  const coverReady = evaluation?.status === "success" && evaluation.data.proposalVersion === proposal?.version;
  const coverPrompt = `Ilustración geométrica para “${fields.title.trim()}”, con formas simples que representen ${fields.problem.trim().slice(0, 180)}. Paleta Fragments azul cobalto, lima y azul noche. Sin texto, formato horizontal.`;
  const activeStageLabel = MENTOR_STAGES[activeStage];
  const stageHeadings = ["Tu idea toma forma", "Tu proyecto en contexto", "Habilidades para practicar", "Objetivos y alcance", "Evalúa tu propuesta", "Presenta tu proyecto"];
  const stageDescription = activeStage === 4
    ? "Revisa y solicita la evaluación de tu propuesta antes de publicarla en Galería."
    : activeStage === 0
    ? "Define el núcleo de tu propuesta: el problema, la solución y su propósito."
    : activeStage === 1
      ? "Relaciona tu idea con la materia, la consigna y las condiciones de tu aula."
      : activeStage === 2
        ? "Revisa las habilidades de tu actividad y elige en cuáles quieres enfocarte."
      : `Etapa ${activeStage + 1} de ${MENTOR_STAGES.length} · ${activeStageLabel}`;
  const activeSkillCatalogState = skillClassroomId ? skillCatalogs[skillClassroomId] : undefined;
  const showClassroomSelect = classrooms.length > 1 || (classrooms.length === 1 && !skillClassroomId) || Boolean(skillClassroomId && !classrooms.some((classroom) => classroom.id === skillClassroomId));
  const activeSkillCatalog = activeSkillCatalogState?.status === "success" ? activeSkillCatalogState.data : [];
  const requiredSkillIds = new Set(visibleRequiredMissionSkills.map((skill) => skill.id));
  const optionalSkillCatalog = activeSkillCatalog.filter((skill) => !requiredSkillIds.has(skill.id));
  const selectedSkillIds = (skillClassroomId ? skillSelections[skillClassroomId] ?? [] : []).filter((id) => !requiredSkillIds.has(id));
  const normalizedSkillSearch = skillSearch.trim().toLocaleLowerCase("es");
  const matchingSkills = normalizedSkillSearch
    ? optionalSkillCatalog.filter((skill) => skill.name.toLocaleLowerCase("es").includes(normalizedSkillSearch))
    : optionalSkillCatalog;
  const visibleSkills = matchingSkills.slice(0, skillLimit);
  const skillNameById = new Map(optionalSkillCatalog.map((skill) => [skill.id, skill.name]));
  const savedSkillSelection = proposal?.proposal.mentorSkills;
  const proposalClassroom = classrooms.find((classroom) => classroom.id === proposal?.proposal.mentorSkills?.classroomId);
  if (savedSkillSelection?.classroomId === skillClassroomId) {
    savedSkillSelection.selectedSkillIds.forEach((id, index) => {
      if (!skillNameById.has(id) && proposal?.proposal.skills?.[index]) skillNameById.set(id, proposal.proposal.skills[index]!);
    });
  }
  const savedSkillsUnavailable = selectedSkillIds.filter((id) => !optionalSkillCatalog.some((skill) => skill.id === id));
  const completedStage = (index: number) => {
    switch (index) {
      case 0: return [fields.title, fields.problem, fields.solution, fields.description, fields.purpose].every((value) => validText(value, 3000));
      case 1: return contextState.status === "success" || contextState.status === "empty";
      case 2: return Boolean(proposal && !isDirty && !skillsChanged);
      case 3: return validText(fields.scope, 3000) && Boolean(goals.length) && !validateTechnologyList(fields.technologies);
      case 4: return Boolean(evaluation?.status === "success" && evaluation.data.proposalVersion === proposal?.version && savedCurrentVersion);
      case 5: return coverReady;
      default: return false;
    }
  };
  const stageStatus = (index: number) => index === activeStage
    ? "Etapa actual"
    : completedStage(index)
      ? "Completada"
      : "Pendiente";

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

  useEffect(() => {
    if (proposal?.proposal.mentorSkills !== undefined || skillsChanged || skillClassroomId || classrooms.length !== 1) return;
    setSkillClassroomId(classrooms[0]!.id);
  }, [proposal?.proposal.mentorSkills, skillsChanged, skillClassroomId, classrooms]);

  useEffect(() => {
    if (activeStage !== 2 || !skillClassroomId || !onLoadClassroomSkills) return;
    const current = skillCatalogsRef.current[skillClassroomId];
    if (current?.status === "loading" || current?.status === "success") return;
    const loadingState = { ...skillCatalogsRef.current, [skillClassroomId]: { status: "loading" } as const };
    skillCatalogsRef.current = loadingState;
    setSkillCatalogs(loadingState);
    void onLoadClassroomSkills(skillClassroomId).then((result) => {
      const next = { ...skillCatalogsRef.current, [skillClassroomId]: result.ok ? { status: "success", data: result.data } as const : { status: "error" } as const };
      skillCatalogsRef.current = next;
      setSkillCatalogs(next);
    }).catch(() => {
      const next = { ...skillCatalogsRef.current, [skillClassroomId]: { status: "error" } as const };
      skillCatalogsRef.current = next;
      setSkillCatalogs(next);
    });
  }, [activeStage, skillClassroomId, onLoadClassroomSkills, skillRetry]);

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

  function markSkillsChanged() {
    setSkillsChanged(true);
    setIsDirty(true);
    setEvaluation(null);
    setSubmission(null);
    setSaveMessage(null);
    setSaveError(null);
    setVersionConflict(false);
  }

  function chooseSkillClassroom(value: string) {
    setSkillClassroomId(value || null);
    setSkillSearch("");
    setSkillLimit(6);
    markSkillsChanged();
  }

  function toggleSkill(skillId: string) {
    if (!skillClassroomId) return;
    setSkillSelections((current) => {
      const currentSelection = (current[skillClassroomId] ?? []).filter((id) => !requiredSkillIds.has(id));
      const currentlySelected = currentSelection.includes(skillId);
      if (!currentlySelected && currentSelection.length >= 20) return current;
      const nextSelection = currentlySelected
        ? currentSelection.filter((id) => id !== skillId)
        : [...currentSelection, skillId];
      return { ...current, [skillClassroomId]: nextSelection };
    });
    markSkillsChanged();
  }

  async function importProposal(file?: File) {
    setImportError(null);
    setImportMessage(null);
    if (!file) return;
    try {
      const result = await importMentorDocx(file);
      setFields(result.fields);
      setTechnologyIds([]);
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
    const saveAndContinue = (event.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
      && (event.nativeEvent as SubmitEvent).submitter?.dataset.continue === "true";
    setSaveMessage(null);
    setSaveError(null);
    setVersionConflict(false);
    setFieldErrors({});
    const technologyError = validateTechnologyList(fields.technologies);
    if (technologyError) {
      setActiveStage(3);
      setFieldErrors({ technologies: technologyError });
      setSaveError("Revisa el campo de tecnologías para guardar el borrador.");
      return;
    }
    setSaving(true);
    try {
      const basePayload = draftPayload(fields);
      const payload: CreateProposalDraftRequest = !proposal || skillsChanged
        ? { ...basePayload, proposal: { ...basePayload.proposal, mentorSkills: { classroomId: skillClassroomId, selectedSkillIds } } }
        : basePayload;
      payload.proposal.technologyIds = technologyIds;
      const result = proposal
        ? await onUpdate(proposal.id, { ...payload, expectedVersion: proposal.version })
        : await onSave(payload);
      if (!result.ok) {
        const conflicted = result.error.code === "VERSION_CONFLICT";
        setVersionConflict(conflicted);
        setSaveError(conflicted
          ? "Otra versión se guardó antes. Tus cambios no sobrescribieron la versión actual. Recarga el proyecto antes de continuar."
          : result.error.code === "INVALID_SKILL_SELECTION"
            ? "No pudimos validar esas habilidades. Elige un aula activa y revisa que las habilidades sigan disponibles."
            : "No pudimos guardar tu propuesta. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      setProposal(result.data);
      setFields(fieldsFromProposal(result.data));
      setTechnologyIds(result.data.proposal.technologyIds ?? []);
      setSkillsChanged(false);
      setIsDirty(false);
      setEvaluation(null);
      setSubmission(null);
      setSaveMessage("Borrador guardado. La evaluación está disponible cuando completes los campos requeridos.");
      if (saveAndContinue && activeStage < 4) setActiveStage((stage) => Math.min(4, stage + 1));
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
    if (!proposal || !canEvaluate || evaluationPendingRef.current) return;
    evaluationPendingRef.current = true;
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
    } finally {
      evaluationPendingRef.current = false;
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
      <header className="student-screen__header mentor-screen__header">
        <div className="mentor-screen__heading">
          <p className="student-screen__eyebrow">MENTOR <span aria-hidden="true">·</span> TU PROPUESTA</p>
          <h1 id="mentor-title">{stageHeadings[activeStage]}</h1>
          <p className="student-screen__lead">{stageDescription}</p>
        </div>
        {activeStage === 4 ? null : <section className="mentor-progress-card" aria-label="Progreso del borrador">
          <p>Borrador completado: <strong>{draftProgress} %</strong></p>
          <div className="mentor-progress-card__track" role="progressbar" aria-label="Campos obligatorios completados" aria-valuemin={0} aria-valuemax={100} aria-valuenow={draftProgress}>
            <span style={{ width: `${draftProgress}%` }} />
          </div>
          <DataSourceBadge mode={mode} {...(evaluation?.status === "success" ? { modelId: evaluation.data.analysis.modelId } : {})} />
        </section>}
      </header>

      <div className={`mentor-stage-layout${activeStage === 4 ? " mentor-stage-layout--evaluation" : ""}`}>
      <nav className="mentor-stage-nav mentor-stage-nav--horizontal" aria-label="Etapas de tu propuesta">
        <h2><span aria-hidden="true">▱</span> Tu propuesta</h2>
        <ol>
          {MENTOR_STAGES.map((label, index) => <li key={label}>
            <button className={completedStage(index) ? "is-complete" : ""} type="button" aria-current={index === activeStage ? "step" : undefined} aria-label={`${label}: ${stageStatus(index)}`} onClick={() => setActiveStage(index)}>
              <span className="mentor-stage-nav__number" aria-hidden="true">{completedStage(index) ? "✓" : index + 1}</span><span>{label}</span><span className={`mentor-stage-nav__state mentor-stage-nav__state--${index === activeStage ? "current" : completedStage(index) ? "complete" : "pending"}`}>{stageStatus(index)}</span>
            </button>
          </li>)}
        </ol>
        <label className="mentor-stage-nav__mobile"><span>Etapa {activeStage + 1} de {MENTOR_STAGES.length}</span><select aria-label="Seleccionar etapa de la propuesta" value={activeStage} onChange={(event) => setActiveStage(Number(event.target.value))}>{MENTOR_STAGES.map((label, index) => <option key={label} value={index}>{index + 1}. {label}</option>)}</select></label>
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
                {saved.assignmentVersionId || saved.assignmentContext?.assignmentVersionId ? (
                  <span className="mentor-saved-proposals__mission">
                    Misión vinculada{saved.assignmentContext?.mentorContext
                      ? <> · {saved.assignmentContext.mentorContext.config.theme} · Contexto Mentor v{saved.assignmentContext.mentorContext.version}</>
                      : " · contexto académico no disponible"}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`${proposal?.id === saved.id ? "Propuesta abierta" : "Abrir propuesta"}: ${saved.proposal.title || "Borrador sin título"}`}
                  onClick={() => onOpenProposal(saved)}
                >{proposal?.id === saved.id ? "Propuesta abierta" : "Abrir propuesta"}</button>
              </li>
            ))}
          </ul>
        ) : <p>Aún no tienes propuestas guardadas.</p>}
      </section> : null}

      <form id="mentor-proposal-form" className={`mentor-form${activeStage === 1 ? " mentor-form--context" : ""}${activeStage === 4 ? " mentor-form--evaluation" : ""}`} onSubmit={(event) => void saveProposal(event)} noValidate>
        {activeStage === 1 ? <MentorContextStage state={contextState} /> : null}
        {activeStage === 0 ? <><label className="mentor-field mentor-field--wide">
          <span>Título de la propuesta <b aria-hidden="true">*</b></span>
          <input ref={titleInput} value={fields.title} placeholder="Ej. Huerto escolar inteligente" maxLength={160} disabled={formBusy} onChange={(event) => updateField("title", event.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "mentor-title-error" : undefined} />
          {fieldErrors.title ? <small id="mentor-title-error" role="alert">{fieldErrors.title}</small> : null}
        </label>

        <label className="mentor-field mentor-field--wide">
          <span>Problema <b aria-hidden="true">*</b></span>
          <textarea rows={3} value={fields.problem} placeholder="Describe la situación o necesidad que quieres abordar." maxLength={3000} disabled={formBusy} onChange={(event) => updateField("problem", event.target.value)} aria-invalid={Boolean(fieldErrors.problem)} aria-describedby={fieldErrors.problem ? "mentor-problem-error" : undefined} />
          {fieldErrors.problem ? <small id="mentor-problem-error" role="alert">{fieldErrors.problem}</small> : null}
        </label>

        <label className="mentor-field mentor-field--wide">
          <span>Solución <b aria-hidden="true">*</b></span>
          <textarea rows={3} value={fields.solution} placeholder="Explica de forma breve tu idea de solución." maxLength={3000} disabled={formBusy} onChange={(event) => updateField("solution", event.target.value)} aria-invalid={Boolean(fieldErrors.solution)} aria-describedby={fieldErrors.solution ? "mentor-solution-error" : undefined} />
          {fieldErrors.solution ? <small id="mentor-solution-error" role="alert">{fieldErrors.solution}</small> : null}
        </label></> : null}

        {activeStage === 0 ? <label className="mentor-field mentor-field--wide">
          <span>Descripción <b aria-hidden="true">*</b></span>
          <textarea rows={3} value={fields.description} placeholder="Amplía tu propuesta: cómo funciona, qué la hace innovadora y qué la diferencia de otras ideas." maxLength={3000} disabled={formBusy} onChange={(event) => updateField("description", event.target.value)} />
        </label> : null}

        {activeStage === 0 ? <label className="mentor-field mentor-field--wide">
          <span>Propósito <b aria-hidden="true">*</b></span>
          <textarea rows={3} value={fields.purpose} placeholder="Indica el objetivo principal de tu propuesta y el impacto que esperas lograr." maxLength={1000} disabled={formBusy} onChange={(event) => updateField("purpose", event.target.value)} />
        </label> : null}

        {activeStage === 3 ? <fieldset className="mentor-field mentor-objectives" aria-describedby={fieldErrors.goals ? "mentor-goals-help mentor-goals-error" : "mentor-goals-help"}>
          <legend><Target className="mentor-objectives__icon" aria-hidden="true" size={22} /> Mis objetivos <b aria-hidden="true">*</b></legend>
          <small id="mentor-goals-help">Escribe entre 1 y 12 objetivos concretos, hasta 240 caracteres cada uno.</small>
          {!goalRows.length ? <p>Agrega un objetivo para empezar.</p> : null}
          {goalRows.map((goal, index, rows) => <div className="mentor-objectives__row" key={index}>
            <span className="mentor-objectives__number" aria-hidden="true">{index + 1}</span>
            <label className="mentor-objectives__label" htmlFor={`mentor-goal-${index}`}>Objetivo {index + 1}</label>
            <input id={`mentor-goal-${index}`} maxLength={240} value={goal} disabled={formBusy} aria-invalid={Boolean(fieldErrors.goals)} aria-describedby={fieldErrors.goals ? "mentor-goals-help mentor-goals-error" : "mentor-goals-help"} onChange={(event) => updateField("goals", rows.map((row, rowIndex) => rowIndex === index ? event.target.value : row).join("\n"))} />
            <button type="button" className="mentor-objectives__remove" aria-label={`Quitar objetivo ${index + 1}`} disabled={formBusy} onClick={() => updateField("goals", rows.filter((_, rowIndex) => rowIndex !== index).join("\n"))}><Trash2 aria-hidden="true" size={18} /></button>
            <div className="mentor-objectives__order"><button type="button" aria-label={`Mover objetivo ${index + 1} arriba`} disabled={formBusy || index === 0} onClick={() => updateField("goals", moveGoal(rows, index, index - 1))}>↑</button><button type="button" aria-label={`Mover objetivo ${index + 1} abajo`} disabled={formBusy || index === rows.length - 1} onClick={() => updateField("goals", moveGoal(rows, index, index + 1))}>↓</button></div>
          </div>)}
          <button className="button button--secondary" type="button" disabled={formBusy || goalRows.length >= 12} onClick={() => updateField("goals", fields.goals ? `${fields.goals}\n` : " ")}>Agregar objetivo</button>
          {fieldErrors.goals ? <small id="mentor-goals-error" role="alert">{fieldErrors.goals}</small> : null}
        </fieldset> : null}

        {activeStage === 2 ? <section className="mentor-skills" aria-label="Habilidades para practicar">
          <div className="mentor-skills__available" role="status">
            <span className="mentor-skills__available-check" aria-hidden="true">✓</span>
            <strong>{activeSkillCatalogState?.status === "success"
              ? "Catálogo autorizado para el aula seleccionada."
              : activeSkillCatalogState?.status === "loading"
                ? "Consultando las habilidades autorizadas del aula."
                : activeSkillCatalogState?.status === "error"
                  ? "No pudimos confirmar el acceso al catálogo."
                  : classroomsLoading
                    ? "Consultando tus aulas."
                    : skillClassroomId
                      ? "El catálogo del aula aún no se ha consultado."
                      : "Elige un aula para consultar sus habilidades."}</strong>
            <span className="mentor-skills__source">{activeSkillCatalogState?.status === "success" ? "Aula activa" : "Sin catálogo"}</span>
          </div>

          <section className="mentor-skills__required" aria-labelledby="mentor-skills-required-title">
            <div className="mentor-skills__section-heading">
              <span className="mentor-skills__section-icon" aria-hidden="true">▱</span>
              <div><h2 id="mentor-skills-required-title">Habilidades requeridas</h2><p>{visibleRequiredMissionSkills.length
                ? "Fijadas por la misión publicada; se muestran como referencia y no se editan aquí."
                : "No hay habilidades marcadas como obligatorias por una fuente académica para esta actividad."}</p></div>
              <span className="mentor-skills__count">{visibleRequiredMissionSkills.length
                ? `${visibleRequiredMissionSkills.length} ${visibleRequiredMissionSkills.length === 1 ? "requerida" : "requeridas"}`
                : "Sin asignación"}</span>
            </div>
            {visibleRequiredMissionSkills.length ? <ul className="mentor-skills__required-list" aria-label="Habilidades fijadas por la misión">
              {visibleRequiredMissionSkills.map((skill) => <li key={skill.id}>{skill.name}</li>)}
            </ul> : null}
          </section>

          <section className="mentor-skills__reinforce" aria-labelledby="mentor-skills-reinforce-title" aria-busy={Boolean(skillClassroomId && activeSkillCatalogState?.status === "loading")}>
            <div className="mentor-skills__section-heading">
              <span className="mentor-skills__section-icon mentor-skills__section-icon--star" aria-hidden="true">☆</span>
              <div><h2 id="mentor-skills-reinforce-title">Quiero reforzar</h2><p>Elige habilidades disponibles de tu aula en las que te gustaría profundizar.</p></div>
              <span className="mentor-skills__count">{activeSkillCatalog.length} disponibles</span>
            </div>

            {classroomsLoading ? <p className="mentor-skills__state" role="status">Cargando tus aulas…</p> : null}
            {classroomsError ? <div className="mentor-skills__state mentor-skills__state--error" role="alert"><p>{classroomsError}</p>{onRetryClassrooms ? <button type="button" onClick={onRetryClassrooms}>Volver a intentar</button> : null}</div> : null}
            {!classroomsLoading && !classroomsError && classrooms.length === 0 ? <div className="mentor-skills__state"><p>Aún no tienes matrícula activa en un aula con catálogo de habilidades. Puedes continuar con tu propuesta sin seleccionar habilidades.</p></div> : null}

            {showClassroomSelect ? <label className="mentor-skills__classroom"><span>Aula</span><select aria-label="Seleccionar aula de habilidades" value={skillClassroomId ?? ""} disabled={formBusy || classroomsLoading} onChange={(event) => chooseSkillClassroom(event.target.value)}>
              <option value="">Elige un aula</option>
              {skillClassroomId && !classrooms.some((classroom) => classroom.id === skillClassroomId) ? <option value={skillClassroomId} disabled>Aula guardada sin acceso activo</option> : null}
              {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.title} · {classroom.subject} · {classroom.groupLabel}</option>)}
            </select></label> : null}
            {classrooms.length === 1 && skillClassroomId === classrooms[0]!.id ? <p className="mentor-skills__classroom-label">Aula: <strong>{classrooms[0]!.title}</strong> · {classrooms[0]!.subject}</p> : null}

            {selectedSkillIds.length ? <div className="mentor-skills__selected" aria-label={`${selectedSkillIds.length} habilidades seleccionadas`}>
              <strong>{selectedSkillIds.length} seleccionadas</strong>
              <div className="mentor-skills__chips">{selectedSkillIds.map((id) => <span className="mentor-skills__chip" key={id}>
                {skillNameById.get(id) ?? "Habilidad guardada"}
                <button type="button" aria-label={`Quitar ${skillNameById.get(id) ?? "habilidad guardada"}`} disabled={formBusy} onClick={() => toggleSkill(id)}>×</button>
              </span>)}</div>
            </div> : null}

            {savedSkillsUnavailable.length ? <p className="mentor-skills__notice" role="status">Hay habilidades seleccionadas que ya no están disponibles en el aula. Quítalas para guardar esta selección.</p> : null}
            {selectedSkillIds.length >= 20 ? <p className="mentor-skills__notice" role="status">Puedes seleccionar hasta 20 habilidades.</p> : null}

            {skillClassroomId ? <label className="mentor-skills__search"><span className="sr-only">Buscar habilidades por nombre</span><span aria-hidden="true">⌕</span><input type="search" value={skillSearch} placeholder="Buscar habilidades por nombre…" disabled={formBusy || activeSkillCatalogState?.status !== "success"} onChange={(event) => { setSkillSearch(event.target.value); setSkillLimit(6); }} /></label> : null}

            {skillClassroomId && activeSkillCatalogState?.status === "loading" ? <p className="mentor-skills__state" role="status">Cargando habilidades del aula…</p> : null}
            {skillClassroomId && activeSkillCatalogState?.status === "error" ? <div className="mentor-skills__state mentor-skills__state--error" role="alert"><p>No pudimos consultar las habilidades de esta aula. Tu borrador sigue disponible.</p><button type="button" onClick={() => setSkillRetry((value) => value + 1)}>Volver a cargar habilidades</button></div> : null}
            {!skillClassroomId && classrooms.length > 1 ? <p className="mentor-skills__state">Elige un aula para consultar las habilidades autorizadas.</p> : null}
            {skillClassroomId && activeSkillCatalogState?.status === "success" && activeSkillCatalog.length === 0 ? <p className="mentor-skills__state">Esta aula aún no tiene habilidades disponibles.</p> : null}
            {skillClassroomId && activeSkillCatalogState?.status === "success" && activeSkillCatalog.length > 0 && optionalSkillCatalog.length === 0 ? <p className="mentor-skills__state">No hay otras habilidades disponibles para reforzar en esta misión.</p> : null}
            {skillClassroomId && activeSkillCatalogState?.status === "success" && optionalSkillCatalog.length > 0 ? <>
              {visibleSkills.length ? <div className="mentor-skills__list" aria-label="Habilidades disponibles">{visibleSkills.map((skill) => {
                const selected = selectedSkillIds.includes(skill.id);
                return <button className={`mentor-skills__option${selected ? " is-selected" : ""}`} type="button" key={skill.id} aria-pressed={selected} disabled={formBusy || (!selected && selectedSkillIds.length >= 20)} onClick={() => toggleSkill(skill.id)}>
                  <span className="mentor-skills__checkbox" aria-hidden="true">{selected ? "✓" : ""}</span><span className="mentor-skills__option-mark" aria-hidden="true">✳</span><span>{skill.name}</span>
                </button>;
              })}</div> : <p className="mentor-skills__state">No encontramos habilidades con ese nombre.</p>}
              {matchingSkills.length > visibleSkills.length ? <button className="mentor-skills__more" type="button" onClick={() => setSkillLimit((value) => value + 6)}>⌄ <span>Mostrar más ({matchingSkills.length - visibleSkills.length})</span></button> : null}
            </> : null}
          </section>
        </section> : null}

        {activeStage === 2 ? <section className="mentor-choices mentor-choices--skills" aria-label="Acciones de Word">
          <div className="mentor-choices__template">
            <a className="button button--light" href="/templates/fragments-mentor-propuesta.docx" download="fragments-mentor-propuesta.docx">Descargar plantilla Word</a>
            <label className="button button--light mentor-choices__upload">
              Importar propuesta (.docx)
              <input ref={importInput} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={formBusy} onChange={(event) => void importProposal(event.currentTarget.files?.[0])} aria-label="Importar propuesta (.docx)" />
            </label>
          </div>
          {importMessage ? <p className="mentor-screen__success" role="status">{importMessage}</p> : null}
          {importError ? <p className="mentor-screen__error" role="alert">{importError}</p> : null}
        </section> : null}

        {activeStage === 3 ? <div className="mentor-project-outcomes" aria-label="Alcance y resultado del proyecto">
          <label className="mentor-field mentor-project-outcomes__card">
            <span className="mentor-project-outcomes__title"><Layers3 aria-hidden="true" size={22} /> Alcance del MVP <b aria-hidden="true">*</b></span>
            <small>Define qué incluirá la primera versión de tu proyecto.</small>
            <textarea rows={5} value={fields.scope} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("scope", event.target.value)} aria-invalid={Boolean(fieldErrors.scope)} aria-describedby={fieldErrors.scope ? "mentor-scope-error" : undefined} />
            {fieldErrors.scope ? <small id="mentor-scope-error" role="alert">{fieldErrors.scope}</small> : null}
          </label>
          <label className="mentor-field mentor-project-outcomes__card">
            <span className="mentor-project-outcomes__title"><Flag aria-hidden="true" size={22} /> Resultado esperado</span>
            <small>¿Qué podrá observar o hacer alguien cuando termines?</small>
            <textarea rows={5} value={fields.expectedOutcome} maxLength={3000} disabled={formBusy} onChange={(event) => updateField("expectedOutcome", event.target.value)} />
          </label>
        </div> : null}

        {activeStage === 3 ? <div className="mentor-field mentor-technologies" role="group" aria-labelledby="mentor-technologies-title" aria-describedby={fieldErrors.technologies ? "mentor-technologies-error" : undefined}>
          <h2 id="mentor-technologies-title"><Code2 aria-hidden="true" size={22} /> Tecnologías</h2>
          <p>Elige opciones del catálogo. Los nombres antiguos que no están en él se conservan hasta que los quites.</p>
          <TechnologyPicker disabled={formBusy} selectedIds={technologyIds} legacyNames={fields.technologies.split(/\r?\n/).map((name) => name.trim()).filter(Boolean)} onRemoveLegacy={(name) => updateField("technologies", fields.technologies.split(/\r?\n/).filter((entry) => entry.trim() !== name).join("\n"))} onSelectedIdsChange={(ids, _entries, removed) => { setTechnologyIds(ids); if (removed) updateField("technologies", fields.technologies.split(/\r?\n/).filter((entry) => entry.trim() !== removed.name).join("\n")); else { setIsDirty(true); setEvaluation(null); setSubmission(null); setSaveMessage(null); } }} />
          {fieldErrors.technologies ? <small id="mentor-technologies-error" role="alert">{fieldErrors.technologies}</small> : null}
        </div> : null}


        {activeStage !== 4 ? <div className="mentor-form__footer">
          {activeStage > 0
            ? <button className="button button--secondary" type="button" onClick={() => setActiveStage((stage) => Math.max(0, stage - 1))}><span aria-hidden="true">←</span> Anterior</button>
            : <p>{activeStage === 0 || activeStage === 3 ? "* Campo necesario para evaluar. Guarda los cambios con «Guardar borrador»." : "Guarda los cambios con «Guardar borrador»."}</p>}
          <div className="mentor-form__actions">
            <button className="button button--secondary" type="submit" disabled={formBusy}>
              {saving ? "Guardando…" : "Guardar borrador"}
            </button>
            {activeStage < 4 ? <button className="button button--primary" type="submit" data-continue="true" disabled={formBusy}>{saving ? "Guardando…" : <>Guardar y continuar <span aria-hidden="true">→</span></>}</button> : null}
          </div>
        </div> : null}
      </form>

      {saveMessage ? <p className="mentor-screen__success" role="status">{saveMessage}</p> : null}
      {saveError ? <div className="mentor-screen__error" role="alert"><p>{saveError}</p>{versionConflict && onResolveConflict ? <button type="button" onClick={onResolveConflict}>Volver a Mis proyectos</button> : null}</div> : null}

      {activeStage === 4 ? <section className="mentor-evaluation" aria-labelledby="mentor-evaluation-title">
        <section className="mentor-review-summary" aria-label="Resumen de tu propuesta">
          <h2>Resumen de tu propuesta</h2>
          <h3>{proposal?.proposal.title ?? (fields.title.trim() || "Tu idea")}</h3>
          <article className="mentor-summary-row"><div><span aria-hidden="true">◉</span><div><h4>Idea y propósito</h4><p>{proposal?.proposal.description || fields.description.trim() || "Aún no has completado la descripción."}</p><small>{proposal?.proposal.purpose || fields.purpose.trim() || "Propósito aún sin completar."}</small></div></div><button type="button" className="button button--secondary" onClick={() => setActiveStage(0)}>Editar</button></article>
          <article className="mentor-summary-row"><div><span aria-hidden="true">◎</span><div><h4>Contexto de clase</h4><p>{contextState.status === "success" ? [proposalClassroom?.title, contextState.data.config.subject].filter(Boolean).join(" · ") : contextState.status === "empty" ? "Modo personal; no hay contexto de aula asociado." : contextState.status === "loading" ? "Cargando el contexto de clase." : "No pudimos cargar el contexto de clase."}</p>{contextState.status === "success" ? <small>{contextState.data.config.assignment}</small> : null}</div></div><button type="button" className="button button--secondary" onClick={() => setActiveStage(1)}>Ver contexto</button></article>
          <article className="mentor-summary-row"><div><span aria-hidden="true">⌘</span><div><h4>Habilidades y tecnologías</h4><p>{proposal?.proposal.skills?.length ? proposal.proposal.skills.join(" · ") : "No hay habilidades guardadas."}</p><div className="mentor-summary-tags">{(proposal?.proposal.technologies ?? []).map((item) => <span key={item}>{item}</span>)}</div></div></div><button type="button" className="button button--secondary" onClick={() => setActiveStage(2)}>Editar</button></article>
          <article className="mentor-summary-row"><div><span aria-hidden="true">◎</span><div><h4>Objetivos y alcance</h4><ul>{proposal?.proposal.goals?.length ? proposal.proposal.goals.map((goal) => <li key={goal}>{goal}</li>) : <li>Aún no has definido objetivos.</li>}</ul><p><strong>Alcance MVP:</strong> {proposal?.proposal.scope || "Aún sin completar."}</p></div></div><button type="button" className="button button--secondary" onClick={() => setActiveStage(3)}>Editar</button></article>
        </section>
        <aside className="mentor-evaluation__panel" aria-labelledby="mentor-evaluation-title">
          <div className="mentor-preparation">
            <div className="mentor-preparation__wheel" role="progressbar" aria-label="Preparación de la propuesta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={draftProgress} style={{ "--mentor-progress": `${draftProgress}%` } as CSSProperties}><span>{draftProgress}<small>%</small></span></div>
            <div><h2 id="mentor-evaluation-title">Preparación de la propuesta</h2><p>{evaluationReady ? "Tu propuesta está lista para guardar y solicitar una evaluación." : "Completa los campos obligatorios para preparar tu propuesta."}</p></div>
          </div>
          {isDirty ? <p className="mentor-screen__hint" role="status">Tienes cambios pendientes de guardar.</p> : saveMessage ? <p className="mentor-screen__success" role="status">{saveMessage}</p> : null}
          {proposal && !evaluationReady ? <p className="mentor-screen__hint">Completa título, problema, solución, descripción, propósito, al menos un objetivo y alcance.</p> : null}
          {!proposal ? <p className="mentor-screen__hint">Guarda tu propuesta antes de solicitar una evaluación.</p> : null}
          {isDirty && evaluationReady ? <p className="mentor-screen__hint">Guarda los cambios para evaluar la versión actual.</p> : null}
          <button className="button button--primary mentor-evaluate-button" type="button" disabled={!canEvaluate} onClick={() => void evaluateProposal()}>
            {evaluation?.status === "loading" ? "Evaluando propuesta…" : evaluation?.status === "success" && evaluation.data.proposalVersion === proposal?.version ? "Reevaluar" : "Evaluar propuesta"}
          </button>
          <button className="button button--secondary mentor-save-button" type="submit" form="mentor-proposal-form" disabled={formBusy}>{saving ? "Guardando…" : "Guardar borrador"}</button>
          <p className="mentor-screen__hint" role="note">Si cumple los criterios, la propuesta se publicará automáticamente en Galería después de evaluarla.</p>
          {evaluation ? (
            <AsyncStateView
              state={evaluation}
              retryLabel="Recuperar evaluación"
              render={(result) => (
                <section className="mentor-result" aria-label="Resultado de la evaluación">
                  <div className="mentor-result__summary"><div><p className="mentor-result__label">Orientación formativa</p><h3>{viabilityLabel(result.viability)}</h3></div><p className="mentor-result__score">{result.analysis.score}/100</p></div>
                  {result.mentorContextVersion ? <p className="mentor-screen__hint">Evaluación con la versión {result.mentorContextVersion} de la rúbrica.</p> : null}
                  {result.criterionBreakdown?.length ? <ul className="mentor-findings" aria-label="Puntaje por criterio">{result.criterionBreakdown.map((criterion) => <li key={criterion.criterionId}><p className="mentor-finding__status">{criterion.title} · {criterion.points}/{criterion.weight}</p><p>{criterion.reason}</p></li>)}</ul> : null}
                  {result.analysis.findings.length ? <ul className="mentor-findings">{result.analysis.findings.map((finding, index) => <li key={`${finding.criterionId}-${index}`}><p className="mentor-finding__status">{findingStatusLabel(finding.status)}</p><p>{finding.reason}</p><ul className="mentor-finding__evidence">{finding.evidence.map((item, evidenceIndex) => <li key={`${finding.criterionId}-${evidenceIndex}`}>{evidenceLabel(item)}</li>)}</ul></li>)}</ul> : null}
                  {result.guidance.length ? <div className="mentor-guidance"><h3>Ideas para seguir</h3><ul>{result.guidance.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}</ul></div> : null}
                  {result.similarityMatches.length ? <div className="mentor-similarity"><h3>Proyectos parecidos de la galería</h3><ul>{result.similarityMatches.map((match) => <li key={match.galleryId}><strong>{match.title}</strong><span>{match.reason}</span></li>)}</ul></div> : null}
                  {result.analysis.limitations.length ? <p className="mentor-screen__hint">Límites de esta orientación: {result.analysis.limitations.join(" ")}</p> : null}
                  <button className="button button--primary" type="button" disabled={submission?.status === "loading"} onClick={() => void generateSubmission()}>{submission?.status === "loading" ? "Preparando entrega…" : "Generar entrega"}</button>
                </section>
              )}
            />
          ) : null}
          <button type="button" className="mentor-evaluation__previous" onClick={() => setActiveStage(3)}><span aria-hidden="true">←</span> Anterior</button>
        </aside>
      </section> : null}

      {activeStage === 5 ? <section className="mentor-cover" aria-labelledby="mentor-cover-title"><p className="student-screen__eyebrow">PERSONALIZA TU PROYECTO</p><h2 id="mentor-cover-title">Portada</h2>
        {coverReady ? <><p>Prompt sugerido para crear una portada geométrica coherente con tu idea:</p><pre>{coverPrompt}</pre><button type="button" className="button button--light" onClick={() => void copyCoverPrompt()}>Copiar prompt</button>{coverCopyMessage ? <p role="status">{coverCopyMessage}</p> : null}</> : <p>Completa una evaluación guardada para la versión actual antes de personalizar la portada.</p>}
        <ProjectCover className="mentor-cover__fallback" title={fields.title || "tu proyecto"} template={coverTemplateFor(`${fields.title} ${fields.technologies}`)} /><p>Usamos una portada predeterminada de Fragments. La carga de imágenes está deshabilitada porque el almacenamiento persistente y su recuperación aún no están verificados.</p>
      </section> : null}

      {submission?.status === "success" ? (
        <SubmissionDownloads submission={submission.data} onReadme={onReadme} onPdf={onPdf} />
      ) : submission ? (
        <AsyncStateView state={submission} render={() => null} />
      ) : null}
      </div></div>
      {activeStage === 1 ? <section className="mentor-choices mentor-choices--context" aria-label="Acciones de Word">
        <div className="mentor-choices__template">
          <a className="button button--light" href="/templates/fragments-mentor-propuesta.docx" download="fragments-mentor-propuesta.docx">Descargar plantilla Word</a>
          <label className="button button--light mentor-choices__upload">
            Importar propuesta (.docx)
            <input ref={importInput} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={formBusy} onChange={(event) => void importProposal(event.currentTarget.files?.[0])} aria-label="Importar propuesta (.docx)" />
          </label>
        </div>
        {importMessage ? <p className="mentor-screen__success" role="status">{importMessage}</p> : null}
        {importError ? <p className="mentor-screen__error" role="alert">{importError}</p> : null}
      </section> : null}
    </main>
  );
}
