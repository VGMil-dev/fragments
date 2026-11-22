import { useEffect, useState } from "react";
import type { AdminDiagnosticsApi, AdminRequestDiagnostic } from "./admin-diagnostics-api.js";
import "./admin-diagnostics.css";

type ScreenState = { status: "loading" } | { status: "ready"; events: AdminRequestDiagnostic[] } | { status: "error" };

export function AdminDiagnosticsScreen({ api }: { api: AdminDiagnosticsApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<ScreenState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.list().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", events: result.data.events } : { status: "error" });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-diagnostics" aria-labelledby="admin-diagnostics-title">
    <header className="admin-diagnostics__header">
      <p className="admin-diagnostics__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-diagnostics-title">Diagnóstico de solicitudes</h1>
      <p>Eventos recientes de la API. Solo se muestran datos operativos redactados.</p>
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={state.status === "loading"}>
        {state.status === "loading" ? "Actualizando…" : "Actualizar"}
      </button>
    </header>
    {state.status === "loading" ? <p role="status">Cargando diagnósticos…</p> : null}
    {state.status === "error" ? <p role="alert">No pudimos cargar los diagnósticos. Verifica el acceso e inténtalo de nuevo.</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">No hay solicitudes recientes.</p> : null}
    {state.status === "ready" && state.events.length > 0 ? <div className="admin-diagnostics__table-wrap">
      <table>
        <caption>Solicitudes recientes · hora UTC</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Método</th><th scope="col">Área</th><th scope="col">Estado</th><th scope="col">Duración</th><th scope="col">Request ID</th></tr></thead>
        <tbody>{state.events.map((event) => <tr key={event.requestId}>
          <td>{formatUtc(event.occurredAt)}</td><td>{event.method}</td><td>{event.routeFamily}</td><td>{event.statusCode}</td><td>{event.durationMs} ms</td><td><code>{event.requestId}</code></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
