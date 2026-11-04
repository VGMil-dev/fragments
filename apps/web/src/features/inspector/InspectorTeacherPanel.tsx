import { useState, type FormEvent } from "react";
import type { InspectorChallenge } from "../../../../../packages/contracts/src/index.js";
import "./inspector-teacher-panel.css";

type InspectorStatus = "pending" | "assigned" | "completed" | "obsolete";

type InspectorTeacherPanelProps = {
  challenge: InspectorChallenge | null;
  status: InspectorStatus;
  onAssign: () => void | Promise<void>;
  onRecord: (form: FormData) => void | Promise<void>;
  message?: string;
};

const statusLabels: Record<InspectorStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  completed: "Realizado",
  obsolete: "Obsoleto",
};

export function InspectorTeacherPanel({ challenge, status, onAssign, onRecord, message }: InspectorTeacherPanelProps) {
  const [busy, setBusy] = useState(false);

  async function handleAssign() {
    setBusy(true);
    try { await onAssign(); } finally { setBusy(false); }
  }

  async function handleRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { await onRecord(new FormData(event.currentTarget)); } finally { setBusy(false); }
  }

  if (!challenge) {
    return (
      <section className="inspector-panel inspector-panel--empty" aria-labelledby="inspector-title">
        <p className="inspector-panel__eyebrow">INSPECTOR · DOCENTE</p>
        <h2 id="inspector-title">Reto de revisión</h2>
        <p>Selecciona una revisión reciente para preparar una conversación sobre una decisión real del proyecto.</p>
        {message && <p role="status">{message}</p>}
      </section>
    );
  }

  const evidence = challenge.sourceEvidence.map((source) => source.source === "repository"
    ? `${source.path}, líneas ${source.lines[0]}–${source.lines[1]}`
    : `Propuesta: ${source.field}`);

  return (
    <section className="inspector-panel" aria-labelledby="inspector-title">
      <header className="inspector-panel__header">
        <div>
          <p className="inspector-panel__eyebrow">INSPECTOR · SOLO DOCENTE</p>
          <h2 id="inspector-title">Reto de revisión</h2>
        </div>
        <span className={`inspector-panel__status inspector-panel__status--${status}`}>
          {statusLabels[status]}
        </span>
      </header>

      <div className="inspector-panel__evidence">
        <span>Evidencia del commit revisado</span>
        <ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>

      <dl className="inspector-panel__steps">
        <div><dt>Precondición</dt><dd>{challenge.precondition}</dd></div>
        <div><dt>Mutación inversa</dt><dd>{challenge.mutation}</dd></div>
        <div><dt>Demostración</dt><dd>{challenge.demonstration}</dd></div>
        <div><dt>Restauración</dt><dd>{challenge.restoration}</dd></div>
      </dl>

      <aside className="inspector-panel__private" aria-label="Ayuda privada para docente">
        <span>Ayuda privada para docente</span>
        <p>{challenge.teacherHint}</p>
      </aside>

      {status === "assigned" && (
        <form className="inspector-panel__record" onSubmit={handleRecord}>
          <h3>Registrar la defensa</h3>
          <label><input name="mutationObserved" type="checkbox" value="true" /> La mutación se explicó</label>
          <label><input name="restorationConfirmed" type="checkbox" value="true" /> La restauración quedó confirmada</label>
          <label className="inspector-panel__notes">Notas docentes<textarea name="notes" maxLength={2000} rows={3} /></label>
          <button className="inspector-panel__button" disabled={busy} type="submit">Guardar resultado</button>
        </form>
      )}

      {status === "pending" && (
        <button className="inspector-panel__button" disabled={busy} onClick={handleAssign} type="button">
          Asignar reto
        </button>
      )}
      {message && <p className="inspector-panel__message" role="status">{message}</p>}
    </section>
  );
}
