import "./admin-console.css";

export function AdminConsoleNavigation({ current }: { current: "diagnostics" | "requests" }) {
  return <nav className="admin-console-nav" aria-label="Herramientas de administración">
    <a href="/admin/diagnostics" aria-current={current === "diagnostics" ? "page" : undefined}>Diagnósticos</a>
    <a href="/admin/requests" aria-current={current === "requests" ? "page" : undefined}>Solicitudes académicas</a>
  </nav>;
}
