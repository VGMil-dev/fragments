import { useEffect, useMemo, useState } from "react";
import type { TrainerChallenge, TrainerHistoryItem, TrainerReview, TrainerStatus } from "../../lib/api/trainer-api";
import type { createTrainerApi } from "../../lib/api/trainer-api";
import "./trainer-screen.css";

type Api = ReturnType<typeof createTrainerApi>;
const statusLabels: Record<TrainerStatus, string> = { pending: "Pendiente", in_progress: "En progreso", completed: "Completado por ti", need_more: "Necesito practicar más" };
const categoryLabels = { new: "Nuevo", pending: "Pendiente", review: "Repaso" } as const;

export function TrainerScreen({ api }: { api: Api }) {
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [selectedReview, setSelectedReview] = useState("");
  const [history, setHistory] = useState<TrainerHistoryItem[]>([]);
  const [challenge, setChallenge] = useState<TrainerChallenge | null>(null);
  const [category, setCategory] = useState<keyof typeof categoryLabels | null>(null);
  const [shownHints, setShownHints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [message, setMessage] = useState("");
  const review = useMemo(() => reviews.find((item) => item.id === selectedReview), [reviews, selectedReview]);

  useEffect(() => {
    let active = true;
    void api.reviews().then((result) => {
      if (!active) return;
      if (result.ok) { setReviews(result.data); setSelectedReview((current) => current || result.data[0]?.id || ""); }
      else setMessage(result.error.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    if (!selectedReview) { setHistory([]); return; }
    let active = true;
    void api.history(selectedReview).then((result) => { if (active && result.ok) setHistory(result.data); });
    return () => { active = false; };
  }, [api, selectedReview]);

  async function draw() {
    if (!selectedReview || drawing) return;
    setDrawing(true); setMessage(""); setShownHints(0);
    const result = await api.draw(selectedReview);
    if (result.ok) { setChallenge(result.data.challenge); setCategory(result.data.category); }
    else setMessage(result.error.message);
    setDrawing(false);
  }

  async function record(status: TrainerStatus) {
    if (!challenge) return;
    const result = await api.record({ reviewId: challenge.reviewId, challengeId: challenge.id, status, hintsUsed: shownHints });
    if (!result.ok) { setMessage(result.error.message); return; }
    setHistory((current) => [result.data, ...current].slice(0, 200));
    setMessage(`Progreso guardado: ${statusLabels[status].toLowerCase()}.`);
  }

  return (
    <main className="trainer-screen" aria-labelledby="trainer-title">
      <header className="trainer-heading">
        <p className="trainer-eyebrow">PRACTICA CON TU PROYECTO</p>
        <h1 id="trainer-title">Trainer</h1>
        <p>No memorices el reto. Domina tu código.</p>
      </header>

      <section className="trainer-controls" aria-label="Elegir análisis de Review">
        <label htmlFor="trainer-review">Repositorio analizado</label>
        <div className="trainer-controls__row">
          <select id="trainer-review" value={selectedReview} onChange={(event) => { setSelectedReview(event.target.value); setChallenge(null); setCategory(null); }} disabled={loading || !reviews.length}>
            {reviews.map((item) => <option key={item.id} value={item.id}>{item.owner}/{item.repo} · {item.commitSha.slice(0, 7)}</option>)}
          </select>
          <button className="trainer-draw" type="button" onClick={() => void draw()} disabled={!selectedReview || drawing}>
            {drawing ? "Preparando reto…" : "🎲 Sortear reto"}
          </button>
        </div>
        {loading ? <p role="status">Buscando análisis completados…</p> : null}
        {!loading && !reviews.length ? <p className="trainer-empty">Primero analiza un repositorio en Review. Aquí aparecerá cuando el análisis esté listo.</p> : null}
        {review ? <p className="trainer-commit">Commit usado: <code>{review.commitSha}</code></p> : null}
      </section>

      {message ? <p className="trainer-message" role="status">{message}</p> : null}

      {challenge ? (
        <article className="trainer-challenge" aria-labelledby="trainer-challenge-title">
          <div className="trainer-challenge__top"><span className={`trainer-badge trainer-badge--${category}`}>{categoryLabels[category ?? "new"]}</span><span>{challenge.estimatedMinutes} min</span></div>
          <p className="trainer-challenge__feature">Funcionalidad: {challenge.feature}</p>
          <h2 id="trainer-challenge-title">Tu reto</h2>
          <p>{challenge.task}</p>
          <div className="trainer-challenge__detail"><strong>¿Qué observar?</strong><p>{challenge.expectedObservation}</p></div>
          <p className="trainer-source">Basado en <code>{challenge.sourcePath}:{challenge.sourceLines[0]}–{challenge.sourceLines[1]}</code> · commit <code>{challenge.commitSha.slice(0, 7)}</code></p>
          <section className="trainer-hints" aria-labelledby="trainer-hints-title">
            <h3 id="trainer-hints-title">Pistas progresivas</h3>
            <ol>{challenge.hints.slice(0, shownHints).map((hint, index) => <li key={index}><strong>Pista {index + 1}.</strong> {hint}</li>)}</ol>
            {shownHints < 3 ? <button className="trainer-secondary" type="button" onClick={() => setShownHints((count) => Math.min(3, count + 1))}>Mostrar pista {shownHints + 1}</button> : <p>Ya consultaste las tres pistas.</p>}
          </section>
          <div className="trainer-actions" aria-label="Registrar tu progreso">
            <button type="button" onClick={() => void record("in_progress")}>En progreso</button>
            <button type="button" onClick={() => void record("need_more")}>Necesito practicar más</button>
            <button type="button" onClick={() => void record("completed")}>Completado por mí</button>
          </div>
          <p className="trainer-verification-note">El progreso lo registras tú; no es una verificación automática ni una nota.</p>
          <p className="trainer-restoration"><strong>Al terminar:</strong> {challenge.restoration}</p>
        </article>
      ) : null}

      <section className="trainer-history" aria-labelledby="trainer-history-title">
        <div className="trainer-history__heading"><div><p className="trainer-eyebrow">TU RECORRIDO</p><h2 id="trainer-history-title">Historial de práctica</h2></div><span>{history.length} {history.length === 1 ? "intento" : "intentos"}</span></div>
        {history.length ? <ol>{history.map((item) => <li key={item.id}><span><strong>{item.feature}</strong><small>{new Date(item.attemptedAt).toLocaleString("es-CO")} · {item.hintsUsed} pistas</small></span><span className="trainer-history__status">{statusLabels[item.status]}</span></li>)}</ol> : <p className="trainer-empty">Tus prácticas quedarán guardadas aquí en este navegador.</p>}
      </section>
    </main>
  );
}
