import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Clock3, Code2, FileText, FlaskConical, GraduationCap, Microscope, Search, Send, Sparkles } from "lucide-react";
import type { ClassroomSummary, ProposalDraftResponse, SkillCatalogEntry, StudentAssignment, StudentClassroomRequest } from "@fragments/contracts";
import { studentApi } from "../../lib/api/student-api-instance";
import { assignmentsApi } from "../assignments/assignments-api.js";
import { missionContinuationDestination, type MissionContinuation } from "./mission-continuation.js";
import libraryImage from "./assets/mis-aulas-biblioteca.webp";
import skillsImage from "./assets/mis-aulas-habilidades.webp";
import "./StudentClassroomsScreen.css";

type Props = {
  classrooms: ClassroomSummary[];
  requests: StudentClassroomRequest[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  proposals?: ProposalDraftResponse[];
  proposalsLoading?: boolean;
  proposalsError?: boolean;
  onRetryProposals?: () => void;
  onContinueProposal?: (proposal: ProposalDraftResponse) => void;
  onStartProposal?: (assignment: StudentAssignment) => void;
};

type MainView = "classes" | "inventory" | "requests" | "detail";
type DetailTab = "missions" | "skills";
type MissionPhase = { status: "loading" } | { status: "error"; proposalId: string } | { status: "ready"; proposalId: string | null; destination: MissionContinuation | null };

const classColors = ["#61a9ff", "#d4ff24", "#ba91ff", "#ffbf69", "#55d4c1", "#ff8ea1"];
const missionPageSize = 3;
const classroomPageSize = 8;

function colorForClassroom(id: string) {
  const hash = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return classColors[hash % classColors.length] ?? classColors[0]!;
}

function ClassroomGlyph({ subject }: { subject: string }) {
  const normalized = subject.toLocaleLowerCase("es");
  if (/cien|biolog|qu[ií]m|f[ií]s|natur|laboratorio/.test(normalized)) return <FlaskConical aria-hidden="true" />;
  if (/program|inform|comput|tecnolog|software|sistemas/.test(normalized)) return <Code2 aria-hidden="true" />;
  if (/arte|diseñ|visual/.test(normalized)) return <Sparkles aria-hidden="true" />;
  if (/matem|estad[ií]st|l[oó]gica/.test(normalized)) return <Microscope aria-hidden="true" />;
  return <BookOpen aria-hidden="true" />;
}

function statusLabel(status: StudentClassroomRequest["status"]) {
  return status === "pending" ? "Pendiente de aprobación" : status === "active" ? "Activa" : status === "rejected" ? "Rechazada" : "Retirada";
}

function continuationLabel(destination: MissionContinuation) {
  return destination.destination === "/student/mentor" ? "Mentor" : destination.destination === "/student/review" ? "Review" : "Trainer";
}

function formatRequestDate(date: string) {
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp) ? null : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(timestamp);
}

