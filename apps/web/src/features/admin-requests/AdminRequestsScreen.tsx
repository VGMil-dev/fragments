import { useEffect, useState } from "react";
import type { AdminEnrollmentRequest, AdminRequestsApi, EnrollmentStatus } from "./admin-requests-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-requests.css";

const pageSize = 20;
type State = { status: "loading" } | { status: "ready"; items: AdminEnrollmentRequest[]; total: number } | { status: "error" };

export function AdminRequestsScreen({ api }: { api: AdminRequestsApi }) {
  const [filter, setFilter] = useState<EnrollmentStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.list({ limit: pageSize, offset, status: filter }).then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", items: result.data.items, total: result.data.total } : { status: "error" });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [api, filter, offset, reload]);

  const start = state.status === "ready" && state.total > 0 ? offset + 1 : 0;
  const end = state.status === "ready" ? Math.min(offset + state.items.length, state.total) : 0;
  const busy = state.status === "loading";
  return <main className="admin-requests" aria-labelledby="admin-requests-title" aria-busy={state.status === "loading"}>
    <header className="admin-requests__header">
      <p className="admin-requests__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-requests-title">Solicitudes académicas</h1>
      <p>Consulta matrículas y solicitudes de ingreso registradas. Esta vista no permite aprobar ni modificar estados.</p>
      <AdminConsoleNavigation current="requests" />
    </header>
    <section className="admin-requests__controls" aria-label="Filtros y actualización">
      <label htmlFor="admin-request-status">Estado</label>
      <select id="admin-request-status" value={filter ?? "all"} onChange={(event) => { setFilter(event.target.value === "all" ? null : event.target.value as EnrollmentStatus); setOffset(0); }}>
        <option value="all">Todos</option><option value="pending">Pendiente</option><option value="active">Activa</option><option value="rejected">Rechazada</option><option value="removed">Retirada</option>
      </select>
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy}>{state.status === "error" ? "Reintentar" : busy ? "Actualizando…" : "Actualizar"}</button>
    </section>
    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando solicitudes académicas…</p> : null}
    {state.status === "error" ? <p role="alert">No pudimos cargar las solicitudes académicas. Verifica el acceso e inténtalo de nuevo.</p> : null}
    {state.status === "ready" && state.items.length === 0 ? <p role="status">No hay registros para este estado.</p> : null}
    {state.status === "ready" && state.items.length > 0 ? <>
      <div className="admin-requests__table-wrap" role="region" aria-label="Matrículas y solicitudes" tabIndex={0}>
        <table>
          <caption>Registros actuales · datos de aula y estado, sin identidad del estudiante</caption>
          <thead><tr><th scope="col">Aula</th><th scope="col">Área</th><th scope="col">Período</th><th scope="col">Estado</th><th scope="col">Origen</th><th scope="col">Solicitada</th><th scope="col">Decidida</th></tr></thead>
          <tbody>{state.items.map((item) => <tr key={item.requestId}>
            <td>{item.classroomTitle}</td><td>{item.subject}</td><td>{item.period ?? "—"}</td><td>{statusLabel(item.status)}</td><td>{item.source === "join_code" ? "Código de aula" : "Asignación docente"}</td><td><time dateTime={item.requestedAt}>{formatUtc(item.requestedAt)}</time></td><td>{item.decidedAt ? <time dateTime={item.decidedAt}>{formatUtc(item.decidedAt)}</time> : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <nav className="admin-requests__pagination" aria-label="Paginación de solicitudes">
        <span aria-live="polite">Mostrando {start}–{end} de {state.total}</span>
        <div><button type="button" onClick={() => setOffset((value) => Math.max(0, value - pageSize))} disabled={offset === 0 || busy}>Anterior</button>
          <button type="button" onClick={() => setOffset((value) => value + pageSize)} disabled={busy || offset + state.items.length >= state.total}>Siguiente</button></div>
      </nav>
    </> : null}
  </main>;
}

function statusLabel(status: EnrollmentStatus): string {
  const labels: Record<EnrollmentStatus, string> = { pending: "Pendiente", active: "Activa", rejected: "Rechazada", removed: "Retirada" };
  return labels[status];
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
