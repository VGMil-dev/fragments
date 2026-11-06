import type { ReactNode } from "react";
import "./async-state.css";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; retry: () => void }
  | { status: "success"; data: T };

export interface AsyncStateViewProps<T> {
  state: AsyncState<T>;
  render: (data: T) => ReactNode;
  emptyAction?: ReactNode;
  retryLabel?: string;
}

export function AsyncStateView<T>({ state, render, emptyAction, retryLabel = "Intentar de nuevo" }: AsyncStateViewProps<T>) {
  switch (state.status) {
    case "loading":
      return (
        <section className="async-state" role="status" aria-live="polite" aria-busy="true">
          <p className="async-state__title">Cargando información…</p>
          <p className="async-state__copy">Estamos consultando el servicio. Puedes esperar aquí.</p>
        </section>
      );
    case "empty":
      return (
        <section className="async-state" aria-labelledby="async-state-empty-title">
          <h2 className="async-state__title" id="async-state-empty-title">Todavía no hay contenido para mostrar</h2>
          <p className="async-state__copy">Cuando haya información disponible aparecerá aquí. Puedes continuar con el siguiente paso.</p>
          {emptyAction ? <div className="async-state__action">{emptyAction}</div> : null}
        </section>
      );
    case "error":
      return (
        <section className="async-state async-state--error" role="alert" aria-labelledby="async-state-error-title">
          <h2 className="async-state__title" id="async-state-error-title">No pudimos cargar esta información</h2>
          <p className="async-state__copy">Tu trabajo sigue aquí. Revisa la conexión e inténtalo de nuevo.</p>
          <button className="button button--primary" type="button" onClick={state.retry}>{retryLabel}</button>
        </section>
      );
    case "success":
      return <>{render(state.data)}</>;
  }
}
