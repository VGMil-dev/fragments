import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, BriefcaseBusiness, Clock3, GraduationCap, Home, Layers3, LogOut, Settings2, Shield, TerminalSquare, Users, GitBranch, UserRound, ExternalLink } from "lucide-react";
import { ClassroomStudio } from "../classroom/ClassroomStudio.js";
import { TeacherGate } from "../inspector/index.js";
import { createApiClient } from "../../lib/api/api-client.js";
import { createInspectorApi } from "../../lib/api/inspector-api.js";
import { classroomApi } from "../../lib/api/classroom-api.js";
import { MentorControlWorkspace } from "../mentor-control/MentorControlWorkspace.js";
import { TeacherStudentsWorkspace } from "./TeacherStudentsWorkspace.js";
import { TeacherReviewWorkspace } from "./TeacherReviewWorkspace.js";
import type { TeacherDashboardSummary } from "@fragments/contracts";
import "./teacher-workspace-shell.css";

const inspectorApi = createInspectorApi(createApiClient());
type AccessState = "checking" | "signed-out" | "forbidden" | "ready" | "error";
type TeacherIdentity = { id: string; displayName: string };
type DashboardState = {
  status: "loading" | "ready" | "error";
  totalClassrooms: number | null;
  classrooms: TeacherDashboardSummary["classrooms"];
  pendingRequests: number | null;
};

const emptyDashboard: DashboardState = { status: "loading", totalClassrooms: null, classrooms: [], pendingRequests: null };

function isTeacherSession(payload: unknown): payload is { user: { id: string; isTeacher?: boolean; role?: unknown; name?: unknown; email?: unknown } } {
  if (!payload || typeof payload !== "object" || !("user" in payload)) return false;
  const user = (payload as { user?: unknown }).user;
  return Boolean(user && typeof user === "object" && "id" in user && typeof (user as { id?: unknown }).id === "string");
}

function isAuthorizedTeacher(user: { isTeacher?: boolean; role?: unknown }): boolean {
  const roles = typeof user.role === "string" ? user.role.split(",") : [];
  return user.isTeacher === true || roles.includes("admin");
}

async function readTeacherSession(): Promise<{ state: AccessState; identity?: TeacherIdentity }> {
  try {
    const response = await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return { state: "error" };
    const payload: unknown = await response.json();
    if (!isTeacherSession(payload)) return { state: "signed-out" };
    if (!isAuthorizedTeacher(payload.user)) return { state: "forbidden" };

    const name = typeof payload.user.name === "string" && payload.user.name.trim()
      ? payload.user.name.trim()
      : typeof payload.user.email === "string" && payload.user.email.trim()
        ? payload.user.email.trim()
        : "Cuenta docente";
    return { state: "ready", identity: { id: payload.user.id, displayName: name } };
  } catch {
    return { state: "error" };
  }
}

