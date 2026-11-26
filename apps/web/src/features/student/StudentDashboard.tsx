import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock3, ExternalLink, Flag, Play, RotateCcw } from "lucide-react";
import type { ClassroomSummary, MissionDeliveryHistory, ProposalDraftResponse, StudentAssignment, StudentClassroomRequest, StudentMe, StudentSubmissionsResponse } from "@fragments/contracts";
import type { AsyncState } from "../../hooks/async-state";
import { missionContinuationDestination } from "./mission-continuation.js";
import guideArt from "./assets/mi-espacio-guia.webp";
import missionsArt from "./assets/mi-espacio-misiones.webp";
import "./StudentDashboard.css";

type Filter = "all" | "in-progress" | "starting" | "completed";
type DeliveryHistoryState = { status: "loading" } | { status: "success"; data: MissionDeliveryHistory } | { status: "error" };
type StudentDashboardProps = {
  student: StudentMe;
  classrooms: ClassroomSummary[];
  classroomRequests: StudentClassroomRequest[];
  classroomsLoading: boolean;
  classroomsError: string | null;
  onRetryClassrooms: () => void;
  proposals: ProposalDraftResponse[];
  proposalsLoading: boolean;
  proposalsError: boolean;
  onRetryProposals: () => void;
  missions: StudentAssignment[];
  missionsLoading: boolean;
  missionsError: boolean;
  onRetryMissions: () => void;
  submissions: AsyncState<StudentSubmissionsResponse>;
  onRetrySubmissions: () => void;
  onContinueProposal: (proposal: ProposalDraftResponse) => void;
  onLoadDeliveryHistory: (proposalId: string) => Promise<{ ok: true; data: MissionDeliveryHistory } | { ok: false; error: { code: string; message: string } }>;
  onStartMission: (assignment: StudentAssignment) => void;
  onCreateProposal: () => void;
  onNavigate: (path: string) => void;
};

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "in-progress", label: "En curso" },
  { id: "starting", label: "Por iniciar" },
  { id: "completed", label: "Completadas" },
];

