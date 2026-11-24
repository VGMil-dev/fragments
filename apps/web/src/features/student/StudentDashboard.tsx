import { ArrowRight, ClipboardCheck, Flag, GraduationCap, Image, Layers3 } from "lucide-react";
import type { ClassroomSummary, ProposalDraftResponse, StudentAssignment, StudentClassroomRequest, StudentMe, StudentSubmissionsResponse } from "@fragments/contracts";
import type { AsyncState } from "../../hooks/async-state";
import "./StudentDashboard.css";

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
  onStartMission: (assignment: StudentAssignment) => void;
  onCreateProposal: () => void;
  onNavigate: (path: string) => void;
};

export function StudentDashboard({ student, classrooms, classroomRequests, classroomsLoading, classroomsError, onRetryClassrooms, proposals, proposalsLoading, proposalsError, onRetryProposals, missions, missionsLoading, missionsError, onRetryMissions, submissions, onRetrySubmissions, onContinueProposal, onStartMission, onCreateProposal, onNavigate }: StudentDashboardProps) {
  const latestSubmission = submissions.status === "success"
    ? [...submissions.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;
  const recentProposals = [...proposals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const continueProposal = recentProposals[0];
  const proposalForMission = (assignment: StudentAssignment) => recentProposals.find((draft) =>
    (draft.assignmentVersionId ?? draft.assignmentContext?.assignmentVersionId) === assignment.id,
  );
  const continueOrStartMission = (assignment: StudentAssignment) => {
    const linkedProposal = proposalForMission(assignment);
    if (linkedProposal) onContinueProposal(linkedProposal);
    else onStartMission(assignment);
  };
  const publishedMissions = [...missions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const proposalIsPrimary = !proposalsLoading && !proposalsError && Boolean(continueProposal);
  const choosingMission = !proposalsLoading && !proposalsError && !continueProposal && !missionsLoading && !missionsError && publishedMissions.length > 1;
  const dashboardMission = proposalsLoading || proposalsError || continueProposal || missionsLoading || missionsError || choosingMission ? undefined : publishedMissions[0];
  const otherMissions = proposalsLoading || proposalsError || missionsLoading || missionsError
    ? []
    : choosingMission ? publishedMissions : publishedMissions.filter((mission) => mission.id !== dashboardMission?.id);
  const visibleOtherMissions = otherMissions.slice(0, 3);
  const dashboardClasses = [
    "student-dashboard",
    "student-dashboard--pixel",
    proposalIsPrimary ? "student-dashboard--has-proposal" : "",
    choosingMission ? "student-dashboard--mission-choice" : "",
    dashboardMission ? "student-dashboard--single-mission" : "",
  ].filter(Boolean).join(" ");
  const githubIdentity = student.githubLogin
    ? student.profileUrl
      ? <a className="student-dashboard__identity-link" href={student.profileUrl} target="_blank" rel="noreferrer">@{student.githubLogin}</a>
      : `@${student.githubLogin}`
    : "estudiante";
  const priorityPanel = <section className="student-dashboard__project" aria-label="Acción prioritaria del dashboard">
    <div className="student-dashboard__project-art" aria-hidden="true"><Layers3 size={34} /></div>
    <div className="student-dashboard__project-copy">
      {proposalsLoading ? <><span className="student-dashboard__status">Siguiente paso</span><h2>Buscando tus propuestas</h2><p role="status">Consultando tus proyectos guardados…</p></> : proposalsError ? <><span className="student-dashboard__status student-dashboard__status--warning">Requiere atención</span><h2>No pudimos consultar tus propuestas</h2><p role="alert">Tus proyectos siguen protegidos. Puedes volver a intentar.</p></> : continueProposal ? <><span className="student-dashboard__status">Siguiente paso · borrador v{continueProposal.version}</span><h2>{continueProposal.proposal.title || "Borrador sin título"}</h2><p>Continúa donde dejaste tu propuesta.</p></> : missionsLoading ? <><span className="student-dashboard__status">Centro de misiones</span><h2>Buscando una misión disponible</h2><p role="status">Consultando las misiones publicadas en tus aulas…</p></> : missionsError ? <><span className="student-dashboard__status student-dashboard__status--warning">Requiere atención</span><h2>No pudimos consultar tus misiones</h2><p role="alert">Puedes volver a intentar. Tus aulas y proyectos siguen disponibles.</p></> : choosingMission ? <><span className="student-dashboard__status">Misiones disponibles</span><h2>Elige una misión para comenzar</h2><p>Hay varias misiones publicadas en tus aulas. Puedes elegir cuál explorar primero.</p></> : dashboardMission ? <><span className="student-dashboard__status">Misión publicada · {dashboardMission.classroomTitle}</span><h2>{dashboardMission.title}</h2><p>{dashboardMission.objectives[0] ?? "Continúa con el contexto publicado por tu docente."}</p></> : <><span className="student-dashboard__status">Sin misión publicada</span><h2>Empieza con una idea propia</h2><p>Aún no hay una misión activa en tus aulas. Puedes crear una propuesta en Mentor o revisar tus aulas.</p></>}
      {dashboardMission ? <dl className="student-dashboard__mission-snapshot" aria-label="Contexto de la misión">
        <div><dt>Materia</dt><dd>{dashboardMission.subject}</dd></div>
        <div><dt>Versiones fijadas</dt><dd>Misión publicada v{dashboardMission.version} · Contexto Mentor v{dashboardMission.mentorContextVersion}</dd></div>
        <div><dt>Habilidades obligatorias</dt><dd>{dashboardMission.requiredSkills.length ? dashboardMission.requiredSkills.map((skill) => skill.name).join(" · ") : "Sin habilidades obligatorias"}</dd></div>
      </dl> : null}
    </div>
    <div className="student-dashboard__project-action">
      {proposalsError
        ? <button type="button" className="button button--light" onClick={onRetryProposals}>Reintentar propuestas</button>
        : proposalsLoading ? null
          : continueProposal
            ? <button type="button" className="button button--primary" onClick={() => onContinueProposal(continueProposal)}>Continuar en Mentor <ArrowRight size={17} aria-hidden="true" /></button>
            : missionsLoading ? null
              : missionsError
                ? <button type="button" className="button button--light" onClick={onRetryMissions}>Reintentar misiones</button>
                : choosingMission
                  ? <button type="button" className="button button--primary" onClick={() => onNavigate("/student/classrooms")}>Ir a Mis aulas <ArrowRight size={17} aria-hidden="true" /></button>
                  : dashboardMission
                    ? <button type="button" className="button button--primary" onClick={() => continueOrStartMission(dashboardMission)}>{proposalForMission(dashboardMission) ? "Continuar borrador" : "Iniciar misión en Mentor"} <ArrowRight size={17} aria-hidden="true" /></button>
                    : <button type="button" className="button button--primary" onClick={onCreateProposal}>Crear propuesta en Mentor <ArrowRight size={17} aria-hidden="true" /></button>}
    </div>
  </section>;

  return (
    <main className={dashboardClasses} aria-labelledby="student-dashboard-title">
      <header className="student-dashboard__heading">
        <p className="student-screen__eyebrow">CENTRO DE MISIONES</p>
        <h1 id="student-dashboard-title">Hola, {githubIdentity}</h1>
        <p>Tu siguiente paso de aprendizaje, con tus propuestas y actividad en un solo lugar.</p>
        {student.avatarUrl ? <img className="student-dashboard__avatar" src={student.avatarUrl} alt="" width="56" height="56" /> : null}
      </header>

      {proposalIsPrimary ? priorityPanel : null}

      {visibleOtherMissions.length ? <section className="student-dashboard__missions" aria-labelledby="student-dashboard-missions">
        <header className="student-dashboard__missions-heading">
          <p className="student-screen__eyebrow">PUBLICADAS POR TUS DOCENTES</p>
          <h2 id="student-dashboard-missions"><Flag size={19} aria-hidden="true" />Misiones en tus aulas</h2>
          <p>Elige un objetivo de aprendizaje y continúa en Mentor con su contexto publicado.</p>
        </header>
        <ul className="student-dashboard__mission-list">
          {visibleOtherMissions.map((mission) => {
            const linkedProposal = proposalForMission(mission);
            return <li key={mission.id}>
            <article className="student-dashboard__mission-card">
              <p className="student-dashboard__mission-source">{mission.subject} <span aria-hidden="true">·</span> {mission.classroomTitle}</p>
              <h3>{mission.title}</h3>
              <p className="student-dashboard__mission-objective"><strong>Objetivo</strong>{mission.objectives[0] ?? "Sin objetivo publicado."}</p>
              {mission.requiredSkills.length ? <div className="student-dashboard__mission-skill-group">
                <p>Habilidades obligatorias</p>
                <ul className="student-dashboard__mission-skills" aria-label="Habilidades obligatorias">
                  {mission.requiredSkills.slice(0, 3).map((skill) => <li key={skill.id}>{skill.name}</li>)}
                  {mission.requiredSkills.length > 3 ? <li>+{mission.requiredSkills.length - 3} habilidades</li> : null}
                </ul>
              </div> : null}
              <button type="button" className="student-dashboard__mission-action student-dashboard__mission-action--secondary" aria-label={linkedProposal ? `Continuar borrador vinculado a misión: ${mission.title}` : `Iniciar misión: ${mission.title}`} onClick={() => continueOrStartMission(mission)}>
                {linkedProposal ? "Continuar borrador" : "Iniciar en Mentor"} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          </li>;
          })}
        </ul>
        {otherMissions.length > visibleOtherMissions.length ? <button type="button" className="student-dashboard__link student-dashboard__all-missions" onClick={() => onNavigate("/student/classrooms")}>
          Ver todas tus misiones ({otherMissions.length - visibleOtherMissions.length} más) <ArrowRight size={16} aria-hidden="true" />
        </button> : null}
      </section> : null}

      {!proposalIsPrimary ? priorityPanel : null}

      <div className="student-dashboard__grid">
        <section className="student-dashboard__card" aria-labelledby="student-dashboard-classrooms">
          <h2 id="student-dashboard-classrooms"><GraduationCap size={20} aria-hidden="true" />En tus aulas</h2>
          {classroomsLoading ? <p role="status">Consultando tus aulas…</p> : classroomsError ? <><p role="alert">{classroomsError}</p><button className="student-dashboard__link" type="button" onClick={onRetryClassrooms}>Reintentar</button></> : <>
            <p>{classrooms.length ? `Tienes ${classrooms.length} aula${classrooms.length === 1 ? " activa" : "s activas"}${classroomRequests.some((request) => request.status === "pending") ? " y solicitudes pendientes de aprobación" : ""}.` : "Aún no tienes aulas activas. Puedes solicitar ingreso con el código de tu docente."}</p>
            {classrooms.length ? <ul className="student-dashboard__classroom-list" aria-label="Aulas activas">{classrooms.map((classroom) => <li key={classroom.id}><strong>{classroom.title}</strong><span>{[classroom.subject, classroom.groupLabel].filter(Boolean).join(" · ")}</span></li>)}</ul> : null}
          </>}
          <button type="button" className="student-dashboard__link" onClick={() => onNavigate("/student/classrooms")}>Ver Mis aulas <ArrowRight size={16} aria-hidden="true" /></button>
        </section>

        <section className="student-dashboard__card" aria-labelledby="student-dashboard-submission">
          <h2 id="student-dashboard-submission"><ClipboardCheck size={19} aria-hidden="true" />Última entrega</h2>
          {submissions.status === "loading" ? <p role="status">Consultando tus entregas…</p> : null}
          {submissions.status === "error" ? <><p role="alert">No pudimos consultar tus entregas ahora.</p><button type="button" className="student-dashboard__link" onClick={onRetrySubmissions}>Reintentar</button></> : null}
          {submissions.status === "empty" ? <p>Aún no tienes entregas generadas.</p> : null}
          {latestSubmission ? <><p className="student-dashboard__submission-title">{latestSubmission.label}</p><p>{latestSubmission.kind === "mentor" ? "Entrega Mentor" : "Entrega Review"} · {new Date(latestSubmission.createdAt).toLocaleDateString("es-CO")} · {latestSubmission.score}/100</p><small>Resultado formativo; no es aprobación docente.</small></> : null}
          <button type="button" className="student-dashboard__link" onClick={() => onNavigate("/student/submissions")}>Ver Mis entregas <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
      </div>

      <section className="student-dashboard__gallery" aria-labelledby="student-dashboard-gallery">
        <div><h2 id="student-dashboard-gallery"><Image size={19} aria-hidden="true" />Descubre en la Galería</h2><p>Explora propuestas compartidas por estudiantes con sesión.</p></div>
        <button type="button" className="student-dashboard__link" onClick={() => onNavigate("/student/gallery")}>Explorar Galería <ArrowRight size={16} aria-hidden="true" /></button>
      </section>
    </main>
  );
}
