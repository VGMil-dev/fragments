import { useEffect, useState } from "react";
import type { AdminQueueApi, AdminQueueSummary } from "./admin-queue-api.js";
import "./admin-queue.css";

type State = { status: "loading" } | { status: "ready"; summary: AdminQueueSummary } | { status: "error" };
const rows = [
  ["pending", "Pendientes", "Esperan a que el worker tome el trabajo."],
  ["leased", "En proceso", "Tienen un lease vigente."],
  ["expiredLeases", "Leases vencidos o sin fecha", "Conservan estado leased sin un lease vigente."],
  ["failed", "Fallidos", "Terminaron con estado failed."],
  ["done", "Completados", "Terminaron con estado done."],
  ["other", "Otros estados", "No coinciden con los estados conocidos."],
] as const;

export function AdminQueueSummaryScreen({ api }: { api: AdminQueueApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", summary: result.data } : { status: "error" });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-queue" aria-labelledby="admin-queue-title" aria-busy={state.status === "loading"}>
    <header className="admin-queue__header">
      <p className="admin-queue__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-queue-title">Estado de la cola</h1>
      <p>Conteos agregados de trabajos y leases. No se muestran trabajos individuales ni datos de su contenido; estos conteos no confirman por sí solos que el worker esté disponible.</p>
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={state.status === "loading"}>
        {state.status === "loading" ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}
      </button>
    </header>
    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando estado de la cola…</p> : null}
    {state.status === "error" ? <p role="alert">No se pudo cargar el estado de la cola. Verifica el acceso e inténtalo de nuevo.</p> : null}
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

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