function TeacherSignIn({ onSignedIn, navigate }: { onSignedIn: () => void; navigate: (path: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setMessage("No se pudo validar el acceso. Revisa tus datos e inténtalo de nuevo.");
        return;
      }
      onSignedIn();
    } catch {
      setMessage("No pudimos conectar con el servicio. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="teacher-shell-gate" aria-labelledby="teacher-sign-in-title">
    <img src="/brand/fragments-isotipo-recto.svg" alt="" width="42" height="36" />
    <p className="teacher-shell-eyebrow">FRAGMENTS · ESPACIO DOCENTE</p>
    <h1 id="teacher-sign-in-title">Inicia sesión</h1>
    <p>Usa tu cuenta docente para abrir tus aulas y herramientas académicas.</p>
    <form onSubmit={(event) => void signIn(event)}>
      <label>Correo<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? "Comprobando…" : "Iniciar sesión"}</button>
    </form>
    {message ? <p role="alert">{message}</p> : null}
    <a href="/teacher/reset-password" onClick={(event) => { event.preventDefault(); navigate("/teacher/reset-password"); }}>¿Olvidaste tu contraseña?</a>
  </main>;
}

function TeacherDashboard({ navigate }: { navigate: (path: string) => void }) {
  const [state, setState] = useState<DashboardState>(emptyDashboard);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setState(emptyDashboard);
    void (async () => {
      const result = await classroomApi.dashboardSummary();
      if (!active) return;
      if (!result.ok) { setState({ status: "error", totalClassrooms: null, classrooms: [], pendingRequests: null }); return; }
      setState({ status: "ready", totalClassrooms: result.data.totalClassrooms, classrooms: result.data.classrooms, pendingRequests: result.data.pendingJoinRequests });
    })().catch(() => {
      if (active) setState({ status: "error", totalClassrooms: null, classrooms: [], pendingRequests: null });
    });
    return () => { active = false; };
  }, [reload]);

  const visibleClassrooms = state.classrooms;
  const pendingDisplay = state.status === "loading" ? "…" : state.status === "error" || state.pendingRequests === null ? "—" : String(state.pendingRequests);
  const totalDisplay = state.status === "loading" ? "…" : state.status === "error" || state.totalClassrooms === null ? "—" : String(state.totalClassrooms);

  return <main className="teacher-dashboard" aria-labelledby="teacher-dashboard-title">
    <header className="teacher-dashboard__heading">
      <div><p className="teacher-shell-eyebrow">FRAGMENTS · ESPACIO DOCENTE</p><h1 id="teacher-dashboard-title">Espacio docente <span aria-hidden="true">▪</span></h1>
        <p>Gestiona tus aulas y herramientas académicas desde un solo lugar.</p></div>
      <a className="teacher-dashboard__cta" href="/teacher/classrooms" onClick={(event) => { event.preventDefault(); navigate("/teacher/classrooms"); }}><ExternalLink size={19} aria-hidden="true" />Ir a Classroom Studio</a>
    </header>

    {state.status === "error" ? <div className="teacher-dashboard__error" role="alert"><p>No pudimos cargar el resumen de tus aulas.</p><button type="button" onClick={() => setReload((value) => value + 1)}>Reintentar</button></div> : null}

    <section className="teacher-metrics" aria-label="Resumen de aulas">
      <article className="teacher-metric"><Layers3 aria-hidden="true" /><div><h2>Total de aulas</h2><strong>{totalDisplay}</strong><p>Aulas propias registradas, incluido el historial.</p></div></article>
      <article className="teacher-metric teacher-metric--requests"><Users aria-hidden="true" /><div><h2>Solicitudes pendientes</h2><strong>{pendingDisplay}</strong><p>Solicitudes de ingreso por revisar.</p></div></article>
      <article className="teacher-metric teacher-metric--projects"><GitBranch aria-hidden="true" /><div><h2>Proyectos en seguimiento</h2><strong>—</strong><p>No hay todavía un vínculo verificable entre aula y proyecto.</p></div></article>
    </section>

    <div className="teacher-dashboard__columns">
      <section className="teacher-panel teacher-panel--classrooms" aria-labelledby="teacher-classrooms-title">
        <header><div><Layers3 aria-hidden="true" /><h2 id="teacher-classrooms-title">Mis aulas</h2></div>
          <a href="/teacher/classrooms" onClick={(event) => { event.preventDefault(); navigate("/teacher/classrooms"); }}>Ver todas <ArrowRight size={18} aria-hidden="true" /></a></header>
        <p className="teacher-panel__description">Espacios compartidos por temática.</p>
        {state.status === "loading" ? <p role="status">Cargando tus aulas…</p> : null}
        {state.status === "ready" && visibleClassrooms.length === 0 ? <div className="teacher-empty"><GraduationCap aria-hidden="true" /><h3>Aún no tienes aulas</h3><p>Crea un espacio por temática para compartir actividades con tus estudiantes.</p><button type="button" onClick={() => navigate("/teacher/classrooms/new")}>Crear una primera aula</button></div> : null}
        {state.status === "ready" && visibleClassrooms.length ? <ul className="teacher-classroom-list">{visibleClassrooms.map((classroom) => <li key={classroom.id}>
          <a href={`/teacher/classrooms/${classroom.id}`} onClick={(event) => { event.preventDefault(); navigate(`/teacher/classrooms/${classroom.id}`); }}>
            <span className="teacher-classroom-list__icon" aria-hidden="true"><TerminalSquare /></span>
            <span className="teacher-classroom-list__title"><strong>{classroom.title}</strong><small>{classroom.subject}</small></span>
            <span className={`teacher-classroom-list__status${classroom.status === "archived" ? " is-archived" : ""}`}>{classroom.status === "archived" ? "Histórica" : "Ver aula"}</span>
            <ArrowRight className="teacher-classroom-list__arrow" size={19} aria-hidden="true" />
          </a>
        </li>)}</ul> : null}
        {state.status === "ready" && state.totalClassrooms !== null && state.totalClassrooms > visibleClassrooms.length ? <p className="teacher-panel__footnote">Se muestran {visibleClassrooms.length} de {state.totalClassrooms} aulas.</p> : null}
      </section>

      <section className="teacher-panel teacher-panel--activity" aria-labelledby="teacher-activity-title">
        <header><div><Clock3 aria-hidden="true" /><h2 id="teacher-activity-title">Actividad reciente</h2></div></header>
        <p className="teacher-panel__description">Últimas acciones registradas en tus aulas.</p>
        <div className="teacher-empty teacher-empty--activity"><Clock3 aria-hidden="true" /><p>La actividad reciente no está disponible todavía.</p><small>Se mostrará cuando exista una consulta autorizada a eventos persistidos.</small></div>
      </section>
    </div>
  </main>;
}

