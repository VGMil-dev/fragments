import { useEffect, useState } from "react";
import type { AdminQueueApi, AdminQueueSummary } from "./admin-queue-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-queue.css";

type State = { status: "loading" } | { status: "ready"; summary: AdminQueueSummary } | { status: "error"; reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER" };
const rows = [
  ["pending", "Pendientes", "Esperan a que el worker tome el trabajo."],
  ["leased", "En proceso", "Tienen un lease vigente."],
  ["expiredLeases", "Leases vencidos o sin fecha", "Conservan estado leased sin un lease vigente."],
  ["failed", "Fallidos", "Terminaron con estado failed."],
  ["done", "Completados", "Terminaron con estado done."],
  ["other", "Otros estados", "No coinciden con los estados conocidos."],
] as const;

function errorReason(code: string): Extract<State, { status: "error" }>['reason'] {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

export function AdminQueueSummaryScreen({ api }: { api: AdminQueueApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", summary: result.data } : { status: "error", reason: errorReason(result.error.code) });
    }).catch(() => { if (active) setState({ status: "error", reason: "OTHER" }); });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-queue" aria-labelledby="admin-queue-title" aria-busy={state.status === "loading"}>
    <header className="admin-queue__header">
      <p className="admin-queue__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-queue-title">Estado de la cola</h1>
      <p>Conteos agregados de trabajos y leases. No se muestran trabajos individuales ni datos de su contenido; estos conteos no confirman por sí solos que el worker esté disponible.</p>
      <AdminConsoleNavigation current="queue" accessDenied={state.status === "error" && state.reason !== "OTHER"} />
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={state.status === "loading"}>
        {state.status === "loading" ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}
      </button>
    </header>
    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando estado de la cola…</p> : null}
    {state.status === "error" ? <p role="alert">{errorMessage(state.reason)}</p> : null}
    {state.status === "ready" ? <>
      <p className="admin-queue__sampled"><time dateTime={state.summary.sampledAt}>Muestreo UTC: {formatUtc(state.summary.sampledAt)}</time></p>
      <dl className="admin-queue__counts">
        {rows.map(([key, label, description]) => <div key={key} className="admin-queue__count">
          <dt>{label}</dt><dd>{state.summary.counts[key]}</dd><p>{description}</p>
        </div>)}
      </dl>
    </> : null}
  </main>;
}

function errorMessage(reason: Extract<State, { status: "error" }>['reason']): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar el estado de la cola.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar el estado de la cola. Solicita acceso admin o usa una cuenta administradora.";
  return "No se pudo cargar el estado de la cola. Verifica el acceso e inténtalo de nuevo.";
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