export function StudentClassroomsScreen({ classrooms, requests, loading, error, onRefresh, proposals = [], proposalsLoading = true, proposalsError = false, onRetryProposals, onContinueProposal, onStartProposal }: Props) {
  const [view, setView] = useState<MainView>("classes");
  const [detailTab, setDetailTab] = useState<DetailTab>("missions");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [classSearch, setClassSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [skillScope, setSkillScope] = useState("all");
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState<Record<string, SkillCatalogEntry[] | null | undefined>>({});
  const [assignments, setAssignments] = useState<Record<string, StudentAssignment[] | null | undefined>>({});
  const [missionPhases, setMissionPhases] = useState<Record<string, MissionPhase | undefined>>({});
  const inFlight = useRef(new Set<string>());
  const phaseInFlight = useRef(new Set<string>());
  const pageHeading = useRef<HTMLHeadingElement | null>(null);

  const activeClassrooms = useMemo(() => classrooms.filter((room) => room.status === "active"), [classrooms]);
  const selectedClassroom = activeClassrooms.find((room) => room.id === selectedClassroomId) ?? null;
  const selectedMissions = selectedClassroom ? assignments[selectedClassroom.id] : undefined;
  const selectedSkills = selectedClassroom ? skills[selectedClassroom.id] : undefined;
  const recentProposals = useMemo(() => [...proposals].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)), [proposals]);

  const loadSkills = useCallback(async (classroomId: string) => {
    const requestKey = `${classroomId}:skills`;
    if (inFlight.current.has(requestKey)) return;
    inFlight.current.add(requestKey);
    setSkills((current) => ({ ...current, [classroomId]: undefined }));
    try {
      const result = await studentApi.getMyClassroomSkills(classroomId);
      setSkills((current) => ({ ...current, [classroomId]: result.ok ? result.data.filter((skill) => !skill.archived) : null }));
    } catch {
      setSkills((current) => ({ ...current, [classroomId]: null }));
    } finally {
      inFlight.current.delete(requestKey);
    }
  }, []);

  const loadMissions = useCallback(async (classroomId: string) => {
    const requestKey = `${classroomId}:missions`;
    if (inFlight.current.has(requestKey)) return;
    inFlight.current.add(requestKey);
    setAssignments((current) => ({ ...current, [classroomId]: undefined }));
    try {
      const result = await assignmentsApi.listStudent(classroomId);
      setAssignments((current) => ({ ...current, [classroomId]: result.ok ? result.data.filter((item) => item.classroomId === classroomId) : null }));
    } catch {
      setAssignments((current) => ({ ...current, [classroomId]: null }));
    } finally {
      inFlight.current.delete(requestKey);
    }
  }, []);

  const loadMissionPhase = useCallback(async (assignment: StudentAssignment, retry = false) => {
    const linkedProposal = recentProposals.find((proposal) => proposal.assignmentVersionId === assignment.id);
    const previous = missionPhases[assignment.id];
    if (!retry && previous?.status === "ready" && previous.proposalId === (linkedProposal?.id ?? null)) return;
    if (!retry && previous?.status === "error" && previous.proposalId === linkedProposal?.id) return;
    if (phaseInFlight.current.has(assignment.id)) return;
    if (proposalsLoading || proposalsError) return;
    if (!linkedProposal) {
      setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "ready", proposalId: null, destination: null } }));
      return;
    }

    phaseInFlight.current.add(assignment.id);
    setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "loading" } }));
    try {
      const submissions = await studentApi.getMySubmissions();
      if (!submissions.ok) {
        setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "error", proposalId: linkedProposal.id } }));
        return;
      }
      const mentorEvaluationExists = submissions.data.some((submission) => submission.kind === "mentor" && submission.sourceId === linkedProposal.id);
      if (!mentorEvaluationExists) {
        setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "ready", proposalId: linkedProposal.id, destination: missionContinuationDestination(false) } }));
        return;
      }
      const history = await studentApi.getMissionDeliveryHistory(linkedProposal.id);
      if (!history.ok) {
        setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "error", proposalId: linkedProposal.id } }));
        return;
      }
      setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "ready", proposalId: linkedProposal.id, destination: missionContinuationDestination(true, history.data) } }));
    } catch {
      setMissionPhases((current) => ({ ...current, [assignment.id]: { status: "error", proposalId: linkedProposal.id } }));
    } finally {
      phaseInFlight.current.delete(assignment.id);
    }
  }, [missionPhases, proposalsError, proposalsLoading, recentProposals]);

  useEffect(() => {
    setSkills(Object.fromEntries(activeClassrooms.map((room) => [room.id, undefined])));
    setAssignments(Object.fromEntries(activeClassrooms.map((room) => [room.id, undefined])));
    for (const room of activeClassrooms) {
      void loadSkills(room.id);
      void loadMissions(room.id);
    }
  }, [activeClassrooms, loadSkills, loadMissions]);

  useEffect(() => {
    if (view !== "detail" || !expandedMissionId || !selectedMissions || selectedMissions === null) return;
    const assignment = selectedMissions.find((item) => item.id === expandedMissionId);
    if (assignment) void loadMissionPhase(assignment);
  }, [expandedMissionId, loadMissionPhase, selectedMissions, view]);

  useEffect(() => {
    if (!selectedClassroom && view === "detail") setView("classes");
  }, [selectedClassroom, view]);

  useEffect(() => {
    pageHeading.current?.focus();
  }, [selectedClassroom?.id, view]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const result = await studentApi.requestClassroom(code.trim());
      if (!result.ok) {
        setMessage(result.error.code === "INVALID_JOIN_CODE" ? "El código no es válido o ya no está activo." : result.error.code === "JOIN_CODE_RATE_LIMITED" ? "Alcanzaste el límite de intentos. Espera antes de probar de nuevo." : result.error.code === "ENROLLMENT_CONFLICT" ? "La solicitud anterior necesita una decisión docente. Contacta a tu docente." : result.error.message);
        return;
      }
      setCode("");
      setMessage("Solicitud enviada. Tu docente debe aprobarla antes de que puedas ver el aula.");
      onRefresh();
    } catch {
      setMessage("No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const visibleClassrooms = useMemo(() => {
    const query = classSearch.trim().toLocaleLowerCase("es");
    const filtered = activeClassrooms.filter((room) => [room.title, room.subject, room.groupLabel, room.period ?? ""].join(" ").toLocaleLowerCase("es").includes(query));
    return { filtered, visible: filtered.slice(0, showAllClasses ? filtered.length : classroomPageSize) };
  }, [activeClassrooms, classSearch, showAllClasses]);

  const inventory = useMemo(() => {
    const map = new Map<string, { skill: SkillCatalogEntry; origins: ClassroomSummary[] }>();
    for (const room of activeClassrooms) {
      if (skillScope !== "all" && room.id !== skillScope) continue;
      for (const skill of skills[room.id] ?? []) {
        const entry = map.get(skill.id);
        if (entry) {
          if (!entry.origins.some((origin) => origin.id === room.id)) entry.origins.push(room);
        } else {
          map.set(skill.id, { skill, origins: [room] });
        }
      }
    }
    const query = skillSearch.trim().toLocaleLowerCase("es");
    const items = [...map.values()].filter(({ skill, origins }) => [skill.name, skill.description ?? "", ...origins.map((room) => room.title)].join(" ").toLocaleLowerCase("es").includes(query));
    items.sort((left, right) => left.skill.name.localeCompare(right.skill.name, "es") || left.skill.id.localeCompare(right.skill.id, "es"));
    return items;
  }, [activeClassrooms, skillScope, skillSearch, skills]);

  function openClassroom(classroomId: string) {
    setSelectedClassroomId(classroomId);
    setDetailTab("missions");
    setShowAllMissions(false);
    setExpandedMissionId(null);
    setView("detail");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function openRelatedMission(classroomId: string, assignment: StudentAssignment) {
    setSelectedClassroomId(classroomId);
    setDetailTab("missions");
    setShowAllMissions(false);
    setExpandedMissionId(assignment.id);
    setView("detail");
  }

  const tabButton = (nextView: Exclude<MainView, "detail">, label: string) => <button type="button" className="mis-aulas__tab" aria-label={label} aria-pressed={view === nextView} onClick={() => { setView(nextView); setMessage(""); }}>{label}</button>;

  return <main className="mis-aulas" aria-labelledby="mis-aulas-title">
    <div className="mis-aulas__topline">
      <div className="mis-aulas__brand"><span className="mis-aulas__brand-icon"><GraduationCap aria-hidden="true" /></span><span>MI APRENDIZAJE</span></div>
      <nav className="mis-aulas__tabs" aria-label="Secciones de Mis aulas">
        {tabButton("classes", "Aulas")}
        {tabButton("inventory", "Inventario de habilidades")}
        {tabButton("requests", "Solicitudes")}
      </nav>
    </div>

    {view === "classes" ? <>
      <header className="mis-aulas__hero">
        <div className="mis-aulas__hero-copy"><p className="mis-aulas__eyebrow">TU BIBLIOTECA DE APRENDIZAJE</p><h1 ref={pageHeading} tabIndex={-1} id="mis-aulas-title">Mis aulas<span aria-hidden="true">.</span></h1><p>Encuentra tus grupos y continúa con las misiones publicadas por tus docentes.</p></div>
        <img className="mis-aulas__hero-art" src={libraryImage} alt="" aria-hidden="true" />
      </header>
      <section className="mis-aulas__class-section" aria-labelledby="mis-aulas-classes-heading">
        <div className="mis-aulas__section-heading"><div><p className="mis-aulas__eyebrow">ESPACIOS ACTIVOS</p><h2 id="mis-aulas-classes-heading">Aulas activas <span>({activeClassrooms.length})</span></h2></div><label className="mis-aulas__search"><Search aria-hidden="true" /><span className="mis-aulas__sr-only">Buscar aula por nombre, asignatura o grupo</span><input type="search" value={classSearch} onChange={(event) => { setClassSearch(event.target.value); setShowAllClasses(false); }} placeholder="Buscar aula, asignatura o grupo" /></label></div>
        {loading ? <p className="mis-aulas__state" role="status">Cargando tus aulas y solicitudes…</p> : error ? <div className="mis-aulas__state mis-aulas__state--error" role="alert"><p>{error}</p><button type="button" className="mis-aulas__text-button" onClick={onRefresh}>Reintentar</button></div> : activeClassrooms.length ? <>
          {visibleClassrooms.filtered.length ? <div className="mis-aulas__class-grid">{visibleClassrooms.visible.map((room) => <button key={room.id} type="button" className="mis-aulas__class-card" aria-label={`Abrir aula ${room.title}`} style={{ "--class-accent": colorForClassroom(room.id) } as CSSProperties} onClick={() => openClassroom(room.id)}><span className="mis-aulas__class-icon"><ClassroomGlyph subject={room.subject} /></span><span className="mis-aulas__class-copy"><strong>{room.title}</strong><small>{room.subject} · {room.groupLabel}{room.period ? ` · ${room.period}` : ""}</small></span><ArrowRight aria-hidden="true" /></button>)}</div> : <p className="mis-aulas__state">No se encontraron aulas con esa búsqueda.</p>}
          {visibleClassrooms.filtered.length > classroomPageSize ? <button type="button" className="mis-aulas__more" aria-label={showAllClasses ? "Ver menos aulas" : "Ver más aulas"} onClick={() => setShowAllClasses((show) => !show)}>{showAllClasses ? "Ver menos aulas" : `Ver más aulas (${visibleClassrooms.filtered.length - visibleClassrooms.visible.length})`}<ChevronDown aria-hidden="true" data-open={showAllClasses} /></button> : null}
        </> : <p className="mis-aulas__empty">Aún no tienes matrículas activas. Cuando tu docente apruebe una solicitud, el aula aparecerá aquí.</p>}
      </section>
    </> : null}

    {view === "detail" && selectedClassroom ? <section className="mis-aulas__detail" aria-labelledby="mis-aulas-title">
      <button type="button" className="mis-aulas__back" onClick={() => { setView("classes"); setExpandedMissionId(null); }}><ArrowLeft aria-hidden="true" /> Volver a mis aulas</button>
      <header className="mis-aulas__detail-heading" style={{ "--class-accent": colorForClassroom(selectedClassroom.id) } as CSSProperties}>
        <span className="mis-aulas__class-icon"><ClassroomGlyph subject={selectedClassroom.subject} /></span>
        <div><p className="mis-aulas__eyebrow">AULA ACTIVA</p><h1 ref={pageHeading} tabIndex={-1} id="mis-aulas-title">{selectedClassroom.title}</h1><p>{selectedClassroom.subject} · {selectedClassroom.groupLabel}{selectedClassroom.period ? ` · ${selectedClassroom.period}` : ""}</p></div>
        <span className="mis-aulas__active-badge"><CheckCircle2 aria-hidden="true" /> Matrícula activa</span>
      </header>
      <div className="mis-aulas__detail-tabs" role="group" aria-label="Contenido del aula"><button type="button" aria-pressed={detailTab === "missions"} onClick={() => setDetailTab("missions")}>Misiones <span>({selectedMissions?.length ?? 0})</span></button><button type="button" aria-pressed={detailTab === "skills"} onClick={() => setDetailTab("skills")}>Habilidades del aula <span>({selectedSkills?.length ?? 0})</span></button></div>

      {detailTab === "missions" ? <section className="mis-aulas__mission-section" aria-label="Misiones del aula">
        {selectedMissions === undefined ? <p role="status" className="mis-aulas__state">Cargando misiones…</p> : selectedMissions === null ? <div className="mis-aulas__state mis-aulas__state--error" role="alert"><p>No pudimos cargar las misiones de esta aula.</p><button type="button" className="mis-aulas__text-button" onClick={() => void loadMissions(selectedClassroom.id)}>Reintentar misiones</button></div> : selectedMissions.length ? <>
          <p className="mis-aulas__section-note">Misiones publicadas por tu docente para este grupo.</p>
          <div className="mis-aulas__mission-list">{(showAllMissions ? selectedMissions : selectedMissions.slice(0, missionPageSize)).map((assignment) => {
            const expanded = expandedMissionId === assignment.id;
            const linkedProposal = recentProposals.find((proposal) => proposal.assignmentVersionId === assignment.id);
            const phase = missionPhases[assignment.id];
            return <article className="mis-aulas__mission" key={assignment.id}>
              <div className="mis-aulas__mission-summary"><span className="mis-aulas__mission-icon"><FileText aria-hidden="true" /></span><div className="mis-aulas__mission-copy"><p className="mis-aulas__eyebrow">MISIÓN PUBLICADA V{assignment.version}</p><h2>{assignment.title}</h2><p>{assignment.objectives[0]}</p></div><button type="button" className="mis-aulas__mission-toggle" aria-label={`${expanded ? "Cerrar" : "Ver"} misión ${assignment.title}`} aria-expanded={expanded} onClick={() => setExpandedMissionId((current) => current === assignment.id ? null : assignment.id)}>{expanded ? "Cerrar" : "Ver misión"}<ChevronDown aria-hidden="true" data-open={expanded} /></button></div>
              {expanded ? <div className="mis-aulas__mission-detail">
                <p className="mis-aulas__version-note">Misión publicada v{assignment.version} · Contexto Mentor v{assignment.mentorContextVersion}</p>
                <h3>Contexto</h3><p>{assignment.instructions}</p>
                <details className="mis-aulas__context"><summary>Contexto para tu propuesta · versión {assignment.mentorContext.version}</summary><div><p><strong>{assignment.mentorContext.config.theme}</strong></p><p>{assignment.mentorContext.config.assignment}</p><p>Nivel esperado: {assignment.mentorContext.config.expectedLevel}</p>{assignment.mentorContext.config.requirements.length ? <><h4>Requisitos</h4><ul>{assignment.mentorContext.config.requirements.map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}</ul></> : null}</div></details>
                <h3>Objetivos</h3><ul>{assignment.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
                <h3>Habilidades requeridas</h3><ul className="mis-aulas__skill-chips">{assignment.requiredSkills.map((skill) => <li key={skill.id}>{skill.name}</li>)}</ul>
                {assignment.optionalSkills.length ? <><h3>Habilidades optativas</h3><ul className="mis-aulas__skill-chips">{assignment.optionalSkills.map((skill) => <li key={skill.id}>{skill.name}</li>)}</ul></> : null}
                {assignment.missionRubric ? <section className="mis-aulas__rubric" aria-label={assignment.missionRubric.title}><h3>{assignment.missionRubric.title}</h3><ul>{assignment.missionRubric.criteria.map((criterion) => <li key={criterion.id}><strong>{criterion.title}</strong><span>{criterion.weight}/100</span><p>{criterion.description}</p></li>)}</ul></section> : assignment.missionPlanVersion === 1 ? <p className="mis-aulas__muted">Esta versión publicada no contiene una rúbrica propia de misión.</p> : <p role="status" className="mis-aulas__muted">Esta versión histórica no informa su rúbrica de misión.</p>}
                {assignment.mentorContext.config.criteria.length ? <section className="mis-aulas__context-rubric" aria-label={assignment.mentorContext.config.rubricTitle}><h3>Rúbrica de contexto · {assignment.mentorContext.config.rubricTitle}</h3><ul>{assignment.mentorContext.config.criteria.map((criterion) => <li key={criterion.id}><strong>{criterion.title}</strong><span>{criterion.weight}/100</span><p>{criterion.description}</p></li>)}</ul></section> : null}
                {(assignment.deliverables ?? []).length ? <section className="mis-aulas__deliverables" aria-label="Entregas de la misión"><h3>Entregas</h3><ol>{assignment.deliverables.map((deliverable) => <li key={deliverable.id}><strong>{deliverable.title}</strong><span>{deliverable.type === "proposal" ? "Propuesta" : deliverable.type === "progress" ? "Avance" : "Final"}{deliverable.dueDate ? ` · ${deliverable.dueDate}` : " · Sin fecha"}</span><ul>{deliverable.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><p>Criterios: {deliverable.criterionIds.map((id) => assignment.missionRubric?.criteria.find((criterion) => criterion.id === id)?.title).filter(Boolean).join(", ") || "Sin criterios asignados"}</p></li>)}</ol></section> : assignment.missionPlanVersion === 1 ? <p className="mis-aulas__muted">Esta versión publicada no contiene entregas configuradas.</p> : <p className="mis-aulas__muted">Esta versión histórica no informa sus entregas.</p>}
                <div className="mis-aulas__phase" aria-live="polite"><p className="mis-aulas__eyebrow">CONTINUIDAD ACADÉMICA</p>
                  {proposalsLoading ? <p role="status">Consultando la propuesta vinculada…</p> : proposalsError ? <div role="alert"><p>No pudimos consultar tus propuestas. Reintenta antes de iniciar o continuar.</p>{onRetryProposals ? <button type="button" className="mis-aulas__text-button" onClick={onRetryProposals}>Reintentar propuestas</button> : null}</div> : phase?.status === "loading" || !phase ? <p role="status">Consultando la fase académica guardada…</p> : phase.status === "error" ? <div role="alert"><p>No pudimos confirmar la fase guardada. No abrimos otra etapa.</p><button type="button" className="mis-aulas__text-button" onClick={() => void loadMissionPhase(assignment, true)}>Reintentar</button></div> : <><p><strong>Fase académica:</strong> {phase.destination ? continuationLabel(phase.destination) : "Por iniciar"}</p><p><strong>Siguiente acción:</strong> {phase.destination ? `Continuar en ${continuationLabel(phase.destination)}` : "Iniciar propuesta"}</p>
                    {phase.destination ? <button type="button" className="mis-aulas__primary" aria-label={`Continuar misión: ${assignment.title}`} disabled={!onContinueProposal} onClick={() => linkedProposal && onContinueProposal?.(linkedProposal)}>Continuar en {continuationLabel(phase.destination)} <ArrowRight aria-hidden="true" /></button> : <button type="button" className="mis-aulas__primary" aria-label={`Iniciar propuesta: ${assignment.title}`} disabled={!onStartProposal} onClick={() => onStartProposal?.(assignment)}>Iniciar propuesta <ArrowRight aria-hidden="true" /></button>}
                  </>}
                  {!assignment.missionPlanVersion ? <p className="mis-aulas__muted">El servidor aún no informa las entregas versionadas de esta misión. Puedes continuar la propuesta con el contexto publicado disponible.</p> : null}
                </div>
              </div> : null}
            </article>;
          })}</div>
          {selectedMissions.length > missionPageSize ? <button type="button" className="mis-aulas__more" aria-label={showAllMissions ? "Ver menos misiones" : "Ver más misiones"} onClick={() => { setShowAllMissions((show) => !show); if (showAllMissions && expandedMissionId && selectedMissions.slice(0, missionPageSize).every((item) => item.id !== expandedMissionId)) setExpandedMissionId(null); }}>{showAllMissions ? "Ver menos misiones" : `Ver más misiones (${selectedMissions.length - missionPageSize})`}<ChevronDown aria-hidden="true" data-open={showAllMissions} /></button> : null}
        </> : <p className="mis-aulas__empty">Tu docente aún no ha publicado misiones en esta aula.</p>}
      </section> : null}

      {detailTab === "skills" ? <section className="mis-aulas__class-skills" aria-label="Habilidades autorizadas del aula">
        {selectedSkills === undefined ? <p role="status" className="mis-aulas__state">Cargando habilidades…</p> : selectedSkills === null ? <div className="mis-aulas__state mis-aulas__state--error" role="alert"><p>No pudimos cargar las habilidades de esta aula.</p><button type="button" className="mis-aulas__text-button" onClick={() => void loadSkills(selectedClassroom.id)}>Reintentar habilidades</button></div> : selectedSkills.length ? <div className="mis-aulas__skill-grid">{selectedSkills.map((skill) => <article className="mis-aulas__skill-card" key={skill.id} data-skill-id={skill.id}><span className="mis-aulas__skill-icon"><Code2 aria-hidden="true" /></span><div><h2>{skill.name}</h2>{skill.description ? <p>{skill.description}</p> : null}<p className="mis-aulas__muted">Habilidad habilitada · No equivale a dominio demostrado.</p></div></article>)}</div> : <p className="mis-aulas__empty">Aún no hay habilidades habilitadas en esta aula.</p>}
      </section> : null}
    </section> : null}

    {view === "inventory" ? <>
      <header className="mis-aulas__hero mis-aulas__hero--inventory"><div className="mis-aulas__hero-copy"><p className="mis-aulas__eyebrow">HABILIDADES HABILITADAS</p><h1 ref={pageHeading} tabIndex={-1} id="mis-aulas-title">Inventario de habilidades<span aria-hidden="true">.</span></h1><p>Consulta las habilidades disponibles en tus aulas activas y las misiones donde se trabajan.</p></div><img className="mis-aulas__hero-art" src={skillsImage} alt="" aria-hidden="true" /></header>
      <section className="mis-aulas__inventory" aria-label="Inventario de habilidades">
        <div className="mis-aulas__inventory-tools"><label className="mis-aulas__search"><Search aria-hidden="true" /><span className="mis-aulas__sr-only">Buscar habilidad por nombre o descripción</span><input type="search" value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} placeholder="Buscar habilidad" /></label><label className="mis-aulas__filter">Filtrar por aula<select id="skillScope" value={skillScope} onChange={(event) => setSkillScope(event.target.value)}><option value="all">Todas mis aulas activas</option>{activeClassrooms.map((room) => <option value={room.id} key={room.id}>{room.title}</option>)}</select></label></div>
        {activeClassrooms.some((room) => skills[room.id] === undefined) ? <p className="mis-aulas__state" role="status">Cargando habilidades autorizadas…</p> : null}
        {activeClassrooms.some((room) => skills[room.id] === null) ? <div className="mis-aulas__state mis-aulas__state--error" role="alert"><p>No pudimos cargar las habilidades de una o más aulas. Puedes consultar las que sí están disponibles.</p>{activeClassrooms.filter((room) => skills[room.id] === null).map((room) => <button type="button" className="mis-aulas__text-button" key={room.id} onClick={() => void loadSkills(room.id)}>Reintentar {room.title}</button>)}</div> : null}
        {inventory.length ? <div className="mis-aulas__inventory-list">{inventory.map(({ skill, origins }) => {
          const related = origins.flatMap((origin) => (assignments[origin.id] ?? []).filter((assignment) => [...assignment.requiredSkills, ...assignment.optionalSkills].some((snapshot) => snapshot.id === skill.id)).map((assignment) => ({ origin, assignment })));
          return <article className="mis-aulas__inventory-item" data-skill-id={skill.id} key={skill.id}><span className="mis-aulas__skill-icon"><Code2 aria-hidden="true" /></span><div className="mis-aulas__inventory-copy"><h2>{skill.name}</h2>{skill.description ? <p>{skill.description}</p> : null}<p className="mis-aulas__muted">Habilidad habilitada · No equivale a dominio demostrado.</p><div className="mis-aulas__origins"><span>Disponible en:</span>{origins.map((room) => <span key={room.id} style={{ "--class-accent": colorForClassroom(room.id) } as CSSProperties}>{room.title}</span>)}</div></div><details className="mis-aulas__related"><summary>Misiones relacionadas <span>({related.length})</span></summary>{related.length ? <ul>{related.map(({ origin, assignment }) => <li key={`${origin.id}:${assignment.id}`}><button type="button" onClick={() => openRelatedMission(origin.id, assignment)}>{assignment.title} · {origin.title}<ArrowRight aria-hidden="true" /></button></li>)}</ul> : <p>Esta habilidad no está vinculada a misiones publicadas de tus aulas activas.</p>}</details></article>;
        })}</div> : !activeClassrooms.some((room) => skills[room.id] === undefined || skills[room.id] === null) ? <p className="mis-aulas__empty">{activeClassrooms.length ? "No hay habilidades autorizadas que coincidan con tu búsqueda." : "Aún no tienes matrículas activas con habilidades autorizadas."}</p> : null}
        <p className="mis-aulas__inventory-count">{inventory.length} habilidades disponibles · No equivale a dominio demostrado.</p>
      </section>
    </> : null}

    {view === "requests" ? <>
      <header className="mis-aulas__simple-heading"><p className="mis-aulas__eyebrow">INCORPORACIÓN</p><h1 ref={pageHeading} tabIndex={-1} id="mis-aulas-title">Solicitudes<span aria-hidden="true">.</span></h1><p>Solicita acceso con el código de tu docente y consulta el estado de tus solicitudes.</p></header>
      <section className="mis-aulas__join" aria-labelledby="mis-aulas-join-heading"><div className="mis-aulas__join-heading"><span><Send aria-hidden="true" /></span><div><p className="mis-aulas__eyebrow">CÓDIGO DE TU DOCENTE</p><h2 id="mis-aulas-join-heading">Solicitar ingreso a un aula</h2></div></div>
        <form onSubmit={(event) => void submit(event)}><label htmlFor="classroom-join-code">Código de incorporación</label><div className="mis-aulas__join-row"><input id="classroom-join-code" name="code" autoComplete="off" minLength={32} maxLength={64} pattern="[A-Za-z0-9_-]{32,64}" required value={code} onChange={(event) => setCode(event.target.value)} aria-describedby="classroom-code-help" /><button type="submit" className="mis-aulas__primary" disabled={busy}>{busy ? "Enviando…" : "Solicitar ingreso"}<ArrowRight aria-hidden="true" /></button></div><small id="classroom-code-help">La solicitud queda pendiente hasta que el docente la apruebe.</small></form>
        {message ? <p className="mis-aulas__notice" role="status">{message}</p> : null}
      </section>
      <section className="mis-aulas__requests" aria-labelledby="mis-aulas-requests-heading"><div className="mis-aulas__section-heading"><div><p className="mis-aulas__eyebrow">SEGUIMIENTO</p><h2 id="mis-aulas-requests-heading">Tus solicitudes <span>({requests.filter((request) => request.status !== "active").length})</span></h2></div></div>
        {requests.filter((request) => request.status !== "active").length ? <ul>{requests.filter((request) => request.status !== "active").map((request) => <li key={request.id}><span className="mis-aulas__request-icon">{request.status === "pending" ? <Clock3 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span><span className="mis-aulas__request-copy"><strong>{request.source === "join_code" ? "Solicitud por código" : "Solicitud del docente"}</strong>{formatRequestDate(request.requestedAt) ? <small>Enviada el {formatRequestDate(request.requestedAt)}</small> : null}</span><span className="mis-aulas__request-status" data-status={request.status}>{statusLabel(request.status)}</span></li>)}</ul> : <p className="mis-aulas__empty">No tienes solicitudes pendientes, rechazadas ni retiradas.</p>}
      </section>
    </> : null}
  </main>;
}
