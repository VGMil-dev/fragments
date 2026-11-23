import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Code2, GitBranch, Sparkles } from "lucide-react";
import type { TrainerChallenge, TrainerHistoryItem, TrainerReview, TrainerStatus } from "../../lib/api/trainer-api";
import type { createTrainerApi } from "../../lib/api/trainer-api";
import "./trainer-screen.css";

type Api = ReturnType<typeof createTrainerApi>;
type HistoryState = "loading" | "error" | "ready";
type TrainerAttemptRequest = { reviewId: string; challengeId: string; status: TrainerStatus; hintsUsed: number; idempotencyKey: string };
const statusLabels: Record<TrainerStatus, string> = { pending: "Pendiente", in_progress: "En progreso", completed: "Completado por ti", need_more: "Necesito practicar más" };
const categoryLabels = { new: "Nuevo", pending: "Pendiente", review: "Repaso" } as const;

export function TrainerScreen({ api, onStartReview }: { api: Api; onStartReview?: () => void }) {
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [selectedReview, setSelectedReview] = useState("");
  const [history, setHistory] = useState<TrainerHistoryItem[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>("loading");
  const [historyError, setHistoryError] = useState("");
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [challenge, setChallenge] = useState<TrainerChallenge | null>(null);
  const [category, setCategory] = useState<keyof typeof categoryLabels | null>(null);
  const [bankSize, setBankSize] = useState<number | null>(null);
  const [shownHints, setShownHints] = useState(0);
  const [recordedChallengeId, setRecordedChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState("");
  const [recording, setRecording] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<TrainerAttemptRequest | null>(null);
  const [recordError, setRecordError] = useState("");
  const recordingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const review = useMemo(() => reviews.find((item) => item.id === selectedReview), [reviews, selectedReview]);

  useEffect(() => {
    let active = true;
    void loadReviews();
    return () => { active = false; };
    async function loadReviews() {
      setLoading(true);
      setLoadFailed(false);
      setMessage("");
      try {
        const result = await api.reviews();
        if (!active) return;
        if (result.ok) { setReviews(result.data); setSelectedReview((current) => current || result.data[0]?.id || ""); }
        else { setMessage(result.error.message); setLoadFailed(true); }
      } catch {
        if (!active) return;
        setMessage("No pudimos cargar Trainer. Inténtalo de nuevo.");
        setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }
  }, [api, loadAttempt]);

  useEffect(() => {
    if (!selectedReview) { setHistory([]); setHistoryState("ready"); setHistoryError(""); return; }
    let active = true;
    setHistory([]);
    setHistoryState("loading");
    setHistoryError("");
    void loadHistory();
    return () => { active = false; };
    async function loadHistory() {
      try {
        const result = await api.history(selectedReview);
        if (!active) return;
        if (result.ok) {
          setHistory(result.data);
          setHistoryState("ready");
        } else {
          setHistoryError(result.error.message);
          setHistoryState("error");
        }
      } catch {
        if (!active) return;
        setHistoryError("No pudimos cargar el historial de práctica. Inténtalo de nuevo.");
        setHistoryState("error");
      }
    }
  }, [api, selectedReview, historyAttempt]);

  async function draw() {
    if (!selectedReview || drawing) return;
    setDrawing(true); setMessage(""); setDrawError("");
    try {
      const result = await api.draw(selectedReview);
      if (result.ok) {
        setChallenge(result.data.challenge); setCategory(result.data.category); setBankSize(result.data.bankSize); setRecordedChallengeId(null); setShownHints(0);
      } else {
        setDrawError("No pudimos sortear un reto. Tu reto actual y tu historial siguen disponibles; inténtalo de nuevo.");
      }
    } catch {
      setDrawError("No pudimos sortear un reto. Tu reto actual y tu historial siguen disponibles; inténtalo de nuevo.");
    } finally {
      setDrawing(false);
    }
  }

  async function submitRecord(input: TrainerAttemptRequest) {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true); setMessage(""); setRecordError("");
    try {
      const result = await api.record(input);
      if (!result.ok) {
        setRecordError("No pudimos confirmar el registro. Puedes reintentar sin duplicar este intento.");
        return;
      }
      setHistory((current) => [result.data, ...current.filter((item) => item.id !== result.data.id)].slice(0, 200));
      setHistoryState("ready");
      setHistoryError("");
      setRecordedChallengeId(input.challengeId);
      setPendingRecord(null);
      setMessage(`Progreso guardado: ${statusLabels[input.status].toLowerCase()}.`);
    } catch {
      setRecordError("No pudimos confirmar el registro. Puedes reintentar sin duplicar este intento.");
    } finally {
      recordingRef.current = false;
      setRecording(false);
    }
  }

  function record(status: TrainerStatus) {
    if (!challenge || recordingRef.current || pendingRecord || recordedChallengeId === challenge.id) return;
    const input: TrainerAttemptRequest = {
      reviewId: challenge.reviewId,
      challengeId: challenge.id,
      status,
      hintsUsed: shownHints,
      idempotencyKey: crypto.randomUUID(),
    };
    setPendingRecord(input);
    void submitRecord(input);
  }

  return (
    <main className="trainer-screen" aria-labelledby="trainer-title">
      <header className="trainer-heading">
        <p className="trainer-eyebrow">PRÁCTICA · EVIDENCIA · REFLEXIÓN</p>
        <h1 id="trainer-title">Laboratorio de desafíos</h1>
        <p>Practica con retos vinculados a hallazgos de Review y observa tu propio avance.</p>
      </header>

      {loading ? <p className="trainer-load-state" role="status">Buscando análisis completados…</p> : null}

      {!loading && loadFailed ? <div className="trainer-message" role="alert"><p>{message}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Reintentar</button></div> : null}

      {!loading && !loadFailed && !reviews.length ? (
        <section className="trainer-empty-state" aria-labelledby="trainer-empty-title">
          <div className="trainer-empty-state__content">
            <div className="trainer-empty-state__mark" aria-hidden="true"><GitBranch size={25} strokeWidth={1.8} /><span>REVIEW → TRAINER</span></div>
            <p className="trainer-empty-state__eyebrow">LABORATORIO SIN REVISIÓN ACTIVA</p>
            <h2 id="trainer-empty-title">Tu siguiente reto nace de tu código</h2>
            <p>Analiza un commit en Review para habilitar prácticas con objetivos observables, pistas y registro de tu progreso.</p>
            <a className="trainer-empty-state__action" href="/student/review" onClick={onStartReview ? (event) => { event.preventDefault(); onStartReview(); } : undefined}>Ir a Review <ArrowRight size={17} aria-hidden="true" /></a>
            <p className="trainer-empty-state__footnote">No hay retos ni historial disponibles hasta contar con un análisis completado.</p>
          </div>
          <div className="trainer-empty-state__art" aria-hidden="true">
            <img src="/f16/Typing_Girl_and_Sleeping_Cat.webp" alt="" />
            <span>PREPARA TU PRÓXIMA SESIÓN</span>
          </div>
        </section>
      ) : null}

      {reviews.length ? <section className="trainer-controls" aria-label="Elegir análisis de Review">
        <div className="trainer-section-kicker"><span>01</span><p>FUENTE DE PRÁCTICA</p></div>
        <label htmlFor="trainer-review">Elige el análisis que quieres practicar</label>
        <div className="trainer-controls__row">
          <select id="trainer-review" value={selectedReview} onChange={(event) => { setSelectedReview(event.target.value); setChallenge(null); setCategory(null); setBankSize(null); setRecordedChallengeId(null); setPendingRecord(null); setRecordError(""); setDrawError(""); setMessage(""); setHistory([]); setHistoryState("loading"); setHistoryError(""); }} disabled={loading || drawing || recording || Boolean(pendingRecord)}>
            {reviews.map((item) => <option key={item.id} value={item.id}>{item.owner}/{item.repo} · {item.commitSha.slice(0, 7)}</option>)}
          </select>
        </div>
        {review ? <div className="trainer-review-source" aria-label="Origen de la práctica">
          <p><span>Repositorio</span><code>{review.owner}/{review.repo}</code></p>
          <p><span>Commit analizado</span><code>{review.commitSha}</code></p>
        </div> : null}
        {review?.academicContext ? <section className="trainer-academic-context" aria-label="Contexto académico de la revisión">
          <p className="trainer-academic-context__eyebrow">Misión vinculada</p>
          <h2>{review.academicContext.missionTitle} · v{review.academicContext.missionVersion}</h2>
          <p>{review.academicContext.classroomTitle} · Contexto Mentor v{review.academicContext.mentorContextVersion}</p>
          {review.academicContext.requiredSkills === undefined ? <p>Las habilidades requeridas no están disponibles para esta revisión.</p> : <div>
            <strong>Habilidades requeridas</strong>
            {review.academicContext.requiredSkills.length ? <ul>{review.academicContext.requiredSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>Esta misión no requiere habilidades específicas.</p>}
          </div>}
        </section> : null}
      </section> : null}

      {reviews.length && !challenge ? <section className="trainer-start" aria-label="Iniciar sesión de práctica">
        <div className="trainer-start__marker" aria-hidden="true"><Sparkles size={18} /></div>
        <div className="trainer-start__copy"><p className="trainer-start__eyebrow">02 · SESIÓN DE PRÁCTICA</p><h2>El reto aparecerá después del sorteo</h2><p>El objetivo se define a partir de un hallazgo verificado de la revisión seleccionada.</p></div>
        <button className="trainer-draw" type="button" onClick={() => void draw()} disabled={!selectedReview || drawing}>
          {drawing ? "Preparando reto…" : <>Sortear reto <ArrowRight size={17} aria-hidden="true" /></>}
        </button>
      </section> : null}

      {drawError ? <p className="trainer-message trainer-message--error" role="alert">{drawError}</p> : null}
      {message && !loadFailed ? <p className="trainer-message" role="status">{message}</p> : null}

      {challenge ? (
        <article className="trainer-challenge" aria-labelledby="trainer-challenge-title">
          <div className="trainer-section-kicker"><span>02</span><p>RETO ACTUAL</p></div>
          {bankSize === 1 ? <p className="trainer-message" role="status">Este análisis solo tiene una funcionalidad compatible. Puedes volver a sortearla para repasar o elegir otra revisión.</p> : null}
          <div className="trainer-challenge__top"><span className={`trainer-badge trainer-badge--${category}`}>{categoryLabels[category ?? "new"]}</span><span>{challenge.estimatedMinutes} min</span></div>
          {bankSize !== null && bankSize > 1 ? <p className="trainer-bank-size">{bankSize} retos compatibles para este análisis.</p> : null}
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
            <button type="button" disabled={recording || Boolean(pendingRecord) || recordedChallengeId === challenge.id} onClick={() => record("in_progress")}>En progreso</button>
            <button type="button" disabled={recording || Boolean(pendingRecord) || recordedChallengeId === challenge.id} onClick={() => record("need_more")}>Necesito practicar más</button>
            <button type="button" disabled={recording || Boolean(pendingRecord) || recordedChallengeId === challenge.id} onClick={() => record("completed")}>Completado por mí</button>
          </div>
          {recording ? <p role="status">Registrando tu progreso…</p> : null}
          {recordError && pendingRecord ? <div className="trainer-message trainer-message--error"><p role="alert">{recordError}</p><button type="button" className="trainer-secondary" disabled={recording} onClick={() => void submitRecord(pendingRecord)}>{recording ? "Reintentando…" : "Reintentar registro"}</button></div> : null}
          <p className="trainer-verification-note">El progreso lo registras tú; no es una verificación automática ni una nota.</p>
          <p className="trainer-restoration"><strong>Al terminar:</strong> {challenge.restoration}</p>
        </article>
      ) : null}

      {reviews.length ? <section className="trainer-history" aria-labelledby="trainer-history-title">
        <div className="trainer-section-kicker"><span>03</span><p>TRAZA PERSONAL</p></div>
        <div className="trainer-history__heading"><div><p className="trainer-eyebrow">TU RECORRIDO</p><h2 id="trainer-history-title">Historial de práctica</h2></div><span>{historyState === "ready" ? `${history.length} ${history.length === 1 ? "intento" : "intentos"}` : historyState === "loading" ? "Cargando…" : "No disponible"}</span></div>
        {historyState === "loading" ? <p className="trainer-history-state" role="status">Cargando el historial de práctica…</p> : null}
        {historyState === "error" ? <div className="trainer-history-error" role="alert"><p>{historyError}</p><button type="button" onClick={() => { setHistoryState("loading"); setHistoryAttempt((attempt) => attempt + 1); }}>Reintentar historial</button></div> : null}
        {historyState === "ready" && history.length ? <ol className="trainer-history__list">{history.map((item) => <li key={item.id}><span><strong>{item.feature}</strong><small>{new Date(item.attemptedAt).toLocaleString("es-CO")} · {item.hintsUsed} pistas consultadas</small></span><span className="trainer-history__status">{statusLabels[item.status]}</span></li>)}</ol> : null}
        {historyState === "ready" && !history.length ? <p className="trainer-empty">Aún no hay intentos registrados para esta revisión y sesión.</p> : null}
      </section> : null}

      {challenge ? <aside className="trainer-next" aria-label="Siguiente paso">
        <div className="trainer-next__icon" aria-hidden="true"><Code2 size={19} /></div>
        <div><p className="trainer-next__eyebrow">SIGUIENTE PASO</p>
          <h2>{recordedChallengeId === challenge.id ? "Continúa desde esta revisión" : "Registra cómo te fue"}</h2>
          <p>{recordedChallengeId === challenge.id
            ? "Intento guardado en el historial de práctica. Puedes volver a sortear desde los mismos hallazgos."
            : "Cuando termines de observar el código, registra tu estado para incorporarlo al historial real."}</p>
          <small>La autoevaluación guiada sigue en preparación.</small>
        </div>
        {recordedChallengeId === challenge.id ? <button className="trainer-next__action" type="button" onClick={() => void draw()} disabled={drawing}>{drawing ? "Buscando reto…" : "Volver a sortear desde este análisis"}</button> : <span className="trainer-next__status">Registra tu intento arriba</span>}
      </aside> : <aside className="trainer-next" aria-label="Próxima capacidad">
        <div className="trainer-next__icon" aria-hidden="true"><Code2 size={19} /></div>
        <div><p className="trainer-next__eyebrow">SIGUIENTE ETAPA</p><h2>Autoevaluación guiada</h2><p>La autoevaluación guiada está en preparación; todavía no forma parte de Trainer.</p></div>
        <span className="trainer-next__status">En preparación</span>
      </aside>}
    </main>
  );
}
