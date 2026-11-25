// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createTrainerApi } from "../../lib/api/trainer-api";
import { TrainerScreen } from "./TrainerScreen";

describe("TrainerScreen", () => {
  it("shows the compact lab heading during load without inventing a Review or a challenge", () => {
    const html = renderToStaticMarkup(<TrainerScreen api={createTrainerApi()} />);
    expect(html).toContain("Laboratorio de desafíos");
    expect(html).toContain("Buscando análisis completados");
    expect(html).not.toContain("Tu entrenamiento empieza con una revisión");
    expect(html).not.toContain("Sortear reto");
    expect(html).not.toContain("teacherHint");
  });

  it("offers Review after a successful empty response, but not while loading", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    let finish!: (result: { ok: true; data: [] }) => void;
    const onStartReview = vi.fn();
    const api = { reviews: () => new Promise<{ ok: true; data: [] }>((resolve) => { finish = resolve; }) } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} onStartReview={onStartReview} />));
      expect(container.querySelector('a[href="/student/review"]')).toBeNull();
      expect(container.textContent).toContain("Buscando análisis completados");
      await act(async () => finish({ ok: true, data: [] }));
      const link = container.querySelector<HTMLAnchorElement>('a[href="/student/review"]');
      expect(link?.textContent).toContain("Ir a Review");
      expect(container.querySelector("h1")?.textContent).toBe("Laboratorio de desafíos");
      expect(container.textContent).toContain("Tu entrenamiento empieza con una revisión");
      expect(container.querySelector(".trainer-empty-state")).not.toBeNull();
      expect(container.querySelector(".trainer-controls")).toBeNull();
      expect(container.querySelector(".trainer-history")).toBeNull();
      expect(container.querySelector(".trainer-empty-state__art")).toBeNull();
      expect(container.querySelector(".trainer-empty-state img")).toBeNull();
      expect(container.textContent).toContain("Envía un commit a Review. Cuando el análisis esté completo, podrás practicar sus hallazgos en Trainer.");
      expect(container.querySelector('[aria-label="Recorrido de práctica"]')?.textContent).toContain("Repositorio");
      expect(container.querySelector('[aria-label="Recorrido de práctica"]')?.textContent).toContain("Review");
      expect(container.querySelector('[aria-label="Recorrido de práctica"]')?.textContent).toContain("Trainer");
      expect(container.querySelectorAll(".trainer-empty-state__step")).toHaveLength(3);
      expect(container.textContent).not.toMatch(/\b(?:XP|puntos|racha|nivel 1)\b/i);
      expect(container.querySelector(".trainer-next")).toBeNull();
      expect(container.querySelectorAll('a[href="/student/review"]')).toHaveLength(1);
      await act(async () => link!.click());
      expect(onStartReview).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("offers a retry on error without describing the response as empty", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const reviews = vi.fn().mockResolvedValueOnce({ ok: false, error: { code: "OFFLINE", message: "Sin conexión" } })
      .mockResolvedValueOnce({ ok: true, data: [] });
    const api = { reviews } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} onStartReview={vi.fn()} />));
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.textContent).toContain("Reintentar");
      expect(container.querySelector('a[href="/student/review"]')).toBeNull();
      expect(container.textContent).not.toContain("No tienes análisis");
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar")!.click());
      expect(reviews).toHaveBeenCalledTimes(2);
      expect(container.querySelector('a[href="/student/review"]')).not.toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("keeps the real Review controls and practice history when a review exists", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const api = {
      reviews: async () => ({ ok: true, data: [{ id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z" }] }),
      history: async () => ({ ok: true, data: [] }),
    } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} onStartReview={vi.fn()} />));
      expect(container.querySelector(".trainer-controls select")?.textContent).toContain("student/demo");
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain("Repositoriostudent/demo");
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain(`Commit analizado${"a".repeat(40)}`);
      expect(container.textContent).toContain("Sortear reto");
      expect(container.textContent).toContain("Historial de práctica");
      expect(container.textContent).toContain("FUENTE DE PRÁCTICA");
      expect(container.querySelector(".trainer-academic-context")).toBeNull();
      expect(container.textContent).not.toContain("Misión vinculada");
      expect(container.textContent).toContain("El reto aparecerá después del sorteo");
      expect(container.textContent).toContain("La autoevaluación guiada está en preparación");
      expect(container.querySelector(".trainer-empty-state")).toBeNull();
      expect(container.querySelector(".trainer-challenge")).toBeNull();
      expect(container.textContent).toContain("Aún no hay intentos registrados para esta revisión y sesión.");
      expect(container.textContent).not.toContain("Tus prácticas quedarán guardadas aquí en este navegador.");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("opens Trainer on the requested completed Review instead of choosing another one", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const reviews = [
      { id: "review-a", owner: "student", repo: "project-a", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z" },
      { id: "review-b", owner: "student", repo: "project-b", commitSha: "b".repeat(40), updatedAt: "2026-11-02T00:00:00Z" },
    ];
    const history = vi.fn(async (reviewId: string) => ({ ok: true as const, data: [{ id: `attempt-${reviewId}`, reviewId, challengeId: "challenge-1", feature: `Historial ${reviewId}`, status: "completed" as const, hintsUsed: 0, attemptedAt: "2026-11-02T01:00:00Z" }] }));
    const api = { reviews: async () => ({ ok: true, data: reviews }), history } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} initialReviewId="review-b" />));
      expect(container.querySelector<HTMLSelectElement>("#trainer-review")?.value).toBe("review-b");
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain("student/project-b");
      expect(history).toHaveBeenCalledWith("review-b");
      expect(container.querySelector(".trainer-history__list")?.textContent).toContain("Historial review-b");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("does not silently switch when the requested Review is unavailable", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const reviews = [
      { id: "review-a", owner: "student", repo: "project-a", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z" },
      { id: "review-b", owner: "student", repo: "project-b", commitSha: "b".repeat(40), updatedAt: "2026-11-02T00:00:00Z" },
    ];
    const history = vi.fn(async () => ({ ok: true as const, data: [] }));
    const api = { reviews: async () => ({ ok: true, data: reviews }), history } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} initialReviewId="missing-review" />));
      expect(container.querySelector<HTMLSelectElement>("#trainer-review")?.value).toBe("");
      expect(container.textContent).toContain("No encontramos esa Review entre tus análisis completados");
      expect(history).not.toHaveBeenCalled();
      expect(container.querySelector(".trainer-review-source")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("switches between labelled fake Reviews without mixing their source, context, history or challenge", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const fakeReviewA = { id: "fake-review-a", owner: "fake-student", repo: "fake-project-a", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z",
      academicContext: { missionTitle: "Fake misión A", missionVersion: 1, mentorContextVersion: 2, classroomTitle: "Fake aula A", requiredSkills: ["Fake habilidad A"] } };
    const fakeReviewB = { id: "fake-review-b", owner: "fake-student", repo: "fake-project-b", commitSha: "b".repeat(40), updatedAt: "2026-11-02T00:00:00Z",
      academicContext: { missionTitle: "Fake misión B", missionVersion: 3, mentorContextVersion: 4, classroomTitle: "Fake aula B", requiredSkills: ["Fake habilidad B"] } };
    const fakeHistoryA = { id: "fake-attempt-a", reviewId: fakeReviewA.id, challengeId: "fake-challenge-a", feature: "Fake historial A", status: "completed" as const, hintsUsed: 1, attemptedAt: "2026-11-01T01:00:00Z" };
    const fakeHistoryB = { id: "fake-attempt-b", reviewId: fakeReviewB.id, challengeId: "fake-challenge-b", feature: "Fake historial B", status: "pending" as const, hintsUsed: 2, attemptedAt: "2026-11-02T01:00:00Z" };
    const fakeChallengeA = { id: "fake-challenge-a", reviewId: fakeReviewA.id, projectId: "fake-project-a", commitSha: fakeReviewA.commitSha,
      feature: "Fake reto A", task: "Observa el caso fake A.", expectedObservation: "La observación fake A coincide.", restoration: "Restaura el caso fake A.", estimatedMinutes: 5,
      sourcePath: "src/fake-a.ts", sourceLines: [1, 2], hints: ["Fake pista A1", "Fake pista A2", "Fake pista A3"], createdAt: "2026-11-01T02:00:00Z" };
    const fakeChallengeB = { ...fakeChallengeA, id: "fake-challenge-b", reviewId: fakeReviewB.id, projectId: "fake-project-b", commitSha: fakeReviewB.commitSha,
      feature: "Fake reto B", task: "Observa el caso fake B.", expectedObservation: "La observación fake B coincide.", restoration: "Restaura el caso fake B.", sourcePath: "src/fake-b.ts" };
    const history = vi.fn(async (reviewId: string) => ({ ok: true as const, data: reviewId === fakeReviewA.id ? [fakeHistoryA] : [fakeHistoryB] }));
    const draw = vi.fn(async (reviewId: string) => ({ ok: true as const, data: { challenge: reviewId === fakeReviewA.id ? fakeChallengeA : fakeChallengeB, category: "new" as const, bankSize: 1 } }));
    const api = { reviews: async () => ({ ok: true, data: [fakeReviewA, fakeReviewB] }), history, draw } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      const select = container.querySelector<HTMLSelectElement>("#trainer-review")!;
      expect(select.value).toBe(fakeReviewA.id);
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain(fakeReviewA.repo);
      expect(container.querySelector(".trainer-academic-context")?.textContent).toContain("Fake habilidad A");
      expect(container.querySelector(".trainer-history__list")?.textContent).toContain("Fake historial A");
      expect(history).toHaveBeenNthCalledWith(1, fakeReviewA.id);

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      expect(draw).toHaveBeenNthCalledWith(1, fakeReviewA.id);
      expect(container.querySelector(".trainer-challenge")?.textContent).toContain("Fake reto A");

      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, fakeReviewB.id);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(select.value).toBe(fakeReviewB.id);
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain(fakeReviewB.repo);
      expect(container.querySelector(".trainer-review-source")?.textContent).toContain(fakeReviewB.commitSha);
      expect(container.querySelector(".trainer-academic-context")?.textContent).toContain("Fake habilidad B");
      expect(container.querySelector(".trainer-history__list")?.textContent).toContain("Fake historial B");
      expect(container.querySelector(".trainer-history__list")?.textContent).not.toContain("Fake historial A");
      expect(container.querySelector(".trainer-challenge")).toBeNull();
      expect(history).toHaveBeenNthCalledWith(2, fakeReviewB.id);

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      expect(draw).toHaveBeenNthCalledWith(2, fakeReviewB.id);
      expect(container.querySelector(".trainer-challenge")?.textContent).toContain("Fake reto B");
      expect(container.querySelector(".trainer-challenge")?.textContent).not.toContain("Fake reto A");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("distinguishes history loading and failure, and retries until a successful empty result", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    let finishFirst!: (result: { ok: false; error: { code: string; message: string } }) => void;
    const history = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, data: [] });
    const api = {
      reviews: async () => ({ ok: true, data: [{ id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z" }] }),
      history,
    } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      expect(container.querySelector('[role="status"]')?.textContent).toContain("Cargando el historial de práctica");
      expect(container.querySelector(".trainer-history__heading span")?.textContent).toBe("Cargando…");
      expect(container.textContent).not.toContain("Aún no hay intentos registrados");
      await act(async () => finishFirst({ ok: false, error: { code: "OFFLINE", message: "Historial no disponible" } }));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("Historial no disponible");
      expect(container.textContent).not.toContain("Aún no hay intentos registrados");
      const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar historial");
      expect(retry).not.toBeUndefined();
      await act(async () => retry!.click());
      expect(history).toHaveBeenCalledTimes(2);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("No pudimos cargar el historial");
      expect(container.textContent).not.toContain("Aún no hay intentos registrados");
      const retryAgain = [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar historial");
      await act(async () => retryAgain!.click());
      expect(history).toHaveBeenCalledTimes(3);
      expect(container.textContent).toContain("Aún no hay intentos registrados para esta revisión y sesión.");
      expect(container.querySelector('[role="alert"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("shows the linked mission and required skills for this student's Review", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const api = {
      reviews: async () => ({ ok: true, data: [{ id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00Z",
        academicContext: { missionTitle: "Programación Móvil", missionVersion: 2, mentorContextVersion: 3, classroomTitle: "Programación Móvil Terceros", requiredSkills: ["Navegación", "Componentes"] } }] }),
      history: async () => ({ ok: true, data: [] }),
    } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      expect(container.textContent).toContain("Misión vinculada");
      expect(container.textContent).toContain("Programación Móvil · v2");
      expect(container.textContent).toContain("Contexto Mentor v3");
      expect(container.textContent).toContain("Navegación");
      expect(container.textContent).toContain("Componentes");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("continues from a recorded source-grounded challenge to the next real challenge", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const review = { id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-23T10:00:00Z",
      academicContext: { missionTitle: "Programación Móvil", missionVersion: 2, mentorContextVersion: 3, classroomTitle: "Programación Móvil Terceros", requiredSkills: ["Navegación"] } };
    const firstChallenge = { id: "challenge-a", reviewId: review.id, projectId: "project-1", commitSha: review.commitSha,
      feature: "Filtro de tareas", task: "Sigue el flujo del filtro y conserva la lista original.", expectedObservation: "La lista visible cambia y la fuente permanece intacta.",
      restoration: "Restaura el estado inicial del filtro.", estimatedMinutes: 12, sourcePath: "src/tasks/filter.ts", sourceLines: [12, 24],
      hints: ["Busca el estado del filtro.", "Revisa dónde se copia la lista.", "Compara el origen y el resultado."], createdAt: "2026-11-23T10:00:00Z" };
    const nextChallenge = { ...firstChallenge, id: "challenge-b", feature: "Paginación", task: "Sigue la actualización de página sin perder el filtro.", sourcePath: "src/tasks/pagination.ts", sourceLines: [30, 42] };
    const historyItem = { id: "attempt-1", reviewId: review.id, challengeId: firstChallenge.id, feature: firstChallenge.feature,
      status: "in_progress" as const, hintsUsed: 1, attemptedAt: "2026-11-23T10:05:00Z" };
    const draw = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { challenge: firstChallenge, category: "new", bankSize: 2 } })
      .mockResolvedValueOnce({ ok: true, data: { challenge: nextChallenge, category: "pending", bankSize: 2 } });
    const record = vi.fn().mockResolvedValue({ ok: true, data: historyItem });
    const api = {
      reviews: async () => ({ ok: true, data: [review] }),
      history: async () => ({ ok: true, data: [] }),
      draw,
      record,
    } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      expect(container.textContent).toContain("demo");
      expect(container.textContent).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      expect(container.textContent).toContain("Navegación");
      expect(container.querySelector('[aria-label="Siguiente paso"]')).toBeNull();

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      expect(draw).toHaveBeenCalledExactlyOnceWith(review.id);
      expect(container.textContent).toContain(firstChallenge.feature);
      expect(container.textContent).toContain(firstChallenge.expectedObservation);
      expect(container.textContent).toContain(`${firstChallenge.sourcePath}:12–24`);
      expect(container.textContent).toContain(`commit ${review.commitSha.slice(0, 7)}`);
      expect(container.textContent).not.toContain("Siguiente reto");

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Mostrar pista 1")!.click());
      expect(container.textContent).toContain("Busca el estado del filtro.");
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "En progreso")!.click());
      expect(record).toHaveBeenCalledOnce();
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ reviewId: review.id, challengeId: firstChallenge.id, status: "in_progress", hintsUsed: 1 }));
      expect(record.mock.calls[0]?.[0].idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(container.textContent).toContain("Filtro de tareas");
      expect(container.textContent).toContain("Historial de práctica");
      expect(container.textContent).toContain("En progreso");
      const nextStep = container.querySelector<HTMLElement>('[aria-label="Siguiente paso"]');
      expect(nextStep?.textContent).toContain("Intento guardado");
      const nextButton = [...(nextStep?.querySelectorAll("button") ?? [])].find((button) => button.textContent === "Volver a sortear desde este análisis");
      expect(nextButton).toBeTruthy();

      await act(async () => nextButton?.click());
      expect(draw).toHaveBeenCalledTimes(2);
      expect(draw).toHaveBeenNthCalledWith(2, review.id);
      expect(container.textContent).toContain("Paginación");
      expect(container.textContent).toContain("src/tasks/pagination.ts:30–42");
      expect(container.querySelector('[aria-label="Siguiente paso"]')?.textContent).toContain("Registra cómo te fue");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("recovers from a rejected redraw without losing the current challenge or history", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const review = { id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-23T10:00:00Z" };
    const challenge = { id: "challenge-a", reviewId: review.id, projectId: "project-1", commitSha: review.commitSha,
      feature: "Filtro de tareas", task: "Sigue el flujo del filtro.", expectedObservation: "La lista visible cambia.", restoration: "Restaura el filtro.", estimatedMinutes: 12,
      sourcePath: "src/tasks/filter.ts", sourceLines: [12, 24], hints: ["Busca el filtro.", "Sigue el estado.", "Compara el resultado."], createdAt: "2026-11-23T10:00:00Z" };
    const nextChallenge = { ...challenge, id: "challenge-b", feature: "Paginación", sourcePath: "src/tasks/page.ts", sourceLines: [30, 42] };
    const attempt = { id: "attempt-1", reviewId: review.id, challengeId: challenge.id, feature: challenge.feature, status: "in_progress" as const, hintsUsed: 1, attemptedAt: "2026-11-23T10:05:00Z" };
    const draw = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { challenge, category: "new", bankSize: 2 } })
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, data: { challenge: nextChallenge, category: "pending", bankSize: 2 } });
    const record = vi.fn().mockResolvedValue({ ok: true, data: attempt });
    const history = vi.fn().mockResolvedValue({ ok: true, data: [] });
    const api = { reviews: async () => ({ ok: true, data: [review] }), history, draw, record } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Mostrar pista 1")!.click());
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "En progreso")!.click());
      expect(container.textContent).toContain("Filtro de tareas");
      expect(container.textContent).toContain("Busca el filtro.");
      expect(container.textContent).toContain("En progreso");
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ reviewId: review.id, challengeId: challenge.id, status: "in_progress", hintsUsed: 1 }));

      const redraw = [...container.querySelectorAll("button")].find((button) => button.textContent === "Volver a sortear desde este análisis")!;
      await act(async () => redraw.click());

      expect(container.querySelector(".trainer-challenge")?.textContent).toContain("Filtro de tareas");
      expect(container.textContent).toContain("Busca el filtro.");
      expect(container.textContent).toContain("En progreso");
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("No pudimos sortear");
      const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "Volver a sortear desde este análisis");
      expect(retry?.disabled).toBe(false);
      await act(async () => retry?.click());
      expect(draw).toHaveBeenCalledTimes(3);
      expect(record).toHaveBeenCalledOnce();
      expect(container.querySelector(".trainer-challenge")?.textContent).toContain("Paginación");
      expect(container.querySelector('[role="alert"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("retries an ambiguous progress write with the identical idempotency key and payload", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const review = { id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-23T10:00:00Z" };
    const challenge = { id: "challenge-a", reviewId: review.id, projectId: "project-1", commitSha: review.commitSha,
      feature: "Filtro de tareas", task: "Sigue el flujo del filtro.", expectedObservation: "La lista visible cambia.", restoration: "Restaura el filtro.", estimatedMinutes: 12,
      sourcePath: "src/tasks/filter.ts", sourceLines: [12, 24], hints: ["Busca el filtro.", "Sigue el estado.", "Compara el resultado."], createdAt: "2026-11-23T10:00:00Z" };
    const previousAttempt = { id: "attempt-old", reviewId: review.id, challengeId: "older-challenge", feature: "Inicio", status: "completed" as const, hintsUsed: 1, attemptedAt: "2026-11-22T10:00:00Z" };
    const persistedAttempt = { id: "attempt-new", reviewId: review.id, challengeId: challenge.id, feature: challenge.feature, status: "in_progress" as const, hintsUsed: 0, attemptedAt: "2026-11-23T10:05:00Z" };
    const history = vi.fn().mockResolvedValue({ ok: true, data: [previousAttempt] });
    const draw = vi.fn().mockResolvedValue({ ok: true, data: { challenge, category: "new", bankSize: 2 } });
    const record = vi.fn()
      .mockRejectedValueOnce(new Error("connection dropped"))
      .mockResolvedValueOnce({ ok: true, data: persistedAttempt });
    const api = { reviews: async () => ({ ok: true, data: [review] }), history, draw, record } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "En progreso")!.click());

      expect(record).toHaveBeenCalledOnce();
      expect(container.querySelector(".trainer-challenge")?.textContent).toContain("Filtro de tareas");
      expect(container.textContent).toContain("Inicio");
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("No pudimos confirmar");
      const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar registro");
      expect(retry).toBeTruthy();
      expect([...container.querySelectorAll<HTMLButtonElement>(".trainer-actions button")].every((button) => button.disabled)).toBe(true);

      await act(async () => retry?.click());
      expect(history).toHaveBeenCalledOnce();
      expect(record).toHaveBeenCalledTimes(2);
      expect(record.mock.calls[0]?.[0]).toBe(record.mock.calls[1]?.[0]);
      expect(record.mock.calls[0]?.[0]).toMatchObject({
        reviewId: review.id,
        challengeId: challenge.id,
        status: "in_progress",
        hintsUsed: 0,
      });
      expect(record.mock.calls[0]?.[0].idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(container.textContent).toContain("Completado por ti");
      expect(container.textContent).toContain("En progreso");
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect([...container.querySelectorAll<HTMLButtonElement>(".trainer-actions button")].every((button) => button.disabled)).toBe(true);
      await act(async () => [...container.querySelectorAll<HTMLButtonElement>(".trainer-actions button")][0]?.click());
      expect(record).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("does not duplicate an idempotent attempt when history retry wins the race", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const review = { id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-23T10:00:00Z" };
    const challenge = { id: "challenge-a", reviewId: review.id, projectId: "project-1", commitSha: review.commitSha,
      feature: "Filtro de tareas", task: "Sigue el flujo del filtro.", expectedObservation: "La lista visible cambia.", restoration: "Restaura el filtro.", estimatedMinutes: 12,
      sourcePath: "src/tasks/filter.ts", sourceLines: [12, 24], hints: ["Busca el filtro.", "Sigue el estado.", "Compara el resultado."], createdAt: "2026-11-23T10:00:00Z" };
    const persistedAttempt = { id: "attempt-shared", reviewId: review.id, challengeId: challenge.id, feature: challenge.feature, status: "in_progress" as const, hintsUsed: 0, attemptedAt: "2026-11-23T10:05:00Z" };
    const history = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "OFFLINE", message: "Historial no disponible" } })
      .mockResolvedValueOnce({ ok: true, data: [persistedAttempt] });
    const draw = vi.fn().mockResolvedValue({ ok: true, data: { challenge, category: "new", bankSize: 2 } });
    const record = vi.fn()
      .mockRejectedValueOnce(new Error("response lost after persistence"))
      .mockResolvedValueOnce({ ok: true, data: persistedAttempt });
    const api = { reviews: async () => ({ ok: true, data: [review] }), history, draw, record } as never;
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<TrainerScreen api={api} />));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("Historial no disponible");
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sortear reto"))!.click());
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "En progreso")!.click());
      expect(record).toHaveBeenCalledOnce();

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar historial")!.click());
      expect(container.querySelectorAll(".trainer-history__list li")).toHaveLength(1);
      expect(container.querySelector(".trainer-history__list")?.textContent).toContain("Filtro de tareas");

      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Reintentar registro")!.click());
      expect(record).toHaveBeenCalledTimes(2);
      expect(container.querySelectorAll(".trainer-history__list li")).toHaveLength(1);
      expect(container.textContent).toContain("Progreso guardado: en progreso.");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
