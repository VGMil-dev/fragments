import { ArrowRight, ClipboardCheck, GraduationCap, Image, Layers3 } from "lucide-react";
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
  const continueProposal = [...proposals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const nextMission = [...missions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const githubIdentity = student.githubLogin
    ? student.profileUrl
      ? <a className="student-dashboard__identity-link" href={student.profileUrl} target="_blank" rel="noreferrer">@{student.githubLogin}</a>
      : `@${student.githubLogin}`
    : "estudiante";

  return (
    <main className="student-dashboard student-dashboard--pixel" aria-labelledby="student-dashboard-title">
      <header className="student-dashboard__heading">
        <p className="student-screen__eyebrow">CENTRO DE MISIONES</p>
        <h1 id="student-dashboard-title">Hola, {githubIdentity}</h1>
        <p>Tu siguiente paso de aprendizaje, con tus propuestas y actividad en un solo lugar.</p>
        {student.avatarUrl ? <img className="student-dashboard__avatar" src={student.avatarUrl} alt="" width="56" height="56" /> : null}
      </header>

      <section className="student-dashboard__project" aria-label="Siguiente paso de tu proyecto">
        <div className="student-dashboard__project-art" aria-hidden="true"><Layers3 size={34} /></div>
        <div className="student-dashboard__project-copy">
          {proposalsLoading ? <><span className="student-dashboard__status">Siguiente paso</span><h2>Buscando tus propuestas</h2><p role="status">Consultando tus proyectos guardados…</p></> : proposalsError ? <><span className="student-dashboard__status student-dashboard__status--warning">Requiere atención</span><h2>No pudimos consultar tus propuestas</h2><p role="alert">Tus proyectos siguen protegidos. Puedes volver a intentar.</p></> : continueProposal ? <><span className="student-dashboard__status">Siguiente paso · borrador v{continueProposal.version}</span><h2>{continueProposal.proposal.title || "Borrador sin título"}</h2><p>Continúa donde dejaste tu propuesta.</p></> : missionsLoading ? <><span className="student-dashboard__status">Centro de misiones</span><h2>Buscando una misión disponible</h2><p role="status">Consultando las misiones publicadas en tus aulas…</p></> : missionsError ? <><span className="student-dashboard__status student-dashboard__status--warning">Requiere atención</span><h2>No pudimos consultar tus misiones</h2><p role="alert">Puedes volver a intentar. Tus aulas y proyectos siguen disponibles.</p></> : nextMission ? <><span className="student-dashboard__status">Misión publicada · {nextMission.classroomTitle}</span><h2>{nextMission.title}</h2><p>{nextMission.objectives[0] ?? "Continúa tu aprendizaje con el contexto publicado por tu docente."}</p></> : <><span className="student-dashboard__status">Siguiente paso</span><h2>Tu primer proyecto</h2><p>Define una idea y guarda un borrador para continuar después.</p></>}
        </div>
        <div className="student-dashboard__project-action">
          {proposalsError ? <button type="button" className="button button--light" onClick={onRetryProposals}>Reintentar propuestas</button> : proposalsLoading ? null : continueProposal ? <button type="button" className="button button--primary" onClick={() => onContinueProposal(continueProposal)}>Continuar en Mentor <ArrowRight size={17} aria-hidden="true" /></button> : missionsLoading ? null : missionsError ? <button type="button" className="button button--light" onClick={onRetryMissions}>Reintentar misiones</button> : nextMission ? <button type="button" className="button button--primary" onClick={() => onStartMission(nextMission)}>Iniciar misión en Mentor <ArrowRight size={17} aria-hidden="true" /></button> : <button type="button" className="button button--primary" onClick={onCreateProposal}>Crear mi primer proyecto <ArrowRight size={17} aria-hidden="true" /></button>}
        </div>
      </section>

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
