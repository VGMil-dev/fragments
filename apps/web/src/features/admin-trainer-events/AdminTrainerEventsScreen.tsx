import { useEffect, useState } from "react";
import type { AdminTrainerEventsApi, TrainerOperationalEvent } from "./admin-trainer-events-types.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-trainer-events.css";

type ErrorReason = "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER";
type ScreenState = { status: "loading" } | { status: "ready"; events: TrainerOperationalEvent[] } | { status: "error"; reason: ErrorReason };

function safeReason(code: string): ErrorReason {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

export function AdminTrainerEventsScreen({ api }: { api: AdminTrainerEventsApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [stageFilter, setStageFilter] = useState<TrainerOperationalEvent["stage"] | "all">("all");
  const [resultFilter, setResultFilter] = useState<TrainerOperationalEvent["result"] | "all">("all");
  const busy = state.status === "loading";
  const events = state.status === "ready" ? state.events.filter((event) =>
    (stageFilter === "all" || event.stage === stageFilter) && (resultFilter === "all" || event.result === resultFilter)) : [];

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (active) setState(result.ok ? { status: "ready", events: result.data.events } : { status: "error", reason: safeReason(result.error.code) });
    }).catch(() => {
      if (active) setState({ status: "error", reason: "OTHER" });
    });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-trainer-events" aria-labelledby="admin-trainer-events-title" aria-busy={busy}>
    <header className="admin-trainer-events__header">
      <p className="admin-trainer-events__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-trainer-events-title">Eventos operativos de Trainer</h1>
      <AdminConsoleNavigation current="trainer-events" />
      <p>Consulta los resultados técnicos del registro de intentos. La vista solo representa campos operativos redactados.</p>
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy}>
        {busy ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}
      </button>
    </header>

    {state.status === "loading" ? <p role="status" aria-live="polite">Cargando eventos de Trainer…</p> : null}
    {state.status === "error" ? <p role="alert">{errorMessage(state.reason)}</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">Todavía no hay eventos de Trainer disponibles en la muestra actual.</p> : null}

    {state.status === "ready" && state.events.length > 0 ? <div className="admin-trainer-events__filters" aria-label="Filtros locales de eventos de Trainer">
      <label htmlFor="trainer-event-stage">Etapa
        <select id="trainer-event-stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as TrainerOperationalEvent["stage"] | "all")}>
          <option value="all">Todas</option>
          <option value="attempt_record">Registro del intento</option>
        </select>
      </label>
      <label htmlFor="trainer-event-result">Resultado
        <select id="trainer-event-result" value={resultFilter} onChange={(event) => setResultFilter(event.target.value as TrainerOperationalEvent["result"] | "all")}>
          <option value="all">Todos</option>
          <option value="success">Correcto</option>
          <option value="failure">Fallido</option>
        </select>
      </label>
      <span role="status" aria-live="polite">{events.length === 0 ? "No hay eventos para esta combinación de filtros." : `Mostrando ${events.length} de ${state.events.length} eventos`}</span>
    </div> : null}

    {state.status === "ready" && events.length > 0 ? <div className="admin-trainer-events__table-wrap" role="region" aria-label="Lista de eventos operativos de Trainer" tabIndex={0}>
      <table>
        <caption>Eventos operativos redactados · hora UTC</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Etapa</th><th scope="col">Evento</th><th scope="col">Resultado</th><th scope="col">Duración</th></tr></thead>
        <tbody>{events.map((event, index) => <tr key={`${event.occurredAt}-${event.event}-${index}`}>
          <td><time dateTime={event.occurredAt}>{formatUtc(event.occurredAt)}</time></td>
          <td>Registro del intento</td>
          <td>{event.event === "trainer.attempt.finished" ? "Intento registrado" : "Falló el registro"}</td>
          <td>{event.result === "success" ? "Correcto" : "Fallido"}{event.error_code !== "none" ? <small>Código: <code>{event.error_code}</code></small> : null}</td>
          <td>{event.duration_ms} ms</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function errorMessage(reason: ErrorReason): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar estos eventos.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar los eventos de Trainer.";
  return "No se pudieron cargar los eventos de Trainer. Verifica el acceso e inténtalo de nuevo.";
}

function formatUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(date);
}
