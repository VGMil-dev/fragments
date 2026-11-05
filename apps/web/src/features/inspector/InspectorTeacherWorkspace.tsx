import { useState, type FormEvent } from "react";
import type { InspectorChallengeRecordResponse } from "@fragments/contracts";
import type { createInspectorApi } from "../../lib/api/inspector-api.js";
import { InspectorTeacherPanel } from "./InspectorTeacherPanel.js";
import "./inspector-teacher-workspace.css";

type InspectorApi = ReturnType<typeof createInspectorApi>;

export function InspectorTeacherWorkspace({ api, navigate }: { api: InspectorApi; navigate: (path: string) => void }) {
  const [reviewId, setReviewId] = useState("");
  const [records, setRecords] = useState<InspectorChallengeRecordResponse[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const active = records.find((record) => record.id === selectedId) ?? records.at(-1) ?? null;

  function saveRecord(record: InspectorChallengeRecordResponse) {
    setRecords((current) => [...current.filter((item) => item.id !== record.id), record]);
    setSelectedId(record.id);
    setMessage("");
  }

  async function loadReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await api.list(reviewId);
    if (!result.ok) { setMessage(result.error.message); return; }
    setRecords(result.data);
    setSelectedId(result.data.at(-1)?.id ?? "");
    setMessage(result.data.length ? "Retos de la revisión cargados." : "Esta revisión aún no tiene retos Inspector.");
  }

  async function createChallenge() {
    const result = await api.create(reviewId);
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Reto creado desde evidencia verificada.");
  }

  async function assignChallenge() {
    if (!active) return;
    const result = await api.assign(active.id);
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Reto asignado. Ya puedes registrar la defensa.");
  }

  async function recordDefense(form: FormData) {
    if (!active) return;
    const result = await api.record(active.id, {
      mutationObserved: form.get("mutationObserved") === "true",
      restorationConfirmed: form.get("restorationConfirmed") === "true",
      notes: String(form.get("notes") ?? ""),
    });
    if (!result.ok) { setMessage(result.error.message); return; }
    saveRecord(result.data);
    setMessage("Defensa registrada.");
  }

  return (
    <main className="inspector-workspace" aria-labelledby="inspector-workspace-title">
      <header className="inspector-workspace__header">
        <a className="inspector-workspace__home" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Inicio</a>
        <p>FRAGMENTS · ESPACIO DOCENTE</p>
        <h1 id="inspector-workspace-title">Inspector</h1>
        <span>Los retos parten de evidencia del commit y la ayuda permanece privada.</span>
      </header>
      <form className="inspector-workspace__lookup" onSubmit={loadReview}>
        <label htmlFor="inspector-review-id">ID de revisión</label>
        <input id="inspector-review-id" name="reviewId" value={reviewId} onChange={(event) => setReviewId(event.target.value)} required maxLength={100} />
        <button type="submit">Cargar revisión</button>
        <button type="button" onClick={() => void createChallenge()} disabled={!reviewId.trim()}>Crear reto</button>
      </form>
      {records.length > 1 ? (
        <label className="inspector-workspace__select-label" htmlFor="inspector-challenge-id">Reto de esta revisión
          <select id="inspector-challenge-id" value={active?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
            {records.map((record) => <option key={record.id} value={record.id}>{record.status} · {record.id}</option>)}
          </select>
        </label>
      ) : null}
      <InspectorTeacherPanel
        challenge={active?.challenge ?? null}
        status={active?.status ?? "pending"}
        onAssign={assignChallenge}
        onRecord={recordDefense}
        message={message}
      />
    </main>
  );
}
