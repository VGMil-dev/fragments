import { useEffect, useState, type FormEvent } from "react";
import type { InspectorChallengeRecordResponse } from "@fragments/contracts";
import type { createInspectorApi } from "../../lib/api/inspector-api.js";
import { InspectorTeacherPanel } from "./InspectorTeacherPanel.js";
import "./inspector-teacher-workspace.css";

type InspectorApi = ReturnType<typeof createInspectorApi>;
type AuthState = "loading" | "anonymous" | "teacher" | "denied";

async function checkTeacherSession(): Promise<AuthState> {
  try {
    const response = await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return "anonymous";
    const payload = await response.json() as { user?: { role?: unknown; isTeacher?: unknown } } | null;
    const roleList = typeof payload?.user?.role === "string" ? payload.user.role.split(",") : [];
    if (payload?.user?.isTeacher === true || roleList.includes("admin")) return "teacher";
    return payload?.user ? "denied" : "anonymous";
  } catch {
    return "anonymous";
  }
}

export function InspectorTeacherWorkspace({ api, navigate }: { api: InspectorApi; navigate: (path: string) => void }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [records, setRecords] = useState<InspectorChallengeRecordResponse[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const active = records.find((record) => record.id === selectedId) ?? records.at(-1) ?? null;

  useEffect(() => {
    let active = true;
    void checkTeacherSession().then((state) => { if (active) setAuthState(state); });
    return () => { active = false; };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        setAuthMessage("No se pudo iniciar sesión. Revisa tus datos o contacta a quien administra Fragments.");
        return;
      }
      const state = await checkTeacherSession();
      setAuthState(state);
      if (state !== "teacher") setAuthMessage("Esta cuenta no tiene acceso docente a Inspector.");
    } catch {
      setAuthMessage("No pudimos conectar con el servicio. Inténtalo de nuevo.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try { await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }); }
    finally { setAuthState("anonymous"); setRecords([]); setSelectedId(""); }
  }

  function saveRecord(record: InspectorChallengeRecordResponse) {
    setRecords((current) => [...current.filter((item) => item.id !== record.id), record]);
    setSelectedId(record.id);
    setMessage("");
  }

  async function loadReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await api.list(reviewId);
    if (!result.ok) { setMessage(result.error.message); return; }
    setRecords(result.data);
    setSelectedId(result.data.at(-1)?.id ?? "");
    setMessage(result.data.length ? "Retos de la revisión cargados." : "Esta revisión aún no tiene retos Inspector.");
  }

  async function createChallenge() {
    const result = await api.create(reviewId);
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Reto creado desde evidencia verificada.");
  }

  async function assignChallenge() {
    if (!active) return;
    const result = await api.assign(active.id);
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Reto asignado. Ya puedes registrar la defensa.");
  }

  async function recordDefense(form: FormData) {
    if (!active) return;
    const result = await api.record(active.id, {
      mutationObserved: form.get("mutationObserved") === "true",
      restorationConfirmed: form.get("restorationConfirmed") === "true",
      notes: String(form.get("notes") ?? ""),
    });
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Defensa registrada.");
  }

  if (authState === "loading") return <main className="inspector-workspace" aria-live="polite">Comprobando el acceso docente…</main>;
  if (authState !== "teacher") return (
    <main className="inspector-workspace" aria-labelledby="inspector-workspace-title">
      <header className="inspector-workspace__header">
        <a className="inspector-workspace__home" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
        <p>FRAGMENTS · ESPACIO DOCENTE</p>
        <h1 id="inspector-workspace-title">Inspector</h1>
        <span>Inicia sesión con una cuenta docente para continuar.</span>
      </header>
      {authState === "denied" ? <p role="alert">Esta cuenta no tiene acceso docente a Inspector.</p> : null}
      <form className="inspector-workspace__login" onSubmit={signIn}>
        <label htmlFor="teacher-email">Correo institucional</label>
        <input id="teacher-email" name="email" type="email" autoComplete="username" required maxLength={254} />
        <label htmlFor="teacher-password">Contraseña</label>
        <input id="teacher-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
        <button type="submit" disabled={authBusy}>{authBusy ? "Ingresando…" : "Iniciar sesión"}</button>
        {authMessage ? <p role="alert">{authMessage}</p> : null}
      </form>
    </main>
  );

  return (
    <main className="inspector-workspace" aria-labelledby="inspector-workspace-title">
      <header className="inspector-workspace__header">
        <a className="inspector-workspace__home" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
        <p>FRAGMENTS · ESPACIO DOCENTE</p>
        <h1 id="inspector-workspace-title">Inspector</h1>
        <span>Los retos parten de evidencia del commit y la ayuda permanece privada.</span>
        <button className="inspector-workspace__logout" type="button" onClick={() => void signOut()}>Cerrar sesión</button>
      </header>
      <form className="inspector-workspace__lookup" onSubmit={loadReview}>
        <label htmlFor="inspector-review-id">ID de revisión</label>
        <input id="inspector-review-id" name="reviewId" value={reviewId} onChange={(event) => setReviewId(event.target.value)} required maxLength={100} />
        <button type="submit">Cargar revisión</button>
        <button type="button" onClick={() => void createChallenge()} disabled={!reviewId.trim()}>Crear reto</button>
      </form>
      {records.length > 1 ? (
        <label className="inspector-workspace__select-label" htmlFor="inspector-challenge-id">Reto de esta revisión
          <select id="inspector-challenge-id" value={active?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
            {records.map((record) => <option key={record.id} value={record.id}>{record.status} · {record.id}</option>)}
          </select>
        </label>
      ) : null}
      <InspectorTeacherPanel
        challenge={active?.challenge ?? null}
        status={active?.status ?? "pending"}
        onAssign={assignChallenge}
        onRecord={recordDefense}
        message={message}
      />
    </main>
  );
}
