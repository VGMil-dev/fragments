import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ClassroomSummary, ProposalDraftResponse, SkillCatalogEntry, StudentAssignment, StudentClassroomRequest } from "@fragments/contracts";
import { studentApi } from "../../lib/api/student-api-instance";
import { assignmentsApi } from "../assignments/assignments-api.js";
import { StudentAssignmentsList } from "../assignments/AssignmentsPanel.js";
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

function statusLabel(status: StudentClassroomRequest["status"]) {
  return status === "pending" ? "Pendiente de aprobación" : status === "active" ? "Activa" : status === "rejected" ? "Rechazada" : "Retirada";
}

export function StudentClassroomsScreen({ classrooms, requests, loading, error, onRefresh, proposals = [], proposalsLoading = true, proposalsError = false, onRetryProposals, onContinueProposal, onStartProposal }: Props) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState<Record<string, SkillCatalogEntry[] | null | undefined>>({});
  const [assignments, setAssignments] = useState<Record<string, StudentAssignment[] | null | undefined>>({});
  const inFlight = useRef(new Set<string>());

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
      setAssignments((current) => ({ ...current, [classroomId]: result.ok ? result.data : null }));
    } catch {
      setAssignments((current) => ({ ...current, [classroomId]: null }));
    } finally {
      inFlight.current.delete(requestKey);
    }
  }, []);

  useEffect(() => {
    const activeClassrooms = classrooms.filter((room) => room.status === "active");
    setSkills(Object.fromEntries(activeClassrooms.map((room) => [room.id, undefined])));
    setAssignments(Object.fromEntries(activeClassrooms.map((room) => [room.id, undefined])));
    for (const room of activeClassrooms) {
      void loadSkills(room.id);
      void loadMissions(room.id);
    }
  }, [classrooms, loadSkills, loadMissions]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const result = await studentApi.requestClassroom(code.trim());
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error.code === "INVALID_JOIN_CODE" ? "El código no es válido o ya no está activo." : result.error.code === "JOIN_CODE_RATE_LIMITED" ? "Alcanzaste el límite de intentos. Espera antes de probar de nuevo." : result.error.code === "ENROLLMENT_CONFLICT" ? "La solicitud anterior necesita una decisión docente. Contacta a tu docente." : result.error.message);
      return;
    }
    setCode("");
    setMessage("Solicitud enviada. Tu docente debe aprobarla antes de que puedas ver el aula.");
    onRefresh();
  }

  return <main className="student-classrooms student-classrooms--pixel" aria-labelledby="student-classrooms-title">
    <header className="student-classrooms__heading"><p className="student-screen__eyebrow">MI APRENDIZAJE</p><h1 id="student-classrooms-title">Mis aulas</h1><p>Consulta tus grupos y envía una solicitud con el código de tu docente.</p></header>
    <form className="student-classrooms__join" onSubmit={(event) => void submit(event)}>
      <h2>Incorporarte a un aula</h2><label htmlFor="classroom-join-code">Código de incorporación</label>
      <div><input id="classroom-join-code" name="code" autoComplete="off" minLength={32} maxLength={64} pattern="[A-Za-z0-9_-]{32,64}" required value={code} onChange={(event) => setCode(event.target.value)} aria-describedby="classroom-code-help" /><button className="button button--primary" disabled={busy}>{busy ? "Enviando…" : "Solicitar ingreso"}</button></div>
      <small id="classroom-code-help">La solicitud queda pendiente hasta que el docente la apruebe.</small>
    </form>
    {message ? <p className="student-classrooms__notice" role="status">{message}</p> : null}
    {error ? <div role="alert"><p>{error}</p><button className="student-classrooms__link" type="button" onClick={onRefresh}>Reintentar</button></div> : null}
    {loading ? <p role="status">Cargando tus aulas y solicitudes…</p> : null}
    {!loading && !error ? <>
      <section aria-labelledby="student-active-classrooms"><h2 id="student-active-classrooms">Aulas activas</h2>
        {classrooms.filter((room) => room.status === "active").length ? <ul className="student-classrooms__list">{classrooms.filter((room) => room.status === "active").map((room) => {
          const roomSkills = skills[room.id];
          const roomAssignments = assignments[room.id];
          return <li key={room.id} className="student-classrooms__card"><div><p>{room.subject} · {room.groupLabel}{room.period ? ` · ${room.period}` : ""}</p><h3>{room.title}</h3><span className="student-classrooms__status">Matrícula activa</span></div>
            <div className="student-classrooms__skills"><h4>Habilidades autorizadas</h4>{roomSkills === null ? <><p role="alert">No pudimos cargar las habilidades de esta aula.</p><button className="student-classrooms__link" type="button" aria-label={`Reintentar habilidades de ${room.title}`} onClick={() => void loadSkills(room.id)}>Reintentar habilidades</button></> : roomSkills === undefined ? <p role="status">Cargando habilidades…</p> : roomSkills.length ? <ul>{roomSkills.map((skill) => <li key={skill.id}>{skill.name}</li>)}</ul> : <p>Aún no hay habilidades habilitadas.</p>}</div>
            <div className="student-classrooms__missions">{roomAssignments === undefined ? <p role="status">Cargando misiones…</p> : roomAssignments === null ? <><p role="alert">No pudimos cargar las misiones de esta aula.</p><button className="student-classrooms__link" type="button" aria-label={`Reintentar misiones de ${room.title}`} onClick={() => void loadMissions(room.id)}>Reintentar misiones</button></> : <StudentAssignmentsList assignments={roomAssignments} proposals={proposals} proposalsLoading={proposalsLoading} proposalsError={proposalsError} {...(onRetryProposals ? { onRetryProposals } : {})} {...(onContinueProposal ? { onContinueProposal } : {})} {...(onStartProposal ? { onStartProposal } : {})} />}</div>
          </li>;
        })}</ul> : <p>Aún no tienes matrículas activas. Cuando el docente apruebe tu solicitud, el aula aparecerá aquí.</p>}
      </section>
      <section aria-labelledby="student-classroom-requests"><h2 id="student-classroom-requests">Tus solicitudes</h2>
        {requests.filter((request) => request.status !== "active").length ? <ul className="student-classrooms__requests">{requests.filter((request) => request.status !== "active").map((request) => <li key={request.id}><span>{request.source === "join_code" ? "Solicitud por código" : "Asignación del docente"}</span><strong data-status={request.status}>{statusLabel(request.status)}</strong></li>)}</ul> : <p>No tienes solicitudes pendientes ni rechazadas.</p>}
      </section>
    </> : null}
  </main>;
}