function TeacherSettings({ identity, navigate }: { identity: TeacherIdentity; navigate: (path: string) => void }) {
  return <main className="teacher-settings" aria-labelledby="teacher-settings-title"><p className="teacher-shell-eyebrow">CUENTA DOCENTE</p><h1 id="teacher-settings-title">Configuración</h1>
    <div className="teacher-settings__card"><UserRound aria-hidden="true" /><div><strong>{identity.displayName}</strong><small>Cuenta autenticada en Fragments</small></div></div>
    <p>La contraseña se administra mediante Better Auth. Si necesitas recuperarla, solicita un enlace al correo de tu cuenta.</p>
    <button type="button" onClick={() => navigate("/teacher/reset-password")}>Recuperar contraseña</button>
  </main>;
}

function renderWorkspace(path: string, navigate: (path: string) => void, identity: TeacherIdentity): ReactNode {
  if (path === "/teacher/dashboard" || path === "/teacher") return <TeacherDashboard navigate={navigate} />;
  if (path === "/teacher/classrooms" || path.startsWith("/teacher/classrooms/") || path === "/teacher/skills") return <ClassroomStudio path={path} navigate={navigate} embedded />;
  if (path === "/teacher/students") return <TeacherStudentsWorkspace navigate={navigate} />;
  if (path === "/teacher/inspector") return <TeacherGate inspectorApi={inspectorApi} navigate={navigate} />;
  if (path === "/teacher/mentor-control") return <MentorControlWorkspace navigate={navigate} />;
  if (path === "/teacher/settings") return <TeacherSettings identity={identity} navigate={navigate} />;
  if (path === "/teacher/review") return <TeacherReviewWorkspace />;
  return <main className="teacher-settings"><h1>No se encontró esta sección</h1><a href="/teacher/dashboard" onClick={(event) => { event.preventDefault(); navigate("/teacher/dashboard"); }}>Volver al inicio docente</a></main>;
}

const primaryNavigation = [
  { label: "Inicio", path: "/teacher/dashboard", icon: Home },
  { label: "Mis aulas", path: "/teacher/classrooms", icon: Layers3 },
  { label: "Estudiantes", path: "/teacher/students", icon: Users },
];
const toolNavigation = [
  { label: "Classroom Studio", path: "/teacher/classrooms", icon: BriefcaseBusiness },
  { label: "Habilidades", path: "/teacher/skills", icon: GraduationCap },
  { label: "Control de Mentor", path: "/teacher/mentor-control", icon: Shield },
  { label: "Review", path: "/teacher/review", icon: GitBranch },
  { label: "Inspector", path: "/teacher/inspector", icon: TerminalSquare },
];

function NavLink({ item, path, navigate, className = "" }: { item: { label: string; path: string; icon: typeof Home }; path: string; navigate: (path: string) => void; className?: string }) {
  const Icon = item.icon;
  const selected = item.path === path || (item.path === "/teacher/classrooms" && path.startsWith("/teacher/classrooms")) || (item.path === "/teacher/mentor-control" && path === "/teacher/settings");
  return <a className={className} href={item.path} aria-current={selected ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate(item.path); }}><Icon size={19} aria-hidden="true" /><span>{item.label}</span></a>;
}

