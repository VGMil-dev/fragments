import "./admin-console.css";

export function AdminConsoleNavigation({ current }: { current: "diagnostics" | "requests" | "queue" | "audit-log" | "review-events" | "teachers" }) {
  return <nav className="admin-console-nav" aria-label="Herramientas de administración">
    <a href="/admin/diagnostics" aria-current={current === "diagnostics" ? "page" : undefined}>Diagnósticos</a>
    <a href="/admin/requests" aria-current={current === "requests" ? "page" : undefined}>Solicitudes académicas</a>
    <a href="/admin/queue" aria-current={current === "queue" ? "page" : undefined}>Cola de trabajos</a>
    <a href="/admin/audit-log" aria-current={current === "audit-log" ? "page" : undefined}>Registro de actividad</a>
    <a href="/admin/review-events" aria-current={current === "review-events" ? "page" : undefined}>Eventos de Review</a>
    <a href="/admin/teachers" aria-current={current === "teachers" ? "page" : undefined}>Cuentas docentes</a>
  </nav>;
}
