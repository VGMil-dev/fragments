import { useEffect, useState } from "react";
import type { AdminAuditEvent, AdminAuditLogApi } from "./admin-audit-log-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-audit-log.css";

type State = { status: "loading" } | { status: "ready"; events: AdminAuditEvent[] } | { status: "error"; reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER" };

function safeErrorReason(code: string): Extract<State, { status: "error" }>["reason"] {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

export function AdminAuditLogScreen({ api }: { api: AdminAuditLogApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [eventFilter, setEventFilter] = useState<AdminAuditEvent["event"] | "all">("all");
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", events: result.data.events } : { status: "error", reason: safeErrorReason(result.error.code) });
    }).catch(() => { if (active) setState({ status: "error", reason: "OTHER" }); });
    return () => { active = false; };
  }, [api, reload]);

  const busy = state.status === "loading";
  const filteredEvents = state.status === "ready" && eventFilter !== "all"
    ? state.events.filter((event) => event.event === eventFilter)
    : state.status === "ready" ? state.events : [];
  return <main className="admin-audit-log" aria-labelledby="admin-audit-log-title" aria-busy={busy}>
    <header className="admin-audit-log__header">
      <p className="admin-audit-log__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-audit-log-title">Registro de actividad administrativa</h1>
      <p>Consultas administrativas recientes con hora y correlación de solicitud. No se muestran identidades ni contenido privado.</p>
      <AdminConsoleNavigation current="audit-log" />
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy}>{busy ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}</button>
    </header>
    <p className="admin-audit-log__retention">La muestra conserva hasta 50 eventos desde el último inicio del API; se pierde al reiniciar el proceso.</p>
    <div className="admin-audit-log__filter">
      <label htmlFor="admin-audit-log-event-filter">Filtrar por tipo de evento</label>
      <select id="admin-audit-log-event-filter" value={eventFilter} onChange={(event) => setEventFilter(event.target.value as AdminAuditEvent["event"] | "all")}>
        <option value="all">Todos los eventos</option>
        <option value="admin.classroom_requests.read">Solicitudes académicas consultadas</option>
        <option value="admin.queue_summary.read">Cola de trabajos consultada</option>
        <option value="admin.audit_log.read">Registro de actividad consultado</option>
        <option value="admin.teachers.list">Cuentas docentes consultadas</option>
        <option value="admin.review_events.read">Eventos operativos de Review consultados</option>
        <option value="admin.mentor_events.read">Eventos operativos de Mentor consultados</option>
      </select>
    </div>
    {busy ? <p role="status" aria-live="polite">Cargando registro de actividad…</p> : null}
    {state.status === "error" ? <p role="alert">{errorMessage(state.reason)}</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">No hay eventos administrativos disponibles.</p> : null}
    {state.status === "ready" && state.events.length > 0 && filteredEvents.length === 0 ? <p role="status">No hay eventos para este tipo de evento en la muestra actual.</p> : null}
    {state.status === "ready" && filteredEvents.length > 0 ? <div className="admin-audit-log__table-wrap" role="region" aria-label="Actividad administrativa reciente" tabIndex={0}>
      <table>
        <caption>Eventos redactados · hora UTC · máximo 50</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Evento</th><th scope="col">Actor</th><th scope="col">ID de solicitud</th></tr></thead>
        <tbody>{filteredEvents.map((event) => <tr key={event.requestId}>
          <td><time dateTime={event.occurredAt}>{formatUtc(event.occurredAt)}</time></td><td>{eventLabel(event.event)}</td><td>Administración</td><td><code>{event.requestId}</code></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function errorMessage(reason: Extract<State, { status: "error" }>["reason"]): string {
  if (reason === "AUTH_REQUIRED") return "No hay una sesión válida para esta vista. Inicia sesión con una cuenta que tenga el rol de administración.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene el rol de administración necesario para consultar el feed. Solicita acceso admin o vuelve a entrar con una cuenta administradora.";
  return "No se pudo cargar el registro de actividad. Verifica el acceso e inténtalo de nuevo.";
}

function eventLabel(event: AdminAuditEvent["event"]): string {
  const labels: Record<AdminAuditEvent["event"], string> = {
    "admin.classroom_requests.read": "Solicitudes académicas consultadas",
    "admin.queue_summary.read": "Cola de trabajos consultada",
    "admin.audit_log.read": "Registro de actividad consultado",
    "admin.teachers.list": "Cuentas docentes consultadas",
    "admin.review_events.read": "Eventos operativos de Review consultados",
    "admin.mentor_events.read": "Eventos operativos de Mentor consultados",
  };
  return labels[event];
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
