import { BrandMark } from "./components/brand/BrandMark";
import { BuildVersion } from "./components/brand/BuildVersion";
import { ClipboardCheck, Code2, Dumbbell, Folder, GraduationCap, Home, Image, Lightbulb, MoreHorizontal, Rocket, Sparkles, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AcademicGalleryDetail, AcademicGalleryEntry, ClassroomSummary, MentorPublishedConfig, ProposalDraftResponse, StudentAssignment, StudentClassroomRequest, StudentMe, StudentSubmissionsResponse, UpdateProposalDraftRequest } from "@fragments/contracts";
import { createApiClient } from "./lib/api/api-client";
import { createStudentApi } from "./lib/api/student-api";
import { GalleryScreen } from "./features/gallery";
import { MentorScreen } from "./features/mentor";
import { ReviewScreen } from "./features/review";
import { TrainerScreen } from "./features/trainer";
import { createTrainerApi } from "./lib/api/trainer-api";
import { TeacherPasswordReset } from "./features/mentor-control/TeacherPasswordReset";
import { StudentLoginScreen } from "./features/auth/StudentLoginScreen";
import { StudentDashboard } from "./features/student/StudentDashboard";
import { StudentClassroomsScreen } from "./features/student/StudentClassroomsScreen";
import { LandingHeroMedia } from "./features/landing/LandingHeroMedia";
import { OAuthCompletionScreen } from "./features/auth/OAuthCompletionScreen";
import { TeacherWorkspaceShell } from "./features/teacher/TeacherWorkspaceShell";
import { AdminDiagnosticsScreen } from "./features/admin-diagnostics/AdminDiagnosticsScreen.js";
import { adminDiagnosticsApi } from "./features/admin-diagnostics/admin-diagnostics-api.js";
import { AdminRequestsScreen } from "./features/admin-requests/AdminRequestsScreen.js";
import { adminRequestsApi } from "./features/admin-requests/admin-requests-api.js";
import { AdminQueueSummaryScreen } from "./features/admin-queue/AdminQueueSummaryScreen.js";
import { adminQueueApi } from "./features/admin-queue/admin-queue-api.js";
import { AdminAuditLogScreen } from "./features/admin-audit-log/AdminAuditLogScreen.js";
import { adminAuditLogApi } from "./features/admin-audit-log/admin-audit-log-api.js";
import { AdminReviewEventsScreen } from "./features/admin-review-events/AdminReviewEventsScreen.js";
import { adminReviewEventsApi } from "./features/admin-review-events/admin-review-events-api.js";
import { AdminMentorEventsScreen } from "./features/admin-mentor-events/AdminMentorEventsScreen.js";
import { adminMentorEventsApi } from "./features/admin-mentor-events/admin-mentor-events-api.js";
import { AdminTeachersPanel } from "./features/admin-teachers/AdminTeachersPanel.js";
import { adminTeachersApi } from "./features/admin-teachers/admin-teachers-api.js";
import "./features/landing/public-landing-f162.css";
import type { AsyncState } from "./hooks/async-state";
import "./styles/student-workspace.css";
import "./styles/teacher-workspace.css";

const studentApi = createStudentApi(createApiClient(), createApiClient({ timeoutMs: 40_000 }));
const trainerApi = createTrainerApi();

function requiredSkillsFromProposalContext(proposal: ProposalDraftResponse): Array<{ id: string; name: string }> {
  const context = proposal.assignmentContext;
  if (!proposal.assignmentVersionId || context?.assignmentVersionId !== proposal.assignmentVersionId) return [];
  return context.requiredSkills;
}

