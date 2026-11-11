import { useEffect, useState, type FormEvent } from "react";
import { MentorControlConfigSchema, MentorControlWorkspaceResponseSchema, type MentorControlConfig } from "@fragments/contracts";
import "./mentor-control.css";

type AuthState = "loading" | "anonymous" | "teacher" | "denied";
type Workspace = ReturnType<typeof MentorControlWorkspaceResponseSchema.parse>;

async function checkSession(): Promise<AuthState> {
  try {
    const response = await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return "anonymous";
    const payload = await response.json() as { user?: { role?: unknown; isTeacher?: unknown } };
    const roles = typeof payload.user?.role === "string" ? payload.user.role.split(",") : [];
    return payload.user?.isTeacher === true || roles.includes("admin") ? "teacher" : payload.user ? "denied" : "anonymous";
  } catch { return "anonymous"; }
}

export function MentorControlWorkspace({ navigate }: { navigate: (path: string) => void }) {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [workspace, setWorkspace] = useState<Workspace>();
  const [config, setConfig] = useState<MentorControlConfig>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/teacher/mentor-control", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json() as { ok?: boolean; data?: unknown; error?: { message?: string } };
    if (!response.ok || !body.data) { setMessage(body.error?.message ?? "No se pudo cargar el control de Mentor."); return; }
    const parsed = MentorControlWorkspaceResponseSchema.safeParse(body.data);
    if (!parsed.success) { setMessage("El servidor devolvió una configuración que no reconocemos."); return; }
    setWorkspace(parsed.data);
    setConfig(parsed.data.draft.config);
  }

  useEffect(() => { void checkSession().then((state) => { setAuth(state); if (state === "teacher") void load(); }); }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      if (!response.ok) { setMessage("No se pudo iniciar sesión. Revisa tus datos."); return; }
      const state = await checkSession(); setAuth(state);
      if (state === "teacher") await load(); else setMessage("Esta cuenta no tiene acceso docente.");
    } catch { setMessage("No pudimos conectar con el servicio."); }
    finally { setBusy(false); }
  }

  async function save(publish: boolean) {
    if (!config) return;
    const parsed = MentorControlConfigSchema.safeParse(config);
    if (!parsed.success) { setMessage("Completa los campos y revisa que los criterios tengan datos válidos."); return; }
    setBusy(true); setMessage("");
    try {
      const draftResponse = await fetch("/api/teacher/mentor-control/draft", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!draftResponse.ok) { const result = await draftResponse.json() as { error?: { message?: string } }; setMessage(result.error?.message ?? "No se pudo guardar el borrador."); return; }
      if (publish) {
        const response = await fetch("/api/teacher/mentor-control/publish", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" });
        if (!response.ok) { const result = await response.json() as { error?: { message?: string } }; setMessage(result.error?.message ?? "No se pudo publicar. Los pesos deben sumar 100."); await load(); return; }
        setMessage("Versión publicada para todos los estudiantes.");
      } else setMessage("Borrador guardado.");
      await load();
    } catch { setMessage("No pudimos conectar con el servicio."); }
    finally { setBusy(false); }
  }

  function change<K extends keyof MentorControlConfig>(key: K, value: MentorControlConfig[K]) {
    setConfig((current) => current ? { ...current, [key]: value } : current);
  }

  if (auth === "loading") return <main className="mentor-control"><p>Comprobando el acceso docente…</p></main>;
  if (auth !== "teacher") return <main className="mentor-control">
    <a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
    <p className="mentor-control__eyebrow">FRAGMENTS · ESPACIO DOCENTE</p><h1>Control de Mentor</h1>
    <p>Inicia sesión con una cuenta docente para configurar la consigna y la rúbrica.</p>
    <form onSubmit={(event) => void signIn(event)} className="mentor-control__login">
      <label>Correo<input type="email" name="email" required autoComplete="username" /></label>
      <label>Contraseña<input type="password" name="password" required autoComplete="current-password" /></label>
      <button className="button button--primary" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button>
    </form><a href="/teacher/reset-password" onClick={(event) => { event.preventDefault(); navigate("/teacher/reset-password"); }}>¿Olvidaste tu contraseña?</a>{message ? <p role="alert">{message}</p> : null}
  </main>;

  if (!config || !workspace) return <main className="mentor-control"><p role="alert">{message || "Cargando configuración…"}</p><button onClick={() => void load()}>Reintentar</button></main>;
  const total = config.criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  return <main className="mentor-control" aria-labelledby="mentor-control-title">
    <header className="mentor-control__header"><a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a><p className="mentor-control__eyebrow">FRAGMENTS · ESPACIO DOCENTE</p><h1 id="mentor-control-title">Control de Mentor</h1><p>Define qué se evalúa. La versión publicada se conserva junto a cada resultado.</p></header>
    <section className="mentor-control__active" aria-label="Configuración activa"><strong>Versión activa {workspace.active.version}</strong><span>{workspace.active.config.subject} · {workspace.active.config.theme}</span><span>Publicada {new Date(workspace.active.publishedAt).toLocaleString()}</span></section>
    <form className="mentor-control__form" onSubmit={(event) => { event.preventDefault(); void save(false); }}>
      <h2>Consigna</h2>
      <label>Materia<input value={config.subject} maxLength={120} onChange={(e) => change("subject", e.target.value)} /></label>
      <label>Temática<input value={config.theme} maxLength={160} onChange={(e) => change("theme", e.target.value)} /></label>
      <label className="mentor-control__wide">Consigna<textarea rows={3} value={config.assignment} onChange={(e) => change("assignment", e.target.value)} /></label>
      <label className="mentor-control__wide">Requisitos (uno por línea)<textarea rows={3} value={config.requirements.join("\n")} onChange={(e) => change("requirements", e.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} /></label>
      <label className="mentor-control__wide">Nivel esperado<input value={config.expectedLevel} onChange={(e) => change("expectedLevel", e.target.value)} /></label>
      <h2 className="mentor-control__wide">Rúbrica · pesos actuales: {total}/100</h2>
      <label className="mentor-control__wide">Nombre de la rúbrica<input value={config.rubricTitle} onChange={(e) => change("rubricTitle", e.target.value)} /></label>
      {config.criteria.map((criterion, index) => <fieldset className="mentor-control__criterion" key={criterion.id}><legend>Criterio {index + 1}</legend>
        <label>Nombre<input value={criterion.title} onChange={(e) => change("criteria", config.criteria.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} /></label>
        <label>Descripción<textarea rows={2} value={criterion.description} onChange={(e) => change("criteria", config.criteria.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} /></label>
        <label>Peso<input type="number" min={1} max={100} value={criterion.weight} onChange={(e) => change("criteria", config.criteria.map((item, i) => i === index ? { ...item, weight: Number(e.target.value) } : item))} /></label>
        <button type="button" className="mentor-control__remove" onClick={() => change("criteria", config.criteria.filter((_, i) => i !== index))}>Quitar criterio</button>
      </fieldset>)}
      <button type="button" className="button button--light" disabled={config.criteria.length >= 10} onClick={() => change("criteria", [...config.criteria, { id: `criterion-${Date.now()}`, title: "Nuevo criterio", description: "Describe qué evidencia se espera.", weight: 1 }])}>Añadir criterio</button>
      <div className="mentor-control__actions"><button className="button button--light" disabled={busy}>Guardar borrador</button><button type="button" className="button button--primary" disabled={busy || total !== 100} onClick={() => void save(true)}>Publicar versión</button></div>
    </form>
    {message ? <p role="status">{message}</p> : null}
    <section className="mentor-control__history"><h2>Evaluaciones guardadas</h2>{workspace.evaluations.length ? <ul>{workspace.evaluations.map((row) => <li key={row.evaluationId}><strong>{row.proposalTitle}</strong><span>{row.evaluation.analysis.score}/100 · versión {row.evaluation.mentorContextVersion ?? "anterior"} · propuesta v{row.proposalVersion}</span>
      {row.evaluation.criterionBreakdown?.map((criterion) => <small key={criterion.criterionId}>{criterion.title}: {criterion.points}/{criterion.weight} — {criterion.reason}</small>)}</li>)}</ul> : <p>Aún no hay evaluaciones guardadas.</p>}</section>
  </main>;
}
