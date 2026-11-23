import { useEffect, useState } from "react";
import { classroomApi } from "../../lib/api/classroom-api.js";
import { teacherReviewApi } from "../../lib/api/teacher-review-api.js";
import type { TeacherClassroomReview } from "@fragments/contracts";

type ClassroomOption = { id: string; title: string; subject: string; status: "active" | "archived" };
type State = { status: "loading" } | { status: "error" } | { status: "ready"; items: TeacherClassroomReview[] };

function statusLabel(status: TeacherClassroomReview["status"]): string {
  return status === "queued" ? "En cola" : status === "running" ? "En proceso" : status === "completed" ? "Completada" : "Fallida";
}

export function TeacherReviewWorkspace() {
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [classroomsState, setClassroomsState] = useState<"loading" | "ready" | "error">("loading");
  const [classroomId, setClassroomId] = useState("");
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [classroomsReload, setClassroomsReload] = useState(0);

  useEffect(() => {
    let active = true;
    setClassroomsState("loading");
    void classroomApi.list().then((result) => {
      if (!active) return;
      if (!result.ok) { setClassroomsState("error"); return; }
      const available = result.data.items.filter((classroom) => classroom.status === "active");
      setClassrooms(available);
      setClassroomId((current) => current && available.some((item) => item.id === current) ? current : available[0]?.id ?? "");
      setClassroomsState("ready");
    }).catch(() => { if (active) setClassroomsState("error"); });
    return () => { active = false; };
  }, [classroomsReload]);

  useEffect(() => {
    if (classroomsState === "loading") return;
    if (classroomsState === "error" || !classroomId) { setState(classroomsState === "error" ? { status: "error" } : { status: "ready", items: [] }); return; }
    let active = true;
    setState({ status: "loading" });
    void teacherReviewApi.list(classroomId).then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", items: result.data } : { status: "error" });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [classroomsState, classroomId, reload]);

  return <main className="teacher-review" aria-labelledby="teacher-review-title">
    <p className="teacher-shell-eyebrow">REVIEW · SEGUIMIENTO FORMATIVO</p>
    <h1 id="teacher-review-title">Resultados vinculados</h1>
    <p>Solo aparecen revisiones que cada estudiante compartió explícitamente desde una propuesta de misión. Las puntuaciones son orientación formativa, no una calificación oficial.</p>
    {classroomsState === "loading" ? <p role="status">Cargando tus aulas…</p> : null}
    {classroomsState === "error" ? <p role="alert">No pudimos cargar tus aulas. <button type="button" onClick={() => setClassroomsReload((value) => value + 1)}>Reintentar</button></p> : null}
    {classroomsState === "ready" && classrooms.length === 0 ? <p>No tienes aulas activas para consultar.</p> : null}
    {classroomsState === "ready" && classrooms.length > 0 ? <label className="teacher-review__classroom">Aula
      <select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
        {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.title} · {classroom.subject}</option>)}
      </select>
    </label> : null}
    {state.status === "loading" && classroomsState === "ready" && classroomId ? <p role="status">Cargando revisiones vinculadas…</p> : null}
    {state.status === "error" && classroomsState === "ready" ? <p role="alert">No pudimos cargar las revisiones. <button type="button" onClick={() => setReload((value) => value + 1)}>Reintentar</button></p> : null}
    {state.status === "ready" && classroomsState === "ready" && classroomId ? state.items.length ? <ul className="teacher-review__list">
      {state.items.map((item) => <li key={item.reviewId}>
        <div className="teacher-review__heading"><strong>{item.proposalTitle || "Propuesta sin título"}</strong><span>{statusLabel(item.status)}</span></div>
        <p>{item.studentLabel} · {item.missionTitle} (versión {item.missionVersion}) · propuesta v{item.proposalVersion}</p>
        <p>Contexto Mentor v{item.mentorContextVersion} · {item.repositoryOwner}/{item.repositoryName}</p>
        <code>{item.commitSha}</code>
        {item.score !== undefined ? <p>Puntuación orientativa: {item.score}/100</p> : null}
      </li>)}
    </ul> : <p>Aún no hay revisiones que estudiantes hayan compartido con esta aula.</p> : null}
  </main>;
}
