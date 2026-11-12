import { BrandMark } from "./components/brand/BrandMark";
import { useCallback, useEffect, useState } from "react";
import type { AcademicGalleryDetail, AcademicGalleryEntry, MentorPublishedConfig, StudentMe } from "@fragments/contracts";
import { createApiClient } from "./lib/api/api-client";
import { createStudentApi } from "./lib/api/student-api";
import { GalleryScreen } from "./features/gallery";
import { MentorScreen } from "./features/mentor";
import { ReviewScreen } from "./features/review";
import { TrainerScreen } from "./features/trainer";
import { TeacherGate } from "./features/inspector";
import { createInspectorApi } from "./lib/api/inspector-api";
import { createTrainerApi } from "./lib/api/trainer-api";
import { MentorControlWorkspace } from "./features/mentor-control/MentorControlWorkspace";
import { TeacherPasswordReset } from "./features/mentor-control/TeacherPasswordReset";
import { StudentLoginScreen } from "./features/auth/StudentLoginScreen";
import { TeacherStudentsWorkspace } from "./features/teacher/TeacherStudentsWorkspace";
import type { AsyncState } from "./hooks/async-state";
import "./styles/student-workspace.css";

const studentApi = createStudentApi(createApiClient(), createApiClient({ timeoutMs: 40_000 }));
const inspectorApi = createInspectorApi(createApiClient());
const trainerApi = createTrainerApi();