function StudentWorkspace({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [gallery, setGallery] = useState<AsyncState<AcademicGalleryEntry[]>>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [inspiration, setInspiration] = useState<AcademicGalleryEntry | undefined>();
  const [student, setStudent] = useState<StudentMe | null>(null);
  const [authError, setAuthError] = useState(false);
  const [authReload, setAuthReload] = useState(0);
  const [ownedProposals, setOwnedProposals] = useState<ProposalDraftResponse[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState(false);
  const [proposalsReload, setProposalsReload] = useState(0);
  const [submissions, setSubmissions] = useState<AsyncState<StudentSubmissionsResponse>>({ status: "loading" });
  const [submissionsReload, setSubmissionsReload] = useState(0);
  const [mentorContext, setMentorContext] = useState<AsyncState<MentorPublishedConfig>>({ status: "loading" });
  const [mentorContextReload, setMentorContextReload] = useState(0);
  const [submissionDownloadError, setSubmissionDownloadError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalDraftResponse | undefined>();
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | undefined>();
  const requiredMissionSkills = selectedProposal
    ? requiredSkillsFromProposalContext(selectedProposal)
    : selectedAssignment?.requiredSkills ?? [];
  const [galleryOffset, setGalleryOffset] = useState(0);
  const [galleryNextOffset, setGalleryNextOffset] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AcademicGalleryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myClassrooms, setMyClassrooms] = useState<ClassroomSummary[]>([]);
  const [myClassroomRequests, setMyClassroomRequests] = useState<StudentClassroomRequest[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsError, setClassroomsError] = useState<string | null>(null);
  const [classroomsReload, setClassroomsReload] = useState(0);

  async function downloadSubmission(id: string, kind: "mentor" | "review") {
    setSubmissionDownloadError(null);
    try {
      const result = kind === "mentor" ? await studentApi.downloadMentorPdf(id) : await studentApi.downloadReviewPdf(id);
      if (!result.ok) { setSubmissionDownloadError("No pudimos descargar el resultado. Inténtalo de nuevo."); return; }
      const url = URL.createObjectURL(result.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = kind === "mentor" ? "fragments-mentor.pdf" : "fragments-review.pdf";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setSubmissionDownloadError("No pudimos descargar el resultado. Inténtalo de nuevo."); }
  }

  useEffect(() => {
    if (!path.startsWith("/student/")) return;
    let active = true;
    setAuthError(false);
    void studentApi.getMe().then((result) => {
      if (!active) return;
      if (!result.ok) { setAuthError(true); return; }
      if (!result.data.authenticated) { navigate("/student/login"); return; }
      setStudent(result.data);
    }).catch(() => { if (active) setAuthError(true); });
    return () => { active = false; };
  }, [path, navigate, authReload]);

  useEffect(() => {
    if (!(["/student/dashboard", "/student/classrooms", "/student/mentor"].includes(path)) || !student) return;
    let active = true;
    setClassroomsLoading(true);
    setClassroomsError(null);
    void Promise.all([studentApi.getMyClassrooms(), studentApi.getMyClassroomRequests()]).then(([rooms, requests]) => {
      if (!active) return;
      if (!rooms.ok || !requests.ok) {
        if ((!rooms.ok && rooms.error.code === "AUTH_REQUIRED") || (!requests.ok && requests.error.code === "AUTH_REQUIRED")) { navigate("/student/login"); return; }
        setClassroomsError("No pudimos cargar tus aulas y solicitudes.");
      } else {
        setMyClassrooms(rooms.data);
        setMyClassroomRequests(requests.data);
      }
      setClassroomsLoading(false);
    }).catch(() => { if (active) { setClassroomsError("No pudimos cargar tus aulas y solicitudes."); setClassroomsLoading(false); } });
    return () => { active = false; };
  }, [path, student, classroomsReload, navigate]);

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
    if (!["/student/mentor", "/student/dashboard", "/student/projects", "/student/review"].includes(path) || !student) return;
    let active = true;
    setProposalsLoading(true);
    setProposalsError(false);
    void studentApi.getMyProposals().then((result) => {
      if (!active) return;
      if (result.ok) setOwnedProposals(result.data);
      else setProposalsError(true);
      setProposalsLoading(false);
    }).catch(() => { if (active) { setProposalsError(true); setProposalsLoading(false); } });
    return () => { active = false; };
  }, [path, student, proposalsReload]);

  useEffect(() => {
    if (!["/student/dashboard", "/student/submissions"].includes(path) || !student) return;
    let active = true;
    setSubmissions({ status: "loading" });
    void studentApi.getMySubmissions().then((result) => {
      if (!active) return;
      if (result.ok) setSubmissions(result.data.length ? { status: "success", data: result.data } : { status: "empty" });
      else if (result.error.code === "AUTH_REQUIRED") navigate("/student/login");
      else setSubmissions({ status: "error", retry: () => setSubmissionsReload((value) => value + 1), message: "No pudimos cargar tus entregas guardadas." });
    }).catch(() => { if (active) setSubmissions({ status: "error", retry: () => setSubmissionsReload((value) => value + 1), message: "No pudimos cargar tus entregas guardadas." }); });
    return () => { active = false; };
  }, [path, student, submissionsReload, navigate]);

  useEffect(() => {
    if (path !== "/student/mentor" || !student) return;
    let active = true;
    const controller = new AbortController();
    if (selectedAssignment && (!selectedProposal || selectedProposal.assignmentVersionId === selectedAssignment.id)) {
      setMentorContext({ status: "success", data: selectedAssignment.mentorContext });
      return () => { active = false; controller.abort(); };
    }
    if (selectedProposal?.assignmentVersionId) {
      setMentorContext(selectedProposal.assignmentContext
        ? { status: "success", data: selectedProposal.assignmentContext.mentorContext }
        : { status: "error", message: "No pudimos recuperar el contexto de la misión fijada a esta propuesta.", retry: () => navigate("/student/projects"), retryLabel: "Volver a mis proyectos" });
      return () => { active = false; controller.abort(); };
    }
    setMentorContext({ status: "loading" });
    void studentApi.getMentorContext(controller.signal).then((result) => {
      if (!active) return;
      if (result.ok) {
        setMentorContext({ status: "success", data: result.data });
      } else if (result.error.code === "CONFIG_UNAVAILABLE") {
        setMentorContext({ status: "empty" });
      } else if (result.error.code === "AUTH_REQUIRED") {
        navigate("/student/login");
      } else {
        setMentorContext({ status: "error", message: "No pudimos consultar el contexto docente autorizado.", retry: () => setMentorContextReload((value) => value + 1) });
      }
    }).catch(() => {
      if (active) setMentorContext({ status: "error", message: "No pudimos consultar el contexto docente autorizado.", retry: () => setMentorContextReload((value) => value + 1) });
    });
    return () => { active = false; controller.abort(); };
  }, [path, student, selectedAssignment, selectedProposal, mentorContextReload, navigate]);

  if (!student && authError) return <main className="student-screen"><p role="alert">No pudimos comprobar tu acceso. Inténtalo de nuevo.</p><button type="button" onClick={() => setAuthReload((value) => value + 1)}>Reintentar</button></main>;
  if (!student) return <main className="student-screen"><p role="status">Comprobando el acceso con GitHub…</p></main>;

  return (
    <div className="student-workspace">
      <a className="skip-link" href="#student-content">Saltar al contenido</a>
      <header className="student-workspace__nav">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }} aria-label="Fragments, ir al inicio">
          <BrandMark className="brand__icon" />
          <span className="brand__name">fragments<span className="brand__period">.</span></span>
        </a>
        <nav className="student-workspace__navigation" aria-label="Secciones para estudiantes">
          <div className="student-nav__primary">
            <a href="/student/dashboard" aria-current={path === "/student/dashboard" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/dashboard"); }}><Home size={19} aria-hidden="true" /><span><span className="student-nav-desktop">Mi espacio</span><span className="student-nav-mobile">Inicio</span></span></a>
            <a href="/student/classrooms" aria-current={path === "/student/classrooms" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/classrooms"); }}><GraduationCap size={19} aria-hidden="true" /><span><span className="student-nav-desktop-label">Mis aulas</span><span className="student-nav-mobile-label">Aulas</span></span></a>
            <a className="student-nav-projects" href="/student/projects" aria-current={path === "/student/projects" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/projects"); }}><Folder size={19} aria-hidden="true" /><span>Mis proyectos</span></a>
            <a href="/student/submissions" aria-current={path === "/student/submissions" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/submissions"); }}><ClipboardCheck size={19} aria-hidden="true" /><span><span className="student-nav-desktop-label">Mis entregas</span><span className="student-nav-mobile-label">Entregas</span></span></a>
          </div>
          <div className="student-nav__tools" aria-label="Herramientas">
            <a href="/student/gallery" aria-current={path === "/student/gallery" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/gallery"); }}><Image size={19} aria-hidden="true" /><span>Galería</span></a>
            <a href="/student/mentor" aria-current={path === "/student/mentor" ? "page" : undefined} onClick={(event) => { event.preventDefault(); setSelectedAssignment(undefined); navigate("/student/mentor"); }}><Sparkles size={19} aria-hidden="true" /><span>Mentor</span></a>
            <a href="/student/review" aria-current={path === "/student/review" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/review"); }}><Code2 size={19} aria-hidden="true" /><span>Review</span></a>
            <a href="/student/trainer" aria-current={path === "/student/trainer" ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate("/student/trainer"); }}><Dumbbell size={19} aria-hidden="true" /><span>Trainer</span></a>
          </div>
          <details className={`student-workspace__more${["/student/projects", "/student/gallery", "/student/mentor", "/student/review", "/student/trainer"].includes(path) ? " student-workspace__more--active" : ""}`}><summary><MoreHorizontal size={19} aria-hidden="true" /><span>Más</span></summary><div>
              <a href="/student/projects" aria-current={path === "/student/projects" ? "page" : undefined} onClick={(event) => { event.preventDefault(); event.currentTarget.closest("details")?.removeAttribute("open"); navigate("/student/projects"); }}>Mis proyectos</a>
              <a href="/student/gallery" aria-current={path === "/student/gallery" ? "page" : undefined} onClick={(event) => { event.preventDefault(); event.currentTarget.closest("details")?.removeAttribute("open"); navigate("/student/gallery"); }}>Galería</a>
              <a href="/student/mentor" aria-current={path === "/student/mentor" ? "page" : undefined} onClick={(event) => { event.preventDefault(); event.currentTarget.closest("details")?.removeAttribute("open"); setSelectedAssignment(undefined); navigate("/student/mentor"); }}>Mentor</a>
              <a href="/student/review" aria-current={path === "/student/review" ? "page" : undefined} onClick={(event) => { event.preventDefault(); event.currentTarget.closest("details")?.removeAttribute("open"); navigate("/student/review"); }}>Review</a>
              <a href="/student/trainer" aria-current={path === "/student/trainer" ? "page" : undefined} onClick={(event) => { event.preventDefault(); event.currentTarget.closest("details")?.removeAttribute("open"); navigate("/student/trainer"); }}>Trainer</a>
          </div></details>
        </nav>
        <div className="student-workspace__account">{student ? <>{student.profileUrl && student.githubLogin ? <a href={student.profileUrl} target="_blank" rel="noreferrer">@{student.githubLogin}</a> : <span>Cuenta GitHub</span>}<button type="button" onClick={() => { void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).finally(() => navigate("/student/login")); }}>Cerrar sesión</button></> : <a href="/student/login" onClick={(event) => { event.preventDefault(); navigate("/student/login"); }}>Acceso estudiante</a>}</div>
      </header>
      <div id="student-content" className="student-workspace__content" role="region" aria-label="Contenido de estudiante" tabIndex={-1}>
        {path === "/student/dashboard" ? <StudentDashboard
          student={student}
          classrooms={myClassrooms}
          classroomRequests={myClassroomRequests}
          classroomsLoading={classroomsLoading}
          classroomsError={classroomsError}
          onRetryClassrooms={() => setClassroomsReload((value) => value + 1)}
          proposals={ownedProposals}
          proposalsLoading={proposalsLoading}
          proposalsError={proposalsError}
          onRetryProposals={() => setProposalsReload((value) => value + 1)}
          submissions={submissions}
          onRetrySubmissions={() => setSubmissionsReload((value) => value + 1)}
          onContinueProposal={(proposal) => { setSelectedAssignment(undefined); setSelectedProposal(proposal); navigate("/student/mentor"); }}
          onCreateProposal={() => { setSelectedProposal(undefined); setSelectedAssignment(undefined); navigate("/student/mentor"); }}
          onNavigate={navigate}
        /> : null}
        {path === "/student/classrooms" ? <StudentClassroomsScreen classrooms={myClassrooms} requests={myClassroomRequests} loading={classroomsLoading} error={classroomsError} onRefresh={() => setClassroomsReload((value) => value + 1)} onStartProposal={(assignment) => { setSelectedProposal(undefined); setSelectedAssignment(assignment); navigate("/student/mentor"); }} /> : null}
        {path === "/student/projects" ? <main className="student-portal" aria-labelledby="projects-title"><p className="student-screen__eyebrow">MI TRABAJO</p><h1 id="projects-title">Mis proyectos</h1>
          {proposalsLoading ? <p role="status">Cargando tus proyectos…</p> : proposalsError ? <p role="alert">No pudimos cargar tus proyectos. Inténtalo de nuevo más tarde.</p> : ownedProposals.length ? <ul className="student-project-list">{ownedProposals.map((item) => <li key={item.id}><span className="student-project-list__cover" aria-hidden="true">✳</span><span><strong>{item.proposal.title || "Borrador sin título"}</strong><small>Borrador guardado · versión {item.version}</small></span><button type="button" aria-label={`Continuar propuesta: ${item.proposal.title || "Borrador sin título"}`} onClick={() => { setSelectedProposal(item); navigate("/student/mentor"); }}>Continuar</button></li>)}</ul> : <p>Aún no tienes propuestas guardadas.</p>}
          <button className="button button--primary" type="button" onClick={() => { setSelectedProposal(undefined); setSelectedAssignment(undefined); navigate("/student/mentor"); }}>Crear una propuesta</button>
        </main> : null}
        {path === "/student/submissions" ? <main className="student-portal" aria-labelledby="submissions-title"><p className="student-screen__eyebrow">RESULTADOS</p><h1 id="submissions-title">Mis entregas</h1>
          {submissions.status === "loading" ? <p role="status">Cargando tus entregas…</p> : null}
          {submissions.status === "error" ? <div role="alert"><p>{submissions.message}</p><button type="button" onClick={submissions.retry}>Reintentar</button></div> : null}
          {submissions.status === "empty" ? <p>Aún no tienes entregas generadas. Las propuestas guardadas están en Mis proyectos; una evaluación formativa no es una aprobación docente.</p> : null}
          {submissions.status === "success" ? <><ul className="student-submission-list">{submissions.data.map((item) => <li key={item.id}><span><strong>{item.label}</strong><small>{item.kind === "mentor" ? "Entrega Mentor" : "Entrega Review"} · {new Date(item.createdAt).toLocaleDateString("es-CO")}</small></span><span>{item.score}/100</span><small>Resultado disponible · no es aprobación docente</small><button type="button" onClick={() => void downloadSubmission(item.id, item.kind)}>Descargar PDF</button></li>)}</ul><p>Las propuestas guardadas están en Mis proyectos. Una evaluación formativa no es una aprobación docente.</p></> : null}
          {submissionDownloadError ? <p role="alert">{submissionDownloadError}</p> : null}
          <button className="button button--primary" type="button" onClick={() => { setSelectedProposal(undefined); setSelectedAssignment(undefined); navigate("/student/mentor"); }}>Abrir Mentor</button></main> : null}
        {path === "/student/gallery" ? (
          <GalleryScreen
            state={gallery}
            selected={selectedDetail}
            detailLoading={detailLoading}
            onCloseDetail={() => { setSelectedId(null); setSelectedDetail(null); }}
            onChoose={(entry) => { setSelectedId(entry.id); setSelectedDetail({ project: entry, history: [entry] }); }}
            onUseProject={(entry) => { setInspiration(entry); setSelectedProposal(undefined); setSelectedAssignment(undefined); setSelectedId(null); setSelectedDetail(null); navigate("/student/mentor"); }}
            hasMore={galleryNextOffset !== null}
            onLoadMore={() => { if (galleryNextOffset !== null) setGalleryOffset(galleryNextOffset); }}
            onCreateProposal={() => { setInspiration(undefined); setSelectedProposal(undefined); setSelectedAssignment(undefined); navigate("/student/mentor"); }}
          />
        ) : null}
        {path === "/student/mentor" ? (
          <>
            {inspiration ? <p className="student-workspace__inspiration" role="note">Tomaste “{inspiration.title}” como referencia. Describe tu propia idea antes de guardarla.</p> : null}
            <MentorScreen
              key={selectedProposal?.id ?? selectedAssignment?.id ?? "new-proposal"}
              initialProposal={selectedProposal}
              requiredMissionSkills={requiredMissionSkills}
              restoreEvaluation={Boolean(selectedProposal)}
              contextState={mentorContext}
            savedProposals={ownedProposals}
              proposalsLoading={proposalsLoading}
              proposalsError={proposalsError}
              onRetryProposals={() => setProposalsReload((value) => value + 1)}
              classrooms={myClassrooms}
              classroomsLoading={classroomsLoading}
              classroomsError={classroomsError}
              onRetryClassrooms={() => setClassroomsReload((value) => value + 1)}
              onLoadClassroomSkills={studentApi.getMyClassroomSkills}
              onResolveConflict={() => { setSelectedProposal(undefined); setProposalsReload((value) => value + 1); navigate("/student/projects"); }}
              onOpenProposal={setSelectedProposal}
              onSave={async (draft) => {
                const result = await studentApi.saveProposalDraft({ ...draft, ...(selectedAssignment ? { assignmentVersionId: selectedAssignment.id } : {}) });
                if (result.ok) setOwnedProposals((current) => [result.data, ...current.filter((entry) => entry.id !== result.data.id)]);
                return result;
              }}
              onUpdate={async (proposalId: string, draft: UpdateProposalDraftRequest) => {
                const result = await studentApi.updateProposalDraft(proposalId, draft);
                if (result.ok) {
                  setOwnedProposals((current) => current.map((entry) => entry.id === result.data.id ? result.data : entry));
                  setSelectedProposal(result.data);
                }
                return result;
              }}
              onEvaluate={(proposalId) => studentApi.evaluateProposal(proposalId)}
              onRecoverEvaluation={(proposalId) => studentApi.recoverProposalEvaluation(proposalId)}
              onGenerateSubmission={(request) => studentApi.createMentorSubmission(request)}
              onReadme={(submissionId) => studentApi.downloadMentorReadme(submissionId)}
              onPdf={(submissionId) => studentApi.downloadMentorPdf(submissionId)}
              onBack={() => { setSelectedAssignment(undefined); navigate("/student/gallery"); }}
            />
          </>
        ) : null}
        {path === "/student/review" ? (
          <ReviewScreen
            onQueue={(request) => studentApi.createReview(request)}
            onRetry={(reviewId) => studentApi.retryReview(reviewId)}
            onRefresh={(reviewId) => studentApi.getReview(reviewId)}
            onGenerateSubmission={(request) => studentApi.createReviewSubmission(request)}
            onPdf={(submissionId) => studentApi.downloadReviewPdf(submissionId)}
            linkedProposals={ownedProposals.filter((proposal) => Boolean(proposal.assignmentVersionId && proposal.assignmentContext?.assignmentVersionId === proposal.assignmentVersionId))}
            onBack={() => { setSelectedAssignment(undefined); navigate("/student/mentor"); }}
          />
        ) : null}
        {path === "/student/trainer" ? <TrainerScreen api={trainerApi} /> : null}
      </div>
      <footer className="student-workspace__footer"><BuildVersion /></footer>
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
    if (path.startsWith("/student/") || path.startsWith("/teacher/")) {
      requestAnimationFrame(() => document.getElementById("route-content")?.focus({ preventScroll: true }));
    }
  }, [path]);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  if (path === "/student/login") return <><StudentLoginScreen navigate={navigate} /><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/auth/complete") return <><OAuthCompletionScreen navigate={navigate} /><footer className="route-version"><BuildVersion /></footer></>;
  if (path.startsWith("/student/")) return <StudentWorkspace path={path} navigate={navigate} />;
  if (path === "/teacher/reset-password") return <><div id="route-content" tabIndex={-1}><TeacherPasswordReset navigate={navigate} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/diagnostics") return <><div id="route-content" tabIndex={-1}><AdminDiagnosticsScreen api={adminDiagnosticsApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/requests") return <><div id="route-content" tabIndex={-1}><AdminRequestsScreen api={adminRequestsApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/queue") return <><div id="route-content" tabIndex={-1}><AdminQueueSummaryScreen api={adminQueueApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/audit-log") return <><div id="route-content" tabIndex={-1}><AdminAuditLogScreen api={adminAuditLogApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/review-events") return <><div id="route-content" tabIndex={-1}><AdminReviewEventsScreen api={adminReviewEventsApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/mentor-events") return <><div id="route-content" tabIndex={-1}><AdminMentorEventsScreen api={adminMentorEventsApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/admin/teachers") return <><div id="route-content" tabIndex={-1}><AdminTeachersPanel api={adminTeachersApi} /></div><footer className="route-version"><BuildVersion /></footer></>;
  if (path === "/teacher" || path.startsWith("/teacher/")) return <><TeacherWorkspaceShell path={path} navigate={navigate} /><footer className="route-version"><BuildVersion /></footer></>;

  return (
    <>
      <div className="f162-landing">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="f162-header">
        <a className="brand" href="#inicio" aria-label="Fragments, ir al inicio">
          <img className="brand__icon f162-isotipo" src="/brand/fragments-isotipo-recto.svg" alt="" width={40} height={32} />
          <span className="brand__name">Fragments<span className="brand__period">.</span></span>
        </a>
        <nav className="f162-auth" aria-label="Acceso">
          <a className="f162-login" href="/student/login" onClick={(event) => { event.preventDefault(); navigate("/student/login"); }}>Iniciar sesión</a>
          <a className="f162-signup" href="/student/login" aria-label="Crear cuenta; continuar con GitHub" onClick={(event) => { event.preventDefault(); navigate("/student/login"); }}>Crear cuenta</a>
        </nav>
      </header>

      <main id="contenido">
        <section className="f162-hero" id="inicio" aria-labelledby="f162-title">
          <LandingHeroMedia />
          <div className="f162-intro">
            <h1 id="f162-title">Fragments</h1>
            <p className="f162-tagline">Sueña · Crea · Conecta</p>
            <p className="f162-description">Un lugar para imaginar, aprender y construir proyectos a tu ritmo.</p>
          </div>
          <section className="f162-dock" aria-label="Descubre Fragments">
            <div className="f162-dock-inner">
              <ul className="f162-benefits" aria-label="Lo que encontrarás en Fragments">
                <li>
                  <span aria-hidden="true" className="f162-benefit-icon"><Rocket size={22} strokeWidth={1.8} aria-hidden="true" focusable="false" /></span>
                  <span className="f162-benefit-full">Desarrollo sin límites</span><span aria-hidden="true" className="f162-benefit-short">Desarrollo</span>
                </li>
                <li>
                  <span aria-hidden="true" className="f162-benefit-icon"><Lightbulb size={22} strokeWidth={1.8} aria-hidden="true" focusable="false" /></span>
                  <span className="f162-benefit-full">Ideas que inspiran</span><span aria-hidden="true" className="f162-benefit-short">Ideas</span>
                </li>
                <li>
                  <span aria-hidden="true" className="f162-benefit-icon"><UsersRound size={22} strokeWidth={1.8} aria-hidden="true" focusable="false" /></span>
                  <span className="f162-benefit-full">Comunidad unida</span><span aria-hidden="true" className="f162-benefit-short">Comunidad</span>
                </li>
              </ul>
              <div className="f162-action">
                <p>Un nuevo capítulo comienza...</p>
                <a className="f162-start" href="/student/login" aria-label="Comenzar; continuar con GitHub" onClick={(event) => { event.preventDefault(); navigate("/student/login"); }}>
                  <span>Comenzar</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>
                </a>
              </div>
            </div>
          </section>
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

      </main>

      <footer className="site-footer">
        <a className="brand brand--footer" href="#inicio" aria-label="Fragments, volver al inicio"><BrandMark className="brand__icon" /><span className="brand__name">fragments<span className="brand__period">.</span></span></a>
        <p>Imagina. Construye. Demuestra.</p>
        <a href="/teacher/dashboard" onClick={(event) => { event.preventDefault(); navigate("/teacher/dashboard"); }}>Área docente</a>
        <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>Control de Mentor</a>
        <a href="/teacher/students" onClick={(event) => { event.preventDefault(); navigate("/teacher/students"); }}>Estudiantes y proyectos</a>
        <a href="/teacher/classrooms" onClick={(event) => { event.preventDefault(); navigate("/teacher/classrooms"); }}>Classroom Studio</a>
        <span>Hecho para aprender creando <span aria-hidden="true">✳</span></span>
        <BuildVersion />
      </footer>
      </div>
    </>
  );
}