export function TeacherWorkspaceShell({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [access, setAccess] = useState<AccessState>("checking");
  const [identity, setIdentity] = useState<TeacherIdentity>({ id: "", displayName: "Cuenta docente" });
  const [identityReload, setIdentityReload] = useState(0);
  const [signOutMessage, setSignOutMessage] = useState("");

  useEffect(() => {
    let active = true;
    setAccess("checking");
    void readTeacherSession().then((result) => {
      if (!active) return;
      setAccess(result.state);
      if (result.identity) setIdentity(result.identity);
    });
    return () => { active = false; };
  }, [identityReload]);

  useEffect(() => {
    if (access !== "ready") return;
    requestAnimationFrame(() => document.getElementById("route-content")?.focus({ preventScroll: true }));
  }, [access, path]);

  async function signOut() {
    setSignOutMessage("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" });
      if (!response.ok) { setSignOutMessage("No se pudo cerrar la sesión. Inténtalo de nuevo."); return; }
      setAccess("signed-out");
      navigate("/teacher/dashboard");
    } catch {
      setSignOutMessage("No se pudo cerrar la sesión. Comprueba la conexión e inténtalo de nuevo.");
    }
  }

  if (access === "checking") return <main className="teacher-shell-state"><p role="status">Comprobando el acceso docente…</p></main>;
  if (access === "signed-out") return <TeacherSignIn onSignedIn={() => setIdentityReload((value) => value + 1)} navigate={navigate} />;
  if (access === "forbidden") return <main className="teacher-shell-state" aria-labelledby="teacher-forbidden-title"><h1 id="teacher-forbidden-title">Acceso docente requerido</h1><p>Esta cuenta no tiene permisos para abrir herramientas docentes.</p>{signOutMessage ? <p role="alert">{signOutMessage}</p> : null}<button type="button" onClick={() => void signOut()}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button></main>;
  if (access === "error") return <main className="teacher-shell-state" aria-labelledby="teacher-access-error-title"><h1 id="teacher-access-error-title">No pudimos comprobar el acceso</h1><p role="alert">Inténtalo de nuevo. No se han cargado datos del espacio docente.</p><button type="button" onClick={() => setIdentityReload((value) => value + 1)}>Reintentar</button></main>;

  return <div className="teacher-shell">
    <a className="teacher-shell__skip" href="#route-content">Saltar al contenido</a>
    <aside className="teacher-sidebar" aria-label="Navegación docente">
      <a className="teacher-sidebar__brand" href="/teacher/dashboard" onClick={(event) => { event.preventDefault(); navigate("/teacher/dashboard"); }} aria-label="Fragments, espacio docente">
        <img src="/brand/fragments-isotipo-recto.svg" alt="" width="36" height="32" /><span>fragments<span>.</span></span>
      </a>
      <nav className="teacher-sidebar__nav" aria-label="Secciones principales">
        {primaryNavigation.map((item) => <NavLink key={item.label} item={item} path={path} navigate={navigate} />)}
      </nav>
      <div className="teacher-sidebar__tools">
        <h2>Herramientas docentes</h2>
        <nav aria-label="Herramientas docentes">{toolNavigation.map((item) => <NavLink key={item.label} item={item} path={path} navigate={navigate} />)}</nav>
      </div>
      <div className="teacher-sidebar__account">
        <NavLink item={{ label: "Configuración", path: "/teacher/settings", icon: Settings2 }} path={path} navigate={navigate} />
        <div className="teacher-account"><span className="teacher-account__avatar"><UserRound size={19} aria-hidden="true" /></span><span className="teacher-account__name">{identity.displayName}</span><button type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void signOut()}><LogOut size={18} aria-hidden="true" /></button></div>
      </div>
      <details className="teacher-sidebar__mobile-menu"><summary>Menú docente</summary><div>
        {[...primaryNavigation, ...toolNavigation, { label: "Configuración", path: "/teacher/settings", icon: Settings2 }].map((item) => <NavLink key={item.label} item={item} path={path} navigate={navigate} />)}
        <button type="button" onClick={() => void signOut()}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button>
      </div></details>
    </aside>
    <div className="teacher-shell__content">
      {signOutMessage ? <p className="teacher-shell__notice" role="alert">{signOutMessage}</p> : null}
      <div id="route-content" className="teacher-shell__main" tabIndex={-1}>
        {renderWorkspace(path, navigate, identity)}
      </div>
      <footer className="teacher-shell__footer"><span>FRAGMENTS · ESPACIO DOCENTE</span><a href="/teacher/settings" onClick={(event) => { event.preventDefault(); navigate("/teacher/settings"); }}>Cuenta y seguridad</a></footer>
    </div>
  </div>;
}
