import { useEffect, useState } from "react";
import type { AdminMentorEventsApi, MentorOperationalEvent } from "./admin-mentor-events-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-mentor-events.css";

type State = { status: "loading" } | { status: "ready"; events: MentorOperationalEvent[] } | { status: "error"; reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER" };

function safeReason(code: string): Extract<State, { status: "error" }>["reason"] {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

export function AdminMentorEventsScreen({ api }: { api: AdminMentorEventsApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [stageFilter, setStageFilter] = useState<MentorOperationalEvent["stage"] | "all">("all");
  const [resultFilter, setResultFilter] = useState<MentorOperationalEvent["result"] | "all">("all");
  const busy = state.status === "loading";
  const filteredEvents = state.status === "ready" ? state.events.filter((event) =>
    (stageFilter === "all" || event.stage === stageFilter) && (resultFilter === "all" || event.result === resultFilter)) : [];

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (active) setState(result.ok ? { status: "ready", events: result.data.events } : { status: "error", reason: safeReason(result.error.code) });
    }).catch(() => { if (active) setState({ status: "error", reason: "OTHER" }); });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-mentor-events" aria-labelledby="admin-mentor-events-title" aria-busy={busy}>
    <header className="admin-mentor-events__header">
      <p className="admin-mentor-events__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-mentor-events-title">Eventos operativos de Mentor</h1>
      <p>Evaluaciones de Mentor recientes con etapa, resultado, duración y hora UTC. No se muestran propuestas, prompts, puntuaciones ni datos personales.</p>
      <AdminConsoleNavigation current="mentor-events" />
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy}>{busy ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}</button>
    </header>
    <p className="admin-mentor-events__retention">La API conserva hasta 100 eventos desde el inicio del proceso; esta vista devuelve como máximo 50. El buffer se pierde al reiniciar la API.</p>
    {state.status === "ready" && state.events.length > 0 ? <div className="admin-mentor-events__filters" aria-label="Filtros de eventos de Mentor">
      <label htmlFor="mentor-stage-filter">Etapa
        <select id="mentor-stage-filter" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as MentorOperationalEvent["stage"] | "all")}>
          <option value="all">Todas</option><option value="configuration">Configuración</option><option value="input_validation">Validar entrada</option><option value="budget_reservation">Reservar presupuesto</option><option value="budget_settlement">Liquidar presupuesto</option><option value="provider_request">Solicitud al proveedor</option><option value="provider_response">Respuesta del proveedor</option><option value="response_validation">Validar respuesta</option><option value="evaluation">Evaluación</option>
        </select>
      </label>
      <label htmlFor="mentor-result-filter">Resultado
        <select id="mentor-result-filter" value={resultFilter} onChange={(event) => setResultFilter(event.target.value as MentorOperationalEvent["result"] | "all")}>
          <option value="all">Todos</option><option value="success">Completada</option><option value="failure">Fallida</option>
        </select>
      </label>
      <span role="status" aria-live="polite">{filteredEvents.length === 0 ? "No hay eventos para esta combinación de filtros en la muestra actual." : `Mostrando ${filteredEvents.length} de ${state.events.length} eventos`}</span>
    </div> : null}
    {busy ? <p role="status" aria-live="polite">Cargando eventos de Mentor…</p> : null}
    {state.status === "error" ? <p role="alert">{errorMessage(state.reason)}</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">Todavía no hay evaluaciones de Mentor en este proceso de API.</p> : null}
    {state.status === "ready" && filteredEvents.length > 0 ? <div className="admin-mentor-events__table-wrap" role="region" aria-label="Eventos recientes de Mentor" tabIndex={0}>
      <table>
        <caption>Eventos redactados · hora UTC · máximo 50</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Etapa</th><th scope="col">Resultado</th><th scope="col">Duración</th></tr></thead>
        <tbody>{filteredEvents.map((event, index) => <tr key={`${event.occurred_at}-${event.event}-${index}`}>
          <td><time dateTime={event.occurred_at}>{formatUtc(event.occurred_at)}</time></td>
          <td>{stageLabel(event.stage)}</td>
          <td>{event.result === "success" ? "Completada" : "Fallida"}{event.error_code !== "none" ? <small>{event.error_code}</small> : null}</td>
          <td>{event.duration_ms} ms</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function errorMessage(reason: Extract<State, { status: "error" }>["reason"]): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar estos eventos.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar los eventos de Mentor.";
  return "No se pudieron cargar los eventos de Mentor. Verifica el acceso e inténtalo de nuevo.";
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function stageLabel(stage: MentorOperationalEvent["stage"]): string {
  const labels: Record<MentorOperationalEvent["stage"], string> = {
    configuration: "Configuración", input_validation: "Validar entrada", budget_reservation: "Reservar presupuesto",
    budget_settlement: "Liquidar presupuesto", provider_request: "Solicitud al proveedor", provider_response: "Respuesta del proveedor",
    response_validation: "Validar respuesta", evaluation: "Evaluación",
  };
  return labels[stage];
}
