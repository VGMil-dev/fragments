import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createApiClient } from "../../lib/api/api-client";
import { createIdentityApi } from "../../lib/api/identity-api";
import type { TeacherProject, TeacherStudentEntry } from "@fragments/contracts";
import "./teacher-students.css";

const api = createIdentityApi(createApiClient());
type Access = "checking" | "signed-out" | "forbidden" | "ready" | "error";

export function TeacherStudentsWorkspace({ navigate }: { navigate: (path: string) => void }) {
  const [access, setAccess] = useState<Access>("checking");
  const [students, setStudents] = useState<TeacherStudentEntry[]>([]);
  const [offset, setOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<TeacherStudentEntry | null>(null);
  const [projects, setProjects] = useState<TeacherProject[]>([]);
  const [historical, setHistorical] = useState<Array<{ id: string; title: string; currentVersion: number; updatedAt: string }>>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});

  async function loadStudents(nextOffset = 0) {
    const result = await api.getTeacherStudents(nextOffset);
    if (!result.ok) {
      if (result.error.code === "AUTH_REQUIRED") setAccess("signed-out");
      else if (result.error.code === "FORBIDDEN") setAccess("forbidden");
      else setAccess("error");
      return;
    }
    setStudents((current) => nextOffset === 0 ? result.data.items : [...current, ...result.data.items]);
    setOffset(result.data.nextOffset);
    setAccess("ready");
    const legacy = await api.getHistoricalProjects();
    if (legacy.ok) setHistorical(legacy.data);
  }

  useEffect(() => { void loadStudents(); }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) { setMessage("No se pudo validar el acceso. Revisa tus datos."); return; }
      await loadStudents();
    } catch { setMessage("No pudimos conectar con el servicio."); }
  }

  async function selectStudent(student: TeacherStudentEntry) {
    setSelected(student); setProjects([]);
    const result = await api.getTeacherStudentProjects(student.id);
    if (result.ok) setProjects(result.data);
    else setMessage(result.error.message);
  }

  async function withdraw(projectId: string) {
    const note = reason[projectId] ?? "";
    const result = await api.withdrawProject(projectId, note);
    setMessage(result.ok ? "Publicación retirada y motivo registrado." : result.error.message);
    if (result.ok && selected) await selectStudent(selected);
  }

  if (access === "checking") return <main className="teacher-students"><p role="status">Comprobando el acceso docente…</p></main>;
  if (access === "signed-out") return <main className="teacher-students">
    <a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
    <p className="student-screen__eyebrow">FRAGMENTS · ESPACIO DOCENTE</p><h1>Estudiantes y proyectos</h1>
    <p>Inicia sesión con tu cuenta docente. Las sesiones de estudiantes no permiten abrir este panel.</p>
    <form className="teacher-students__login" onSubmit={(event) => void signIn(event)}>
      <label>Correo<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="button button--primary">Iniciar sesión</button>
    </form>
    {message ? <p role="alert">{message}</p> : null}
    <a href="/teacher/reset-password" onClick={(event) => { event.preventDefault(); navigate("/teacher/reset-password"); }}>¿Olvidaste tu contraseña?</a>
  </main>;
  if (access === "forbidden") return <main className="teacher-students"><h1>Acceso docente requerido</h1><p>Tu cuenta no tiene permisos para consultar perfiles ni proyectos académicos.</p><button type="button" onClick={() => void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).then(() => setAccess("signed-out"))}>Cerrar sesión</button></main>;
  if (access === "error") return <main className="teacher-students"><h1>No se pudo cargar el panel</h1><p role="alert">{message || "Inténtalo de nuevo."}</p><button type="button" onClick={() => void loadStudents()}>Reintentar</button></main>;

  return <main className="teacher-students" aria-labelledby="teacher-students-title">
    <header><a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a><p className="student-screen__eyebrow">FRAGMENTS · ESPACIO DOCENTE</p><h1 id="teacher-students-title">Estudiantes y proyectos</h1><p>Consulta proyectos, revisiones y la configuración académica asociada a cada evaluación.</p></header>
    <section className="teacher-students__layout">
      <div>
        <h2>Estudiantes con GitHub</h2>
        <ul className="teacher-students__list">{students.map((student) => <li key={student.id}>
          <button type="button" aria-pressed={selected?.id === student.id} onClick={() => void selectStudent(student)}>
            {student.avatarUrl ? <img src={student.avatarUrl} alt="" loading="lazy" /> : null}<span><strong>@{student.githubLogin}</strong><small>Registro {new Date(student.registeredAt).toLocaleDateString("es-CO")} · {student.projectCount} proyectos</small></span>
          </button>
        </li>)}</ul>
        {offset !== null ? <button type="button" onClick={() => void loadStudents(offset)}>Cargar más estudiantes</button> : null}
      </div>
      <section className="teacher-students__projects" aria-live="polite">
        <h2>{selected ? `Proyectos de @${selected.githubLogin}` : "Selecciona un estudiante"}</h2>
        {projects.map((project) => <article className="teacher-project" key={project.id}>
          <h3>{project.title}</h3><p>Versión actual: {project.currentVersion}</p>
          {project.withdrawn ? <p className="teacher-project__withdrawn">Publicación retirada el {project.withdrawnAt ? new Date(project.withdrawnAt).toLocaleDateString("es-CO") : ""}. Motivo registrado: {project.withdrawalReason}</p> : null}
          <ol>{project.history.map((revision) => <li key={revision.version}>
            <strong>Revisión {revision.version}</strong> · {revision.published ? "Publicada" : "Sin publicación elegible"} · {new Date(revision.updatedAt).toLocaleDateString("es-CO")}
            {revision.contextVersion === null ? <p>Versión académica histórica no acreditada.</p> : <p>{revision.subject} · {revision.theme} · rúbrica {revision.rubricTitle} (v{revision.contextVersion})</p>}
            <p><strong>Problema:</strong> {revision.proposal.problem}</p><p><strong>Solución:</strong> {revision.proposal.solution}</p>
            {revision.published && !project.withdrawn ? <div className="teacher-project__withdraw"><label>Motivo para retirar<input value={reason[project.id] ?? ""} maxLength={1000} onChange={(event) => setReason((current) => ({ ...current, [project.id]: event.target.value }))} /></label><button type="button" disabled={!(reason[project.id] ?? "").trim()} onClick={() => void withdraw(project.id)}>Retirar publicación</button></div> : null}
          </li>)}</ol>
        </article>)}
      </section>
    </section>
    <section className="teacher-students__historical"><h2>Proyectos históricos sin propietario GitHub acreditado</h2>
      {historical.length ? <ul>{historical.map((project) => <li key={project.id}>{project.title} · revisión {project.currentVersion}</li>)}</ul> : <p>No hay propuestas históricas pendientes de acreditar.</p>}
    </section>
    {message ? <p role="status">{message}</p> : null}
  </main>;
}