export function StudentDashboard({ student, classrooms, classroomRequests, classroomsLoading, classroomsError, onRetryClassrooms, proposals, proposalsLoading, proposalsError, onRetryProposals, missions, missionsLoading, missionsError, onRetryMissions, submissions, onRetrySubmissions, onContinueProposal, onLoadDeliveryHistory, onStartMission, onCreateProposal, onNavigate }: StudentDashboardProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [historyByProposal, setHistoryByProposal] = useState<Record<string, DeliveryHistoryState>>({});
  const latestSubmission = submissions.status === "success"
    ? [...submissions.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;
  const recentProposals = useMemo(() => [...proposals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [proposals]);
  const continueProposal = recentProposals[0];
  const continueProposalMission = !missionsLoading && !missionsError && continueProposal?.assignmentVersionId
    ? missions.find((mission) => mission.id === continueProposal.assignmentVersionId)
    : undefined;
  const proposalForMission = (assignment: StudentAssignment) => recentProposals.find((draft) => draft.assignmentVersionId === assignment.id);
  const mentorEvaluatedProposalIds = useMemo(() => new Set(submissions.status === "success"
    ? submissions.data.filter((item) => item.kind === "mentor").map((item) => item.sourceId)
    : []), [submissions]);
  const proposalsNeedingHistory = useMemo(() => {
    const linkedProposalIds = new Set(recentProposals.flatMap((proposal) => proposal.assignmentVersionId && missions.some((mission) => mission.id === proposal.assignmentVersionId) && mentorEvaluatedProposalIds.has(proposal.id) ? [proposal.id] : []));
    return [...linkedProposalIds].filter((id) => !historyByProposal[id]);
  }, [missions, recentProposals, mentorEvaluatedProposalIds, historyByProposal]);

  useEffect(() => {
    if (!proposalsNeedingHistory.length) return;
    let active = true;
    const requestedIds = proposalsNeedingHistory;
    void Promise.all(requestedIds.map(async (id) => {
      try {
        const result = await onLoadDeliveryHistory(id);
        return [id, result.ok ? { status: "success", data: result.data } : { status: "error" }] as const;
      } catch {
        return [id, { status: "error" }] as const;
      }
    })).then((entries) => {
      if (active) setHistoryByProposal((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
    return () => { active = false; };
  }, [proposalsNeedingHistory, onLoadDeliveryHistory]);

  const proposalIsPrimary = !proposalsLoading && !proposalsError && Boolean(continueProposal);
  const primaryMissionVersionId = proposalIsPrimary ? continueProposal?.assignmentVersionId : undefined;
  const choosingMission = !proposalsLoading && !proposalsError && !continueProposal && !missionsLoading && !missionsError && missions.length > 1;
  const dashboardMission = proposalsLoading || proposalsError || continueProposal || missionsLoading || missionsError || choosingMission ? undefined : missions[0];
  const missionList = missions.filter((mission) => mission.id !== primaryMissionVersionId && mission.id !== dashboardMission?.id);
  const statusOf = (mission: StudentAssignment): Filter => proposalForMission(mission) ? "in-progress" : "starting";
  const counts: Record<Filter, number> = {
    all: missionList.length,
    "in-progress": missionList.filter((mission) => statusOf(mission) === "in-progress").length,
    starting: missionList.filter((mission) => statusOf(mission) === "starting").length,
    // The current contract has no mission-completion record; Trainer availability is deliberately not treated as completion.
    completed: 0,
  };
  const filteredMissions = filter === "all" ? missionList : missionList.filter((mission) => statusOf(mission) === filter);
  const visibleMissions = expanded ? filteredMissions : filteredMissions.slice(0, 3);
  const hasOverflow = filteredMissions.length > 3;
  const githubIdentity = student.githubLogin
    ? student.profileUrl
      ? <a className="mi-space__github-link" href={student.profileUrl} target="_blank" rel="noreferrer">@{student.githubLogin}<ExternalLink size={13} aria-hidden="true" /></a>
      : <span>@{student.githubLogin}</span>
    : <span>Estudiante</span>;

  const missionPhase = (mission: StudentAssignment) => {
    const proposal = proposalForMission(mission);
    if (!proposal) return "Por iniciar";
    if (submissions.status === "loading") return "Consultando etapa";
    if (submissions.status === "error") return "Estado de continuidad no disponible";
    if (!mentorEvaluatedProposalIds.has(proposal.id)) return "Mentor · propuesta";
    const history = historyByProposal[proposal.id];
    if (history?.status !== "success") return history?.status === "error" ? "Revisar estado" : "Consultando etapa";
    if (history.data.deliveries.some((delivery) => delivery.status === "running")) return "Review · análisis en curso";
    if (history.data.deliveries.some((delivery) => delivery.status === "queued")) return "Review · análisis en cola";
    if (history.data.deliveries.some((delivery) => delivery.status === "failed")) return "Review · requiere un nuevo intento";
    const continuation = missionContinuationDestination(true, history.data);
    return continuation.destination === "/student/trainer" ? "Trainer · practicar" : "Review · siguiente entrega";
  };
  const continueOrStartMission = (assignment: StudentAssignment) => {
    const linkedProposal = proposalForMission(assignment);
    if (linkedProposal) onContinueProposal(linkedProposal);
    else onStartMission(assignment);
  };

  return <main className="mi-space" aria-labelledby="mi-space-title">
    <header className="mi-space__header">
      <div className="mi-space__title"><p className="mi-space__eyebrow">TU ESPACIO DE APRENDIZAJE</p><h1 id="mi-space-title">Mi espacio</h1></div>
      <div className="mi-space__identity">
        {student.avatarUrl ? <img src={student.avatarUrl} alt="" width="44" height="44" /> : <span className="mi-space__avatar-fallback" aria-hidden="true">{student.githubLogin?.slice(0, 1).toUpperCase() ?? "F"}</span>}
        <div><strong>{githubIdentity}</strong><small>Cuenta GitHub</small></div>
      </div>
    </header>

    <section className="mi-space__continue" aria-labelledby="mi-space-continue-title">
      <div className="mi-space__continue-art"><img src={guideArt} alt="" width="190" height="192" /></div>
      <div className="mi-space__continue-copy">
        <p className="mi-space__eyebrow">SIGUIENTE PASO</p>
        <h2 id="mi-space-continue-title">Continúa donde lo dejaste</h2>
        {proposalsLoading ? <p role="status">Buscando tu propuesta…</p> : proposalsError ? <><p role="alert">No pudimos consultar tus proyectos.</p><button className="mi-space__text-action" type="button" onClick={onRetryProposals}><RotateCcw size={15} aria-hidden="true" />Reintentar</button></> : continueProposal ? <>
          <h3>{continueProposal.proposal.title || "Propuesta sin título"}</h3>
          <p>{continueProposalMission ? `${continueProposalMission.classroomTitle} · ${continueProposalMission.title}` : "Retoma la etapa pendiente de tu propuesta."}</p>
          {continueProposal.assignmentVersionId && mentorEvaluatedProposalIds.has(continueProposal.id) ? <p className="mi-space__phase">{missionPhase(continueProposalMission ?? ({ id: continueProposal.assignmentVersionId } as StudentAssignment))}</p> : <p className="mi-space__phase">Mentor · propuesta</p>}
        </> : missionsLoading ? <p role="status">Consultando tus misiones…</p> : missionsError ? <><p role="alert">No pudimos consultar tus misiones.</p><button className="mi-space__text-action" type="button" onClick={onRetryMissions}>Reintentar misiones</button></> : choosingMission ? <><h3>Elige una misión para comenzar</h3><p>Tienes varias misiones publicadas en tus aulas.</p></> : dashboardMission ? <><h3>{dashboardMission.title}</h3><p>{dashboardMission.objectives[0] ?? `${dashboardMission.subject} · ${dashboardMission.classroomTitle}`}</p><p className="mi-space__phase">Por iniciar · Mentor</p></> : <><h3>Todo empieza con una idea</h3><p>Aún no hay una misión publicada en tus aulas. Puedes comenzar una propuesta en Mentor.</p></>}
        {continueProposal && !proposalsLoading && !proposalsError && continueProposal.assignmentVersionId ? <dl className="mi-space__context" aria-label="Contexto académico guardado">
          {continueProposalMission ? <><div><dt>Aula</dt><dd>{continueProposalMission.classroomTitle}</dd></div><div><dt>Misión</dt><dd>{continueProposalMission.title} · v{continueProposalMission.version}</dd></div></> : null}
          {continueProposal.assignmentContext?.assignmentVersionId === continueProposal.assignmentVersionId ? <>
            <div><dt>Contexto Mentor</dt><dd>v{continueProposal.assignmentContext.mentorContext.version}</dd></div>
            <div><dt>Habilidades obligatorias</dt><dd>{continueProposal.assignmentContext.requiredSkills.map((skill) => skill.name).join(" · ") || "Sin habilidades obligatorias"}</dd></div>
          </> : null}
        </dl> : null}
      </div>
      <div className="mi-space__continue-action">
        {proposalsError ? null : proposalsLoading ? null : continueProposal ? <button className="button button--primary" type="button" onClick={() => onContinueProposal(continueProposal)}>Continuar proyecto <ArrowRight size={17} aria-hidden="true" /></button>
          : missionsLoading || missionsError ? null : choosingMission ? <button className="button button--primary" type="button" onClick={() => onNavigate("/student/classrooms")}>Elegir en Mis aulas <ArrowRight size={17} aria-hidden="true" /></button>
            : dashboardMission ? <button className="button button--primary" type="button" onClick={() => onStartMission(dashboardMission)}>Iniciar misión en Mentor <ArrowRight size={17} aria-hidden="true" /></button>
              : <button className="button button--primary" type="button" onClick={onCreateProposal}>Crear propuesta en Mentor <ArrowRight size={17} aria-hidden="true" /></button>}
      </div>
    </section>

    <section className="mi-space__missions" aria-labelledby="mi-space-missions-title">
      <header className="mi-space__missions-heading">
        <img src={missionsArt} alt="" width="72" height="73" />
        <div><p className="mi-space__eyebrow">TUS OBJETIVOS Y PROYECTOS</p><h2 id="mi-space-missions-title">Mis misiones</h2></div>
      </header>
      <div className="mi-space__filters" role="group" aria-label="Filtrar misiones">
        {filters.map(({ id, label }) => <button key={id} type="button" aria-pressed={filter === id} aria-label={`${label}, ${counts[id]} ${counts[id] === 1 ? "misión" : "misiones"}`} onClick={() => { setFilter(id); setExpanded(false); }}>
          {label}<span>{counts[id]}</span>
        </button>)}
      </div>
      {missionsLoading || proposalsLoading ? <p className="mi-space__empty" role="status">Cargando tus misiones…</p> : missionsError || proposalsError ? <div className="mi-space__empty" role="alert"><p>No pudimos consultar tus misiones y propuestas.</p><button className="mi-space__text-action" type="button" onClick={() => { onRetryMissions(); onRetryProposals(); }}><RotateCcw size={15} aria-hidden="true" />Reintentar</button></div> : visibleMissions.length ? <>
        <ul className="mi-space__list">{visibleMissions.map((mission) => {
          const linkedProposal = proposalForMission(mission);
          const phase = missionPhase(mission);
          const isActive = Boolean(linkedProposal);
          return <li key={mission.id} data-mission-id={mission.id}>
            <article className={`mi-space__mission${isActive ? " mi-space__mission--active" : ""}`}>
              <span className="mi-space__mission-icon" aria-hidden="true">{isActive ? <Clock3 size={18} /> : <Flag size={18} />}</span>
              <div className="mi-space__mission-copy"><strong>{mission.title}</strong><small>{mission.subject} · {mission.classroomTitle}</small><span className="mi-space__phase">{phase}</span></div>
              <button type="button" aria-label={`${linkedProposal ? "Continuar" : "Iniciar"} misión: ${mission.title}`} onClick={() => continueOrStartMission(mission)}>{linkedProposal ? <Play size={16} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}<span>{linkedProposal ? "Continuar" : "Iniciar misión en Mentor"}</span></button>
            </article>
          </li>;
        })}</ul>
        {hasOverflow ? <button className="mi-space__expand" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? <>Ver menos <ChevronUp size={16} aria-hidden="true" /></> : <>Ver más <ChevronDown size={16} aria-hidden="true" /></>}</button> : null}
      </> : <div className="mi-space__empty" role="status">
        {filter === "completed" ? <><Check size={18} aria-hidden="true" /><p>No hay misiones completadas para mostrar.</p></> : filter === "in-progress" ? <><Clock3 size={18} aria-hidden="true" /><p>{primaryMissionVersionId ? "Tu misión en curso está destacada arriba. No hay otras misiones en curso." : "No hay misiones en curso."}</p></> : filter === "starting" ? <><Flag size={18} aria-hidden="true" /><p>{dashboardMission ? "Tu siguiente misión está destacada arriba. No hay otras misiones por iniciar." : "No hay misiones por iniciar."}</p></> : dashboardMission || primaryMissionVersionId ? <><Flag size={18} aria-hidden="true" /><p>Tu siguiente paso está destacado arriba. No hay otras misiones para mostrar.</p></> : <><Flag size={18} aria-hidden="true" /><p>Aún no hay misiones publicadas en tus aulas.</p><button className="mi-space__text-action" type="button" onClick={() => onNavigate("/student/classrooms")}>Ver Mis aulas <ArrowRight size={15} aria-hidden="true" /></button></>}
      </div>}
      {missionsError || classroomsError ? <p className="mi-space__notice" role="alert">{classroomsError ?? "No pudimos cargar tus misiones."} <button className="mi-space__text-action" type="button" onClick={classroomsError ? onRetryClassrooms : onRetryMissions}>Reintentar</button></p> : null}
      {!classroomsLoading && classrooms.length ? <p className="mi-space__classroom-note">{classrooms.length} aula{classrooms.length === 1 ? " activa" : "s activas"}{classroomRequests.some((request) => request.status === "pending") ? " · tienes solicitudes pendientes" : ""}</p> : null}
      {submissions.status === "loading" ? <span className="sr-only" role="status">Consultando tus entregas…</span> : null}
      {submissions.status === "error" ? <p className="mi-space__notice" role="alert">No pudimos consultar tus entregas. <button className="mi-space__text-action" type="button" onClick={onRetrySubmissions}>Reintentar</button></p> : null}
      {latestSubmission ? <p className="mi-space__last-submission">Último resultado: <strong>{latestSubmission.label}</strong> · {latestSubmission.kind === "mentor" ? "Mentor" : "Review"}</p> : null}
    </section>
  </main>;
}