function StudentWorkspace({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [gallery, setGallery] = useState<AsyncState<AcademicGalleryEntry[]>>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [inspiration, setInspiration] = useState<AcademicGalleryEntry | undefined>();
  const [mentorContext, setMentorContext] = useState<MentorPublishedConfig | undefined>();
  const [student, setStudent] = useState<StudentMe | null>(null);
  const [galleryOffset, setGalleryOffset] = useState(0);
  const [galleryNextOffset, setGalleryNextOffset] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AcademicGalleryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (path !== "/student/gallery" && path !== "/student/mentor") return;
    let active = true;
    void studentApi.getMe().then((result) => {
      if (!active) return;
      if (!result.ok || !result.data.authenticated) { navigate("/student/login"); return; }
      setStudent(result.data);
    });
    return () => { active = false; };
  }, [path, navigate]);

  useEffect(() => {
    if (path !== "/student/gallery" || !student) return;
    let active = true;
    void studentApi.getGallery(galleryOffset).then((result) => {
      if (!active) return;
      if (!result.ok) {
        if (result.error.code === "AUTH_REQUIRED") { navigate("/student/login"); return; }
        setGallery({ status: "error", retry: () => { setGalleryOffset(0); setReload((value) => value + 1); } });
        return;
      }
      setGallery((current) => ({ status: "success", data: galleryOffset === 0 || current.status !== "success" ? result.data.items : [...current.data, ...result.data.items] }));
      setGalleryNextOffset(result.data.nextOffset);
    });
    return () => { active = false; };
  }, [path, reload, galleryOffset, student, navigate]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setDetailLoading(true);
    void studentApi.getGalleryDetail(selectedId).then((result) => {
      if (!active) return;
      if (result.ok) setSelectedDetail(result.data);
      setDetailLoading(false);
    });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    if (path !== "/student/mentor" || !student) return;
    let active = true;
    void studentApi.getMentorContext().then((result) => { if (active && result.ok) setMentorContext(result.data); });
    return () => { active = false; };
  }, [path]);

  if ((path === "/student/gallery" || path === "/student/mentor") && !student) return <main className="student-screen"><p role="status">Comprobando el acceso con GitHub…</p></main>;

  return (
    <div className="student-workspace">
      <a className="skip-link" href="#student-content">Saltar al contenido</a>
      <header className="student-workspace__nav">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }} aria-label="Fragments, ir al inicio">
          <BrandMark className="brand__icon" />
          <span className="brand__name">fragments<span className="brand__period">.</span></span>
        </a>
        <nav aria-label="Secciones para estudiantes">
          <a href="/student/gallery" aria-current={path === "/student/gallery" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/gallery"); }}>Galería</a>
          <a href="/student/mentor" aria-current={path === "/student/mentor" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/mentor"); }}>Mentor</a>
          <a href="/student/review" aria-current={path === "/student/review" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/review"); }}>Review</a>
          <a href="/student/trainer" aria-current={path === "/student/trainer" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/trainer"); }}>Trainer</a>
        </nav>
        <div className="student-workspace__account">{student ? <><a href={student.profileUrl} target="_blank" rel="noreferrer">@{student.githubLogin}</a><button type="button" onClick={() => { void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).finally(() => navigate("/student/login")); }}>Cerrar sesión</button></> : <a href="/student/login" onClick={(event) => { event.preventDefault(); navigate("/student/login"); }}>Acceso estudiante</a>}</div>
      </header>
      <div id="student-content" className="student-workspace__content" role="region" aria-label="Contenido de estudiante" tabIndex={-1}>
        {path === "/student/gallery" ? (
          <GalleryScreen
            state={gallery}
            selected={selectedDetail}
            detailLoading={detailLoading}
            onCloseDetail={() => { setSelectedId(null); setSelectedDetail(null); }}
            onChoose={(entry) => { setSelectedId(entry.id); setSelectedDetail({ project: entry, history: [entry] }); }}
            onUseProject={(entry) => { setInspiration(entry); setSelectedId(null); setSelectedDetail(null); navigate("/student/mentor"); }}
            hasMore={galleryNextOffset !== null}
            onLoadMore={() => { if (galleryNextOffset !== null) setGalleryOffset(galleryNextOffset); }}
            onCreateProposal={() => { setInspiration(undefined); navigate("/student/mentor"); }}
          />
        ) : null}
        {path === "/student/mentor" ? (
          <>
            {inspiration ? <p className="student-workspace__inspiration" role="note">Tomaste “{inspiration.title}” como referencia. Describe tu propia idea antes de guardarla.</p> : null}
            <p className="student-workspace__sharing" role="note"><strong>Antes de enviar:</strong> al guardar y evaluar tu propuesta, la revisión evaluada con su materia, consigna y rúbrica se compartirá automáticamente con estudiantes que iniciaron sesión y docentes. La galería no muestra notas ni comentarios privados.</p>
            <MentorScreen
              mentorContext={mentorContext}
              onSave={(draft) => studentApi.saveProposal(draft)}
              onEvaluate={(proposalId) => studentApi.evaluateProposal(proposalId)}
              onRecoverEvaluation={(proposalId) => studentApi.recoverProposalEvaluation(proposalId)}
              onGenerateSubmission={(request) => studentApi.createMentorSubmission(request)}
              onReadme={(submissionId) => studentApi.downloadMentorReadme(submissionId)}
              onPdf={(submissionId) => studentApi.downloadMentorPdf(submissionId)}
              onBack={() => navigate("/student/gallery")}
            />
          </>
        ) : null}
        {path === "/student/review" ? (
          <ReviewScreen
            onQueue={(request) => studentApi.createReview(request)}
            onRefresh={(reviewId) => studentApi.getReview(reviewId)}
            onGenerateSubmission={(request) => studentApi.createReviewSubmission(request)}
            onPdf={(submissionId) => studentApi.downloadReviewPdf(submissionId)}
            onBack={() => navigate("/student/mentor")}
          />
        ) : null}
        {path === "/student/trainer" ? <TrainerScreen api={trainerApi} /> : null}
      </div>
    </div>
  );
}

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = "";
    if (path.startsWith("/student/") || path === "/teacher/inspector" || path === "/teacher/mentor-control" || path === "/teacher/reset-password") {
      requestAnimationFrame(() => document.getElementById("route-content")?.focus({ preventScroll: true }));
    }
  }, [path]);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  if (path === "/student/login") return <StudentLoginScreen navigate={navigate} />;
  if (path === "/teacher/students") return <TeacherStudentsWorkspace navigate={navigate} />;
  if (path.startsWith("/student/")) return <StudentWorkspace path={path} navigate={navigate} />;
  if (path === "/teacher/inspector") {
    return <div id="route-content" tabIndex={-1}><TeacherGate inspectorApi={inspectorApi} navigate={navigate} /></div>;
  }
  if (path === "/teacher/mentor-control") return <div id="route-content" tabIndex={-1}><MentorControlWorkspace navigate={navigate} /></div>;
  if (path === "/teacher/reset-password") return <div id="route-content" tabIndex={-1}><TeacherPasswordReset navigate={navigate} /></div>;

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Fragments, ir al inicio">
          <BrandMark className="brand__icon" />
          <span className="brand__name">fragments<span className="brand__period">.</span></span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#para-quien">Para estudiantes</a>
        </nav>
        <a className="header-link" href="/student/gallery" onClick={(event) => { event.preventDefault(); navigate("/student/gallery"); }}>Empezar <span aria-hidden="true">↗</span></a>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" />TU ESPACIO PARA APRENDER HACIENDO</p>
            <h1 id="hero-title">Una idea.<br />Muchos <span className="highlight">fragmentos.</span></h1>
            <p className="hero__lead">Aprende programación construyendo proyectos propios, paso a paso y con guía en el camino.</p>
            <a className="button button--primary" href="/student/gallery" onClick={(event) => { event.preventDefault(); navigate("/student/gallery"); }}>Descubrir cómo empezar <span className="button__arrow" aria-hidden="true">→</span></a>
            <p className="hero__note"><img src="/flower.svg" alt="" width="24" height="36" />Imagina. Construye. Demuestra.</p>
          </div>
          <div className="hero__art" aria-label="Ilustración de una computadora rodeada de plantas y piezas de código" role="img">
            <div className="art-frame"><img src="/hero-fragments.webp" alt="" fetchPriority="high" width="1774" height="944" /></div>
            <span className="art-label"><span aria-hidden="true">✳</span>ideas en proceso</span>
          </div>
          <div className="hero__footnote"><span>01</span>APRENDER CON PROYECTOS REALES</div>
        </section>

        <section className="intro" id="para-quien" aria-labelledby="intro-title">
          <div className="intro__tag">MENOS RECETAS, MÁS DESCUBRIMIENTOS</div>
          <div>
            <h2 id="intro-title">Lo que imaginas<br />también se puede <span>programar.</span></h2>
            <p>Empieza con una idea que te importe. Fragments te ayuda a convertirla en un proyecto, entender lo que construyes y mostrar cómo lo hiciste.</p>
          </div>
        </section>

        <section className="steps" id="como-funciona" aria-labelledby="steps-title">
          <div className="steps__heading">
            <p className="eyebrow">TU CAMINO, A TU RITMO</p>
            <h2 id="steps-title">Cada proyecto empieza<br />con un primer paso.</h2>
          </div>
          <ol className="steps__list">
            <li><span className="step-number">01</span><div><h3>Encuentra una idea</h3><p>Elige algo que te dé curiosidad y dale una forma propia.</p></div><img src="/sparkle.svg" alt="" width="28" height="28" /></li>
            <li><span className="step-number">02</span><div><h3>Construye y aprende</h3><p>Avanza por partes, con orientación para seguir descubriendo.</p></div><img src="/flower.svg" alt="" width="24" height="36" /></li>
            <li><span className="step-number">03</span><div><h3>Demuestra lo que hiciste</h3><p>Explica tus decisiones y comparte el resultado de tu proceso.</p></div><span className="step-check" aria-hidden="true">✓</span></li>
          </ol>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div className="closing__ornament" aria-hidden="true"><span>✳</span><span>✳</span><span>✳</span></div>
          <p className="eyebrow">TU SIGUIENTE PROYECTO TE ESPERA</p>
          <h2 id="closing-title">¿Qué te gustaría<br />hacer realidad?</h2>
          <a className="button button--light" href="/student/gallery" onClick={(event) => { event.preventDefault(); navigate("/student/gallery"); }}>Descubrir cómo empezar <span className="button__arrow" aria-hidden="true">→</span></a>
          <p className="closing__caption">Una idea a la vez. Un fragmento a la vez.</p>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand brand--footer" href="#inicio" aria-label="Fragments, volver al inicio"><BrandMark className="brand__icon" /><span className="brand__name">fragments<span className="brand__period">.</span></span></a>
        <p>Imagina. Construye. Demuestra.</p>
        <a href="/teacher/inspector" onClick={(event) => { event.preventDefault(); navigate("/teacher/inspector"); }}>Área docente</a>
        <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>Control de Mentor</a>
        <a href="/teacher/students" onClick={(event) => { event.preventDefault(); navigate("/teacher/students"); }}>Estudiantes y proyectos</a>
        <span>Hecho para aprender creando <span aria-hidden="true">✳</span></span>
      </footer>
    </>
  );
}
