import { useEffect, useState } from "react";
import type { AdminTeachersApi, AdminTeacherPage } from "./admin-teachers-api.js";
import "./admin-teachers.css";

type State = { status: "loading" } | { status: "ready"; page: AdminTeacherPage } | { status: "error" };
const pageSize = 20;

export function AdminTeachersPanel({ api }: { api: AdminTeachersApi }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [reload, setReload] = useState(0);
  const cursor = cursorHistory[pageIndex];

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.list({ limit: pageSize, ...(cursor ? { cursor } : {}) }).then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", page: result.data } : { status: "error" });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [api, cursor, reload]);

  function resetAndReload() {
    setCursorHistory([undefined]);
    setPageIndex(0);
    setReload((value) => value + 1);
  }

  function nextPage(nextCursor: string) {
    const nextHistory = [...cursorHistory.slice(0, pageIndex + 1), nextCursor];
    setCursorHistory(nextHistory);
    setPageIndex(pageIndex + 1);
  }

  return <section className="admin-teachers" aria-labelledby="admin-teachers-title" aria-busy={state.status === "loading"}>
    <header className="admin-teachers__header">
      <p className="admin-teachers__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-teachers-title">Cuentas docentes</h1>
      <p>Directorio de cuentas con rol docente. Esta vista es de solo lectura y no muestra sesiones ni credenciales.</p>
      <button type="button" onClick={resetAndReload} disabled={state.status === "loading"}>
        {state.status === "loading" ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}
      </button>
    </header>
    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando cuentas docentes…</p> : null}
    {state.status === "error" ? <p role="alert">No se pudieron cargar las cuentas docentes. Verifica el acceso e inténtalo de nuevo.</p> : null}
    {state.status === "ready" ? <>
      {state.page.items.length === 0 ? <p role="status">No hay cuentas docentes para mostrar.</p> : <div className="admin-teachers__table-wrap" role="region" aria-label="Directorio de cuentas docentes" tabIndex={0}>
        <table>
          <caption>Cuentas docentes · fechas en UTC</caption>
          <thead><tr><th scope="col">ID de cuenta</th><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Creada (UTC)</th></tr></thead>
          <tbody>{state.page.items.map((teacher) => <tr key={teacher.accountId}>
            <td><code>{teacher.accountId}</code></td><td>{teacher.displayName}</td><td>{teacher.email}</td><td><time dateTime={teacher.createdAt}>{formatUtc(teacher.createdAt)}</time></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav className="admin-teachers__pagination" aria-label="Páginas del directorio">
        <button type="button" aria-label="Página anterior" onClick={() => setPageIndex((value) => Math.max(0, value - 1))} disabled={pageIndex === 0}>Anterior</button>
        <span>Página {pageIndex + 1}</span>
        <button type="button" aria-label="Siguiente página" onClick={() => state.page.nextCursor && nextPage(state.page.nextCursor)} disabled={!state.page.nextCursor}>Siguiente</button>
      </nav>
    </> : null}
  </section>;
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
