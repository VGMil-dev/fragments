import { useEffect, useState } from "react";
import type { AdminDiagnosticsApi, AdminRequestDiagnostic, DiagnosticRouteFamily } from "../admin-diagnostics/admin-diagnostics-api.js";
import type { AdminQueueApi, AdminQueueSummary } from "../admin-queue/admin-queue-api.js";
import "./admin-overview.css";

type ViewState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER" };

function toReason(code: string): Extract<ViewState<never>, { status: "error" }>['reason'] {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

const familyLabels: Record<DiagnosticRouteFamily, string> = {
  health: "Salud", auth: "Autenticación", classrooms: "Aulas", assignments: "Misiones",
  mentor: "Mentor", review: "Review", trainer: "Trainer", inspector: "Inspector",
  "admin.diagnostics": "Diagnósticos admin", "admin.requests": "Solicitudes admin",
  "admin.queue": "Cola admin", "admin.audit_log": "Registro admin", other: "Otra ruta",
};

const toolLinks = [
  ["/admin/diagnostics", "Diagnósticos"], ["/admin/requests", "Solicitudes académicas"],
  ["/admin/queue", "Cola de trabajos"], ["/admin/audit-log", "Registro de actividad"],
  ["/admin/review-events", "Eventos de Review"], ["/admin/mentor-events", "Eventos de Mentor"],
  ["/admin/trainer-events", "Eventos de Trainer"], ["/admin/teachers", "Cuentas docentes"],
] as const;

export function AdminOverviewScreen({ diagnosticsApi, queueApi }: { diagnosticsApi: AdminDiagnosticsApi; queueApi: AdminQueueApi }) {
  const [diagnostics, setDiagnostics] = useState<ViewState<AdminRequestDiagnostic[]>>({ status: "loading" });
  const [queue, setQueue] = useState<ViewState<AdminQueueSummary>>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const loading = diagnostics.status === "loading" || queue.status === "loading";

  useEffect(() => {
    let active = true;
    setDiagnostics({ status: "loading" });
    setQueue({ status: "loading" });
    void diagnosticsApi.list().then((result) => {
      if (!active) return;
      setDiagnostics(result.ok ? { status: "ready", data: result.data.events } : { status: "error", reason: toReason(result.error.code) });
    }).catch(() => { if (active) setDiagnostics({ status: "error", reason: "OTHER" }); });
    void queueApi.read().then((result) => {
      if (!active) return;
      setQueue(result.ok ? { status: "ready", data: result.data } : { status: "error", reason: toReason(result.error.code) });
    }).catch(() => { if (active) setQueue({ status: "error", reason: "OTHER" }); });
    return () => { active = false; };
  }, [diagnosticsApi, queueApi, reload]);

  const events = diagnostics.status === "ready" ? diagnostics.data : [];
  const byFamily = new Map<DiagnosticRouteFamily, { count: number; serverErrors: number }>();
  for (const event of events) {
    const current = byFamily.get(event.routeFamily) ?? { count: 0, serverErrors: 0 };
    current.count += 1;
    if (event.statusCode >= 500) current.serverErrors += 1;
    byFamily.set(event.routeFamily, current);
  }
  const serverErrors = events.filter((event) => event.statusCode >= 500).length;
  const latestEvent = events.reduce<AdminRequestDiagnostic | undefined>((latest, event) =>
    !latest || Date.parse(event.occurredAt) > Date.parse(latest.occurredAt) ? event : latest, undefined);

  return <main className="admin-overview" aria-labelledby="admin-overview-title" aria-busy={loading}>
    <header className="admin-overview__header">
      <div>
        <p className="admin-overview__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
        <h1 id="admin-overview-title">Resumen operativo</h1>
        <p>Vista de lectura con diagnósticos permitidos y el último conteo disponible de la cola.</p>
      </div>
      <button className="admin-overview__refresh" type="button" onClick={() => setReload((value) => value + 1)} disabled={loading}>
        {loading ? "Actualizando…" : diagnostics.status === "error" || queue.status === "error" ? "Reintentar resumen" : "Actualizar resumen"}
      </button>
    </header>

    {loading ? <p className="admin-overview__loading" role="status" aria-live="polite">Cargando el resumen de administración…</p> : null}

    <div className="admin-overview__grid">
      <section className="admin-overview__panel" aria-labelledby="admin-overview-diagnostics">
        <div className="admin-overview__section-heading"><div><p className="admin-overview__eyebrow">MUESTRA OPERATIVA</p><h2 id="admin-overview-diagnostics">Diagnósticos recientes</h2></div>
          {diagnostics.status === "ready" ? <span className="admin-overview__badge">Muestra recibida: {events.length}</span> : null}
        </div>
        {diagnostics.status === "error" ? <p className="admin-overview__error" role="alert">{diagnosticError(diagnostics.reason)}</p> : null}
        {diagnostics.status === "ready" && events.length === 0 ? <p className="admin-overview__empty" role="status">No hay diagnósticos recientes en la muestra recibida.</p> : null}
        {diagnostics.status === "ready" && events.length > 0 ? <>
          <dl className="admin-overview__metrics">
            <div><dt>Solicitudes recibidas</dt><dd>{events.length}</dd></div>
            <div><dt>Solicitudes HTTP 5xx</dt><dd>{serverErrors}</dd></div>
            <div><dt>Evento más reciente</dt><dd>{latestEvent ? <time dateTime={latestEvent.occurredAt}>{formatUtc(latestEvent.occurredAt)}</time> : "Sin dato"}</dd></div>
          </dl>
          <div className="admin-overview__table-wrap">
            <table>
              <caption>Conteo por área dentro de la muestra recibida</caption>
              <thead><tr><th scope="col">Área</th><th scope="col">Solicitudes</th><th scope="col">HTTP 5xx</th></tr></thead>
              <tbody>{[...byFamily.entries()].map(([family, summary]) => <tr key={family}><th scope="row">{familyLabels[family]}</th><td>{summary.count}</td><td>{summary.serverErrors}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="admin-overview__note">Resumen limitado a los campos operativos allowlisted devueltos por Diagnósticos. No incluye contenido ni identificadores de solicitud.</p>
        </> : null}
      </section>

      <section className="admin-overview__panel" aria-labelledby="admin-overview-queue">
        <div className="admin-overview__section-heading"><div><p className="admin-overview__eyebrow">ÚLTIMA LECTURA</p><h2 id="admin-overview-queue">Cola de trabajos</h2></div></div>
        {queue.status === "error" ? <p className="admin-overview__error" role="alert">{queueError(queue.reason)}</p> : null}
        {queue.status === "ready" ? <>
          <p className="admin-overview__sample-time">Conteo recibido <time dateTime={queue.data.sampledAt}>{formatUtc(queue.data.sampledAt)}</time> (UTC)</p>
          <dl className="admin-overview__queue-counts">
            <div><dt>Pendientes</dt><dd>{queue.data.counts.pending}</dd></div>
            <div><dt>En proceso</dt><dd>{queue.data.counts.leased}</dd></div>
            <div><dt>Leases vencidos</dt><dd>{queue.data.counts.expiredLeases}</dd></div>
            <div><dt>Fallidos</dt><dd>{queue.data.counts.failed}</dd></div>
            <div><dt>Completados</dt><dd>{queue.data.counts.done}</dd></div>
            <div><dt>Otros estados</dt><dd>{queue.data.counts.other}</dd></div>
          </dl>
        </> : null}
      </section>
    </div>

    <nav className="admin-overview__tools" aria-label="Herramientas administrativas actuales">
      <h2>Herramientas</h2>
      <ul>{toolLinks.map(([href, label]) => <li key={href}><a href={href}>{label}<span aria-hidden="true">→</span></a></li>)}</ul>
    </nav>
  </main>;
}

function diagnosticError(reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER"): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar diagnósticos.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar diagnósticos.";
  return "No pudimos cargar los diagnósticos. Verifica el acceso e inténtalo de nuevo.";
}

function queueError(reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER"): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar la cola.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar la cola.";
  return "No se pudo cargar el estado de la cola. Verifica el acceso e inténtalo de nuevo.";
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
