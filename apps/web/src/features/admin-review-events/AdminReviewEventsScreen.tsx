import { useEffect, useState } from "react";
import type { AdminReviewEventsApi, ReviewOperationalEvent } from "./admin-review-events-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-review-events.css";

type State = { status: "loading" } | { status: "ready"; events: ReviewOperationalEvent[] } | { status: "error"; reason: "AUTH_REQUIRED" | "FORBIDDEN" | "OTHER" };

function safeReason(code: string): Extract<State, { status: "error" }>['reason'] {
  if (code === "AUTH_REQUIRED" || code === "FORBIDDEN") return code;
  return "OTHER";
}

export function AdminReviewEventsScreen({ api }: { api: AdminReviewEventsApi }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const busy = state.status === "loading";

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => {
      if (active) setState(result.ok ? { status: "ready", events: result.data.events } : { status: "error", reason: safeReason(result.error.code) });
    }).catch(() => { if (active) setState({ status: "error", reason: "OTHER" }); });
    return () => { active = false; };
  }, [api, reload]);

  return <main className="admin-review-events" aria-labelledby="admin-review-events-title" aria-busy={busy}>
    <header className="admin-review-events__header">
      <p className="admin-review-events__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p>
      <h1 id="admin-review-events-title">Eventos operativos de Review</h1>
      <p>Intentos del worker y etapas de Review con resultado, duración y correlación. No se muestran prompts, código de repositorios ni datos personales.</p>
      <AdminConsoleNavigation current="review-events" />
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy}>{busy ? "Actualizando…" : state.status === "error" ? "Reintentar" : "Actualizar"}</button>
    </header>
    <p className="admin-review-events__retention">El buffer guarda como máximo 100 eventos desde el último inicio de API; la vista devuelve hasta 50 y se pierde al reiniciar el proceso.</p>
    {busy ? <p role="status" aria-live="polite">Cargando eventos de Review…</p> : null}
    {state.status === "error" ? <p role="alert">{errorMessage(state.reason)}</p> : null}
    {state.status === "ready" && state.events.length === 0 ? <p role="status">Todavía no hay eventos de Review en este proceso de API.</p> : null}
    {state.status === "ready" && state.events.length > 0 ? <div className="admin-review-events__table-wrap" role="region" aria-label="Eventos recientes de Review" tabIndex={0}>
      <table>
        <caption>Eventos redactados · hora UTC · máximo 50</caption>
        <thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Etapa</th><th scope="col">Resultado</th><th scope="col">Intento y duración</th><th scope="col">Diagnóstico de proveedor</th><th scope="col">Correlación</th></tr></thead>
        <tbody>{state.events.map((event, index) => <tr key={`${event.jobId ?? event.reviewId ?? "poll"}-${event.event}-${index}`}>
          <td><time dateTime={eventTime(event)}>{formatUtc(eventTime(event))}</time></td>
          <td>{stageLabel(event.stage)}</td>
          <td>{statusLabel(event.finalStatus)}{event.errorCode ? <small>{event.errorCode}</small> : null}</td>
          <td>{event.attempt} · {event.durationMs} ms</td>
          <td>{gatewayLabel(event)}</td>
          <td><code>{event.jobId ?? event.reviewId ?? "—"}</code></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </main>;
}

function errorMessage(reason: Extract<State, { status: "error" }>['reason']): string {
  if (reason === "AUTH_REQUIRED") return "Inicia sesión con una cuenta administradora para consultar estos eventos.";
  if (reason === "FORBIDDEN") return "Esta cuenta no tiene permisos de administración para consultar los eventos de Review.";
  return "No se pudieron cargar los eventos de Review. Verifica el acceso e inténtalo de nuevo.";
}

function eventTime(event: ReviewOperationalEvent): string {
  return event.occurredAt;
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function stageLabel(stage: ReviewOperationalEvent["stage"]): string {
  const labels: Record<ReviewOperationalEvent["stage"], string> = {
    repository: "Repositorio", snapshot_validation: "Validar snapshot", packing: "Preparar archivos", ai_dispatch: "Evaluación IA",
    analysis_validation: "Validar respuesta", result_persistence: "Guardar resultado", queue_claim: "Tomar trabajo",
    queue_completion: "Cerrar trabajo", lease_heartbeat: "Renovar reserva", queue_poll: "Consultar cola",
  };
  return labels[stage];
}

function statusLabel(status: ReviewOperationalEvent["finalStatus"]): string {
  const labels: Record<ReviewOperationalEvent["finalStatus"], string> = {
    completed: "Completado", failed: "Fallido", retry_wait: "Esperando reintento", lease_lost: "Reserva vencida", degraded: "Degradado",
  };
  return labels[status];
}

function gatewayLabel(event: ReviewOperationalEvent): string {
  const failure = event.gatewayFailure;
  if (!failure) return event.errorCode ?? "Sin error";
  const statuses = [failure.gatewayHttpStatus, failure.providerHttpStatus].filter((value) => value !== null).join(" / ");
  return [event.errorCode, statuses ? `HTTP ${statuses}` : "", failure.retryAfterMs !== null ? `Reintento ${failure.retryAfterMs} ms` : ""].filter(Boolean).join(" · ") || "Sin detalle";
}
