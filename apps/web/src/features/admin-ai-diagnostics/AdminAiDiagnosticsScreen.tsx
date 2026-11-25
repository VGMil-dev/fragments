import { useEffect, useState } from "react";
import type { AdminAiDiagnostics, AdminAiDiagnosticsApi } from "./admin-ai-diagnostics-api.js";
import { AdminConsoleNavigation } from "../admin-console/AdminConsoleNavigation.js";
import "./admin-ai-diagnostics.css";

type State = { status: "loading" } | { status: "ready"; data: AdminAiDiagnostics } | { status: "error"; code: string };
export function AdminAiDiagnosticsScreen({ api }: { api: AdminAiDiagnosticsApi }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void api.read().then((result) => { if (active) setState(result.ok ? { status: "ready", data: result.data } : { status: "error", code: result.error.code }); });
    return () => { active = false; };
  }, [api, reload]);
  const adminAccessDenied = state.status === "error" && (state.code === "AUTH_REQUIRED" || state.code === "FORBIDDEN");
  return <main className="admin-ai-diagnostics" aria-labelledby="admin-ai-diagnostics-title" aria-busy={state.status === "loading"}>
    <header><p className="admin-ai-diagnostics__eyebrow">FRAGMENTS · ADMINISTRACIÓN</p><h1 id="admin-ai-diagnostics-title">Configuración y presupuesto IA</h1><p>Lectura de configuración efectiva y costos agregados registrados. Esta vista no ejecuta evaluaciones.</p><AdminConsoleNavigation current="ai-diagnostics" accessDenied={adminAccessDenied} /><button type="button" onClick={() => setReload((value) => value + 1)} disabled={state.status === "loading"}>{state.status === "loading" ? "Cargando…" : "Actualizar"}</button></header>
    {state.status === "loading" ? <p role="status">Cargando diagnóstico IA…</p> : null}
    {state.status === "error" ? <section role="alert"><p>{state.code === "AUTH_REQUIRED" ? "Inicia sesión con una cuenta administradora." : state.code === "FORBIDDEN" ? "Esta cuenta no tiene permisos de administración." : "No se pudo consultar el diagnóstico; los importes no se muestran como cero."}</p><button type="button" onClick={() => setReload((value) => value + 1)}>Reintentar</button></section> : null}
    {state.status === "ready" ? <>
      <section aria-labelledby="admin-ai-config-title"><h2 id="admin-ai-config-title">Configuración no secreta</h2><dl><div><dt>Clave de gateway</dt><dd>{state.data.configuration.apiKeyConfigured ? "Configurada; valor oculto" : "No configurada"}</dd></div><div><dt>Modelo</dt><dd>{state.data.configuration.model ?? "Sin especificar"}</dd></div><div><dt>Proveedor permitido</dt><dd>{state.data.configuration.providerOnly ?? "Sin restricción configurada"}</dd></div><div><dt>Tarifas configuradas</dt><dd>{state.data.configuration.inputUsdPerMillion !== null && state.data.configuration.outputUsdPerMillion !== null ? `Entrada $${state.data.configuration.inputUsdPerMillion} / salida $${state.data.configuration.outputUsdPerMillion} USD por millón de tokens` : "No disponibles"}</dd></div></dl></section>
      <section aria-labelledby="admin-ai-ledger-title"><h2 id="admin-ai-ledger-title">Ledger registrado</h2><dl><div><dt>Liquidado</dt><dd>{usd(state.data.ledger.settledMicroUsd)}</dd></div><div><dt>Reservado</dt><dd>{usd(state.data.ledger.reservedMicroUsd)}</dd></div><div><dt>Incierto</dt><dd>{usd(state.data.ledger.uncertainMicroUsd)}</dd></div></dl></section>
      <section aria-labelledby="admin-ai-budget-title"><h2 id="admin-ai-budget-title">Disponibilidad de presupuesto</h2><p>Saldo de cuenta del proveedor: <strong>Desconocido</strong>. No se consulta una API de facturación externa.</p><p>Tope global de gasto: <strong>Desconocido</strong>. El ledger no define un límite total.</p><p>Los costos liquidados no equivalen al saldo restante. No se inició ninguna llamada de IA.</p></section>
    </> : null}
  </main>;
}
function usd(microUsd: number): string { return new Intl.NumberFormat("es", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(microUsd / 1_000_000); }
