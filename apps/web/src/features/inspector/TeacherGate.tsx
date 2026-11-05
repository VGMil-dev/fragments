import { useEffect, useState, type FormEvent } from "react";
import type { createTeacherApi } from "../../lib/api/teacher-api.js";
import type { createInspectorApi } from "../../lib/api/inspector-api.js";
import { InspectorTeacherWorkspace } from "./InspectorTeacherWorkspace.js";
import "./teacher-gate.css";

type TeacherApi = ReturnType<typeof createTeacherApi>;
type InspectorApi = ReturnType<typeof createInspectorApi>;

export function TeacherGate({ teacherApi, inspectorApi, navigate }: { teacherApi: TeacherApi; inspectorApi: InspectorApi; navigate: (path: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void teacherApi.session().then((result) => {
      if (!active) return;
      setAuthenticated(result.ok && result.data.authenticated);
      setLoading(false);
    });
    return () => { active = false; };
  }, [teacherApi]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await teacherApi.login({ email, password });
    setBusy(false);
    setPassword("");
    if (!result.ok) { setMessage(result.error.message); return; }
    if (!result.data.authenticated) { setMessage("No se pudo iniciar sesión."); return; }
    setAuthenticated(true);
  }

  if (loading) return <main className="teacher-gate" aria-live="polite">Comprobando sesión docente…</main>;
  if (authenticated) return <InspectorTeacherWorkspace api={inspectorApi} navigate={navigate} />;

  return (
    <main className="teacher-gate" aria-labelledby="teacher-gate-title">
      <a className="teacher-gate__home" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
      <section className="teacher-gate__card">
        <p>FRAGMENTS · ESPACIO DOCENTE</p>
        <h1 id="teacher-gate-title">Inicia sesión</h1>
        <span>Usa la cuenta docente provisionada en este servidor.</span>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="teacher-email">Correo docente</label>
          <input id="teacher-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          <label htmlFor="teacher-password">Contraseña</label>
          <input id="teacher-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={1024} />
          {message ? <p className="teacher-gate__error" role="alert">{message}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Validando…" : "Entrar al espacio docente"}</button>
        </form>
      </section>
    </main>
  );
}
