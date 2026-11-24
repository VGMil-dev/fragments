import { useState, type FormEvent } from "react";
import type { InspectorChallengeRecordResponse } from "@fragments/contracts";
import "./inspector-teacher-panel.css";

type InspectorStatus = "pending" | "assigned" | "completed" | "obsolete";

type InspectorTeacherPanelProps = {
  record: InspectorChallengeRecordResponse | null;
  teacherAuthorized?: boolean;
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

export function InspectorTeacherPanel({ record, teacherAuthorized = false, onAssign, onRecord, message }: InspectorTeacherPanelProps) {
  const [busy, setBusy] = useState(false);
  const challenge = record?.challenge ?? null;
  const status: InspectorStatus = record?.status ?? "pending";

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
        <p className="inspector-panel__eyebrow">DEFENSA POR COMPETENCIAS · INSPECTOR</p>
        <h2 id="inspector-title">Sala de defensa</h2>
        <p>Carga una revisión para consultar evidencia y preparar una defensa.</p>
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
          <h2 id="inspector-title">Sala de defensa</h2>
        </div>
        <span className={`inspector-panel__status inspector-panel__status--${status}`}>
          {statusLabels[status]}
        </span>
      </header>

      {record ? <dl className="inspector-panel__review" aria-label="Revisión y commit">
        <div><dt>Revisión</dt><dd><code>{record.reviewId}</code></dd></div>
        <div><dt>Proyecto</dt><dd><code>{record.projectId}</code></dd></div>
        <div><dt>Commit revisado</dt><dd><code>{record.commitSha}</code></dd></div>
      </dl> : null}

      <div className="inspector-panel__evidence">
        <span>Evidencia de la revisión</span>
        <ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>

      <p className="inspector-panel__duration">Tiempo estimado del reto: <strong>{challenge.estimatedMinutes} min</strong></p>

      <dl className="inspector-panel__steps">
        <div><dt>Precondición</dt><dd>{challenge.precondition}</dd></div>
        <div><dt>Mutación inversa</dt><dd>{challenge.mutation}</dd></div>
        <div><dt>Demostración</dt><dd>{challenge.demonstration}</dd></div>
        <div><dt>Restauración</dt><dd>{challenge.restoration}</dd></div>
      </dl>

      {teacherAuthorized ? <aside className="inspector-panel__private" aria-label="Orientación privada para el docente">
        <span>Orientación privada para el docente</span>
        <p>{challenge.teacherHint}</p>
      </aside> : null}

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
      {status === "completed" && record?.defense ? <section className="inspector-panel__defense" aria-labelledby="inspector-defense-title">
        <h3 id="inspector-defense-title">Defensa registrada</h3>
        <dl>
          <div><dt>Mutación explicada</dt><dd>{record.defense.mutationObserved ? "Sí" : "No"}</dd></div>
          <div><dt>Restauración confirmada</dt><dd>{record.defense.restorationConfirmed ? "Sí" : "No"}</dd></div>
          <div><dt>Fecha de registro</dt><dd><time dateTime={record.defense.recordedAt}>{formatDate(record.defense.recordedAt)}</time></dd></div>
        </dl>
      </section> : null}
      {status === "obsolete" && record?.supersededByCommitSha ? <p className="inspector-panel__obsolete" role="status">Esta defensa quedó obsoleta cuando cambió el commit. Nuevo commit: <code>{record.supersededByCommitSha}</code></p> : null}
      {message && <p className="inspector-panel__message" role="status">{message}</p>}
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
