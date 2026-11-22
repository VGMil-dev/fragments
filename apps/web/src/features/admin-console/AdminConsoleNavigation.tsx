import "./admin-console.css";

export function AdminConsoleNavigation({ current }: { current: "diagnostics" | "requests" | "queue" }) {
  return <nav className="admin-console-nav" aria-label="Herramientas de administración">
    <a href="/admin/diagnostics" aria-current={current === "diagnostics" ? "page" : undefined}>Diagnósticos</a>
    <a href="/admin/requests" aria-current={current === "requests" ? "page" : undefined}>Solicitudes académicas</a>
    <a href="/admin/queue" aria-current={current === "queue" ? "page" : undefined}>Cola de trabajos</a>
  </nav>;
}
