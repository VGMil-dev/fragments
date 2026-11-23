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
    expect(html).toContain("Entrenamiento");
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
      expect(container.querySelector("h1")?.textContent).toBe("Entrenamiento");
      expect(container.textContent).toContain("Tu entrenamiento empieza con una revisión");
      expect(container.querySelector(".trainer-empty-state")).not.toBeNull();
      expect(container.querySelector(".trainer-controls")).toBeNull();
      expect(container.querySelector(".trainer-history")).toBeNull();
      expect(container.querySelector(".trainer-empty-state img")).toBeNull();
      expect(container.querySelector(".trainer-empty-state svg[aria-hidden='true']")).not.toBeNull();
      expect(container.textContent).toContain("LABORATORIO SIN REVISIÓN ACTIVA");
      expect(container.textContent).toContain("La autoevaluación guiada está en preparación");
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
