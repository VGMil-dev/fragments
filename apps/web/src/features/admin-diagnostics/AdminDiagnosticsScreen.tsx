import { useEffect, useState } from "react";
import type { AdminDiagnosticsApi, AdminRequestDiagnostic, DiagnosticRouteFamily } from "./admin-diagnostics-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
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

  return <main className="admin-diagnostics" aria-labelledby="admin-diagnostics-title" aria-busy={state.status === "loading"}>
    <header className="admin-diagnostics__header">
      <p className="admin-diagnostics__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-diagnostics-title">Diagnóstico de solicitudes</h1>
      <p>Eventos recientes de la API. No incluyen contenido de solicitudes ni datos de cuenta.</p>
      <AdminConsoleNavigation current="diagnostics" />
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={state.status === "loading"} aria-label={state.status === "error" ? "Reintentar diagnósticos" : "Actualizar diagnósticos"}>
        {state.status === "loading" ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}
      </button>
    </header>
    <p className="admin-diagnostics__retention">El historial solo incluye el proceso actual de la API.</p>
    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando diagnósticos…</p> : null}
    {state.status === "error" ? <p role="alert">No pudimos cargar los diagnósticos. Verifica el acceso e inténtalo de nuevo.</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">No hay solicitudes recientes.</p> : null}
    {state.status === "ready" && state.events.length > 0 ? <div className="admin-diagnostics__table-wrap" role="region" aria-label="Solicitudes recientes" tabIndex={0}>
      <table>
        <caption>Solicitudes recientes · hora UTC · campos operativos</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Método</th><th scope="col">Área</th><th scope="col">Código HTTP</th><th scope="col">Duración</th><th scope="col">ID de solicitud</th></tr></thead>
        <tbody>{state.events.map((event) => <tr key={event.requestId}>
          <td><time dateTime={event.occurredAt}>{formatUtc(event.occurredAt)}</time></td><td>{event.method}</td><td>{routeFamilyLabel(event.routeFamily)}</td><td><span aria-label={`Código HTTP ${event.statusCode}`}>{event.statusCode}</span></td><td>{event.durationMs} ms</td><td><code>{event.requestId}</code></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function routeFamilyLabel(value: DiagnosticRouteFamily): string {
  const labels: Record<DiagnosticRouteFamily, string> = {
    health: "Salud",
    auth: "Autenticación",
    classrooms: "Aulas",
    assignments: "Misiones",
    mentor: "Mentor",
    review: "Review",
    trainer: "Trainer",
    inspector: "Inspector",
    "admin.diagnostics": "Diagnóstico admin",
    "admin.requests": "Solicitudes admin",
    "admin.queue": "Cola admin",
    "admin.audit_log": "Registro admin",
    other: "Otra ruta",
  };
  return labels[value];
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
