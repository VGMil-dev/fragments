import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Archive, ArrowLeft, BookOpen, Check, ClipboardList, Pencil, Plus, Users, X } from "lucide-react";
import type { Classroom, ClassEnrollment, SkillCatalogEntry, TeacherStudentEntry } from "@fragments/contracts";
import { classroomApi } from "../../lib/api/classroom-api.js";
import "./classroom-studio.css";

type Access = "checking" | "signed-out" | "forbidden" | "ready" | "error";
type JoinCode = { code: string; expiresAt: string | null; createdAt: string };

export function ClassroomStudio({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [access, setAccess] = useState<Access>("checking");
  const [classrooms, setClassrooms] = useState<Array<Omit<Classroom, "context">>>([]);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassEnrollment[]>([]);
  const [skills, setSkills] = useState<Array<SkillCatalogEntry & { enabled?: boolean }>>([]);
  const [students, setStudents] = useState<TeacherStudentEntry[]>([]);
  const [allSkills, setAllSkills] = useState<SkillCatalogEntry[]>([]);
  const [joinCode, setJoinCode] = useState<JoinCode | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingSkillName, setEditingSkillName] = useState("");
  const [editingSkillDescription, setEditingSkillDescription] = useState("");
  const [studentId, setStudentId] = useState("");

  const matchedDetailId = path.match(/^\/teacher\/classrooms\/([A-Za-z0-9_-]+)$/)?.[1] ?? null;
  const detailId = matchedDetailId === "new" ? null : matchedDetailId;
  const isNew = path === "/teacher/classrooms/new";
  const isSkills = path === "/teacher/skills";

  async function load() {
    setMessage(""); setContentLoading(true);
    const list = await classroomApi.list();
    if (!list.ok) {
      setAccess(list.error.code === "AUTH_REQUIRED" ? "signed-out" : list.error.code === "FORBIDDEN" ? "forbidden" : "error");
      setMessage(list.error.message);
      setContentLoading(false);
      return;
    }
    setClassrooms(list.data.items);
    setAccess("ready");
    if (isSkills) {
      const result = await classroomApi.listSkills();
      if (result.ok) setAllSkills(result.data); else setMessage(result.error.message);
      setContentLoading(false);
    }
    if (detailId) {
      const [detail, enrollmentResult, skillResult, studentResult] = await Promise.all([
        classroomApi.get(detailId), classroomApi.enrollments(detailId), classroomApi.classroomSkills(detailId), classroomApi.students(),
      ]);
      if (!detail.ok) { setMessage(detail.error.message); setClassroom(null); setContentLoading(false); return; }
      setClassroom(detail.data);
      if (enrollmentResult.ok) setMembers(enrollmentResult.data); else setMessage(enrollmentResult.error.message);
      if (skillResult.ok) setSkills(skillResult.data); else setMessage(skillResult.error.message);
      if (studentResult.ok) setStudents(studentResult.data.items); else setMessage(studentResult.error.message);
      setContentLoading(false);
    }
    if (!isSkills && !detailId) setContentLoading(false);
  }

  useEffect(() => { setAccess("checking"); setClassroom(null); void load(); }, [path]);

  async function createClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const result = await classroomApi.create({ title: data.get("title"), subject: data.get("subject"), groupLabel: data.get("groupLabel"), period: data.get("period") || null, context: data.get("context") || null });
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    navigate(`/teacher/classrooms/${result.data.id}`);
  }

  async function saveClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!classroom) return; setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const result = await classroomApi.update(classroom.id, { title: data.get("title"), subject: data.get("subject"), groupLabel: data.get("groupLabel"), period: data.get("period") || null, context: data.get("context") || null });
    setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setClassroom(result.data); setMessage("Cambios guardados."); await load(); }
  }

  async function createSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = await classroomApi.createSkill({ name: skillName, description: skillDescription || null }); setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setSkillName(""); setSkillDescription(""); setMessage("Habilidad creada."); await load(); }
  }

  async function enrollmentAction(action: "approve" | "reject" | "remove", enrollmentId: string) {
    if (!detailId) return; setBusy(true); setMessage("");
    const result = action === "approve" ? await classroomApi.approve(detailId, enrollmentId) : action === "reject" ? await classroomApi.reject(detailId, enrollmentId) : await classroomApi.remove(detailId, enrollmentId);
    setBusy(false); if (!result.ok) setMessage(result.error.message); else await load();
  }

  async function directAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detailId || !studentId) return; setBusy(true); setMessage("");
    const result = await classroomApi.directAssign(detailId, studentId); setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setStudentId(""); setMessage("Estudiante asignado y matrícula activa."); await load(); }
  }

  async function toggleSkill(skillId: string, enabled: boolean) {
    if (!detailId) return; setBusy(true); setMessage(""); const result = await classroomApi.setSkill(detailId, skillId, enabled); setBusy(false);
    if (!result.ok) setMessage(result.error.message); else await load();
  }

  async function archiveSkill(skillId: string) {
    setBusy(true); setMessage(""); const result = await classroomApi.archiveSkill(skillId); setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setMessage("Habilidad archivada; sus referencias se conservan."); await load(); }
  }

  async function saveSkill(event: FormEvent<HTMLFormElement>, skillId: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = await classroomApi.updateSkill(skillId, { name: editingSkillName, description: editingSkillDescription || null }); setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setEditingSkillId(null); setMessage("Habilidad actualizada."); await load(); }
  }

  const visibleSkills = allSkills.filter((skill) => `${skill.name} ${skill.description ?? ""}`.toLocaleLowerCase("es").includes(skillQuery.trim().toLocaleLowerCase("es")));

  if (access === "checking") return <main className="classroom-studio"><p role="status">Comprobando permisos docentes…</p></main>;
  if (access === "signed-out") return <main className="classroom-studio classroom-studio--gate"><BookOpen aria-hidden="true" /><h1>Classroom Studio</h1><p>Inicia sesión con tu cuenta docente para administrar aulas.</p><a className="cs-button cs-button--primary" href="/teacher/students" onClick={(event) => { event.preventDefault(); navigate("/teacher/students"); }}>Ir al acceso docente</a>{message ? <p role="alert">{message}</p> : null}</main>;
  if (access === "forbidden") return <main className="classroom-studio classroom-studio--gate"><h1>Acceso docente requerido</h1><p>Esta cuenta no puede administrar aulas ni habilidades.</p><button className="cs-button" type="button" onClick={() => void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).then(() => setAccess("signed-out"))}>Cerrar sesión</button></main>;
  if (access === "error") return <main className="classroom-studio classroom-studio--gate"><h1>No se pudo abrir Classroom Studio</h1><p role="alert">{message || "Inténtalo de nuevo."}</p><button className="cs-button cs-button--primary" type="button" onClick={() => void load()}>Reintentar</button></main>;

  return <main className="classroom-studio" aria-labelledby="cs-title">
    <a className="cs-skip" href="#cs-content">Saltar al contenido</a>
    <header className="cs-header">
      <a className="cs-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>FRAGMENTS<span>.</span></a>
      <nav aria-label="Espacio docente">
        <a aria-current={path.startsWith("/teacher/classrooms") ? "page" : undefined} href="/teacher/classrooms" onClick={(event) => { event.preventDefault(); navigate("/teacher/classrooms"); }}>Aulas</a>
        <a aria-current={isSkills ? "page" : undefined} href="/teacher/skills" onClick={(event) => { event.preventDefault(); navigate("/teacher/skills"); }}>Habilidades</a>
        <a href="/teacher/students" onClick={(event) => { event.preventDefault(); navigate("/teacher/students"); }}>Estudiantes</a>
      </nav>
    </header>
    <div className="cs-page" id="cs-content">
      <p className="cs-eyebrow">ESPACIO DOCENTE · F18.A</p>
      <div className="cs-title-row"><div><h1 id="cs-title">{isSkills ? "Catálogo de habilidades" : isNew ? "Nueva aula" : classroom?.title ?? "Classroom Studio"}</h1><p>{isSkills ? "Crea y reutiliza habilidades en tus aulas." : isNew ? "Organiza una asignatura y su grupo." : classroom ? `${classroom.subject} · ${classroom.groupLabel}` : "Gestiona tus aulas y grupos."}</p></div>
        {!detailId && !isNew && !isSkills ? <button className="cs-button cs-button--primary" type="button" onClick={() => navigate("/teacher/classrooms/new")}><Plus size={18} aria-hidden="true" />Nueva aula</button> : null}
      </div>
      {message ? <p className="cs-notice" role="status">{message}</p> : null}
      {isNew ? <form className="cs-panel cs-form" onSubmit={(event) => void createClassroom(event)}>
        <label>Nombre del aula<input name="title" required maxLength={120} /></label><div className="cs-form-grid"><label>Asignatura<input name="subject" required maxLength={120} /></label><label>Grupo o sección<input name="groupLabel" required maxLength={80} /></label></div>
        <label>Período <span>(opcional)</span><input name="period" maxLength={80} /></label><label>Contexto para el grupo <span>(opcional)</span><textarea name="context" rows={4} maxLength={2000} /></label>
        <div className="cs-actions"><button className="cs-button" type="button" onClick={() => navigate("/teacher/classrooms")}>Cancelar</button><button className="cs-button cs-button--primary" disabled={busy}>Crear aula</button></div>
      </form> : null}
      {isSkills ? <>
        <form className="cs-panel cs-form" onSubmit={(event) => void createSkill(event)}><h2><Plus size={19} aria-hidden="true" />Nueva habilidad</h2><label>Nombre<input required value={skillName} maxLength={100} onChange={(event) => setSkillName(event.target.value)} /></label><label>Descripción <span>(opcional)</span><textarea rows={3} value={skillDescription} maxLength={1000} onChange={(event) => setSkillDescription(event.target.value)} /></label><button className="cs-button cs-button--primary" disabled={busy}>Guardar habilidad</button></form>
        <label className="cs-search">Buscar en tu catálogo<input type="search" value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Nombre o descripción" /></label>
        <section className="cs-list" aria-label="Habilidades de tu catálogo">{contentLoading ? <p role="status">Cargando habilidades…</p> : allSkills.length ? visibleSkills.length ? visibleSkills.map((skill) => <article className="cs-panel cs-skill" key={skill.id}>{editingSkillId === skill.id ? <form className="cs-form cs-edit-skill" onSubmit={(event) => void saveSkill(event, skill.id)}><label>Nombre<input required value={editingSkillName} maxLength={100} onChange={(event) => setEditingSkillName(event.target.value)} /></label><label>Descripción<textarea rows={2} value={editingSkillDescription} maxLength={1000} onChange={(event) => setEditingSkillDescription(event.target.value)} /></label><div className="cs-actions"><button className="cs-button" type="button" onClick={() => setEditingSkillId(null)}>Cancelar</button><button className="cs-button cs-button--primary" disabled={busy}>Guardar</button></div></form> : <><div><h2>{skill.name}{skill.archived ? <span className="cs-status">Archivada</span> : null}</h2>{skill.description ? <p>{skill.description}</p> : null}</div>{!skill.archived ? <div className="cs-actions"><button className="cs-button cs-button--quiet" type="button" disabled={busy} onClick={() => { setEditingSkillId(skill.id); setEditingSkillName(skill.name); setEditingSkillDescription(skill.description ?? ""); }}><Pencil size={17} aria-hidden="true" />Editar</button><button className="cs-button cs-button--quiet" type="button" disabled={busy} onClick={() => void archiveSkill(skill.id)}><Archive size={17} aria-hidden="true" />Archivar</button></div> : null}</>}</article>) : <div className="cs-empty"><ClipboardList aria-hidden="true" /><h2>Sin coincidencias</h2><p>Prueba con otro nombre o descripción.</p></div> : <div className="cs-empty"><ClipboardList aria-hidden="true" /><h2>Aún no hay habilidades</h2><p>Las habilidades que crees aparecerán aquí para habilitarlas en tus aulas.</p></div>}</section>
      </> : null}
      {detailId && classroom ? <>
        <a className="cs-back" href="/teacher/classrooms" onClick={(event) => { event.preventDefault(); navigate("/teacher/classrooms"); }}><ArrowLeft size={16} aria-hidden="true" />Todas las aulas</a>
        <div className="cs-detail-grid">
          <form className="cs-panel cs-form" onSubmit={(event) => void saveClassroom(event)}><div className="cs-panel-heading"><h2>Datos del aula</h2><span className={`cs-status cs-status--${classroom.status}`}>{classroom.status === "active" ? "Activa" : "Archivada"}</span></div><label>Nombre<input name="title" defaultValue={classroom.title} required maxLength={120} /></label><div className="cs-form-grid"><label>Asignatura<input name="subject" defaultValue={classroom.subject} required maxLength={120} /></label><label>Grupo o sección<input name="groupLabel" defaultValue={classroom.groupLabel} required maxLength={80} /></label></div><label>Período<input name="period" defaultValue={classroom.period ?? ""} maxLength={80} /></label><label>Contexto<textarea name="context" defaultValue={classroom.context ?? ""} rows={4} maxLength={2000} /></label><div className="cs-actions"><button className="cs-button cs-button--primary" disabled={busy}>Guardar cambios</button><button className="cs-button cs-button--quiet" type="button" disabled={busy} onClick={() => void classroomApi.update(classroom.id, { status: classroom.status === "active" ? "archived" : "active" }).then((result) => { if (result.ok) { setClassroom(result.data); setMessage("Estado del aula actualizado."); } else setMessage(result.error.message); })}>{classroom.status === "active" ? "Archivar aula" : "Reactivar aula"}</button></div></form>
          <section className="cs-panel cs-members"><div className="cs-panel-heading"><h2><Users size={19} aria-hidden="true" />Miembros y solicitudes</h2><button className="cs-button cs-button--quiet" type="button" disabled={busy} onClick={() => void classroomApi.createCode(classroom.id).then((result) => { if (result.ok) { setJoinCode(result.data); setMessage("Código generado. Cópialo y compártelo con el grupo."); } else setMessage(result.error.message); })}>Generar código</button></div>
            {joinCode ? <div className="cs-code"><p>Código de ingreso</p><code>{joinCode.code}</code><button className="cs-button cs-button--quiet" type="button" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(joinCode.code).then(() => setMessage("Código copiado.")); else setMessage("Copia el código mostrado para compartirlo."); }}>Copiar código</button><button className="cs-text-button" type="button" onClick={() => void classroomApi.revokeCode(classroom.id).then((result) => { if (result.ok) { setJoinCode(null); setMessage("Código revocado."); } else setMessage(result.error.message); })}>Revocar</button></div> : null}
            <form className="cs-direct" onSubmit={(event) => void directAssign(event)}><label>Asignar estudiante existente<select value={studentId} required onChange={(event) => setStudentId(event.target.value)}><option value="">Selecciona una identidad GitHub verificada</option>{students.map((student) => <option key={student.id} value={student.id}>@{student.githubLogin}</option>)}</select></label><button className="cs-button" disabled={busy || !studentId}>Asignar</button></form>
            {contentLoading ? <p role="status">Cargando miembros…</p> : members.length ? <ul className="cs-member-list">{members.map((member) => <li key={member.id}><div><strong>{member.githubLogin ? `@${member.githubLogin}` : member.studentId}</strong><span>{member.status === "pending" ? "Pendiente" : member.status === "active" ? "Activa" : member.status === "rejected" ? "Rechazada" : "Retirada"} · {member.source === "join_code" ? "Código de aula" : "Asignación docente"}</span></div><div className="cs-inline-actions">{member.status === "pending" ? <><button type="button" aria-label={`Aprobar ${member.githubLogin ?? member.studentId}`} onClick={() => void enrollmentAction("approve", member.id)}><Check size={18} aria-hidden="true" /></button><button type="button" aria-label={`Rechazar ${member.githubLogin ?? member.studentId}`} onClick={() => void enrollmentAction("reject", member.id)}><X size={18} aria-hidden="true" /></button></> : member.status === "active" ? <button type="button" aria-label={`Retirar ${member.githubLogin ?? member.studentId}`} onClick={() => void enrollmentAction("remove", member.id)}><Archive size={18} aria-hidden="true" /></button> : null}</div></li>)}</ul> : <p className="cs-empty-inline">Aún no hay solicitudes ni miembros.</p>}
          </section>
          <section className="cs-panel cs-availability"><h2>Habilidades disponibles</h2><p>Solo el alumnado con matrícula activa ve estas habilidades.</p>{skills.length ? skills.map((skill) => <label className={`cs-check ${skill.archived ? "is-archived" : ""}`} key={skill.id}><input type="checkbox" checked={skill.enabled ?? false} disabled={busy || skill.archived} onChange={(event) => void toggleSkill(skill.id, event.target.checked)} /><span><strong>{skill.name}</strong>{skill.description ? <small>{skill.description}</small> : null}{skill.archived ? <small>Archivada; se conservan sus referencias.</small> : null}</span></label>) : <p className="cs-empty-inline">Crea habilidades en el catálogo para habilitarlas aquí.</p>}</section>
        </div>
      </> : null}
      {!isNew && !isSkills && !detailId ? <section className="cs-list" aria-label="Mis aulas">{contentLoading ? <p role="status">Cargando tus aulas…</p> : classrooms.length ? classrooms.map((item) => <a className="cs-panel cs-classroom-card" key={item.id} href={`/teacher/classrooms/${item.id}`} onClick={(event) => { event.preventDefault(); navigate(`/teacher/classrooms/${item.id}`); }}><span className="cs-card-mark" aria-hidden="true"><BookOpen /></span><span><small>{item.subject} · {item.groupLabel}</small><strong>{item.title}</strong><span>{item.period ?? "Sin período indicado"}</span></span><span className={`cs-status cs-status--${item.status}`}>{item.status === "active" ? "Activa" : "Archivada"}</span></a>) : <div className="cs-empty"><BookOpen aria-hidden="true" /><h2>Empieza con un aula</h2><p>Crea un aula para organizar grupos, gestionar solicitudes y habilitar habilidades.</p><button className="cs-button cs-button--primary" type="button" onClick={() => navigate("/teacher/classrooms/new")}><Plus size={18} aria-hidden="true" />Crear primera aula</button></div>}</section> : null}
    </div>
  </main>;
}
