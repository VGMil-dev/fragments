// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InspectorChallengeRecordResponse } from "@fragments/contracts";
import { InspectorTeacherPanel } from "./InspectorTeacherPanel.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// FAKE INSPECTOR FIXTURE: synthetic review, commit, evidence and defense only.
const fakeRecord: InspectorChallengeRecordResponse = {
  id: "record-qa-1",
  reviewId: "review-qa-1",
  projectId: "project-qa-1",
  commitSha: "a".repeat(40),
  createdAt: "2026-11-23T10:00:00.000Z",
  assignedTo: "student-qa-1",
  assignedAt: "2026-11-23T10:05:00.000Z",
  status: "assigned",
  challenge: {
    evaluationId: "review-qa-1",
    sourceEvidence: [{ source: "repository", path: "src/filter.ts", lines: [12, 19], digest: "a".repeat(64) }],
    precondition: "El filtro conserva las tareas pendientes.",
    mutation: "Cambia temporalmente la condición del filtro.",
    demonstration: "Explica el resultado con un ejemplo del proyecto.",
    restoration: "Restaura la condición inicial del filtro.",
    estimatedMinutes: 18,
    teacherHint: "FAKE_PRIVATE_TEACHER_HINT",
  },
};

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(props: Parameters<typeof InspectorTeacherPanel>[0]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<InspectorTeacherPanel {...props} />));
  return container;
}

describe("InspectorTeacherPanel", () => {
  it("frames the assigned challenge as a defense and shows teacher guidance only when authorized", async () => {
    const view = await render({ record: fakeRecord, teacherAuthorized: true, onAssign: vi.fn(), onRecord: vi.fn() });
    expect(view.querySelector("h2")?.textContent).toContain("Sala de defensa");
    expect(view.textContent).toContain("review-qa-1");
    expect(view.textContent).toContain("project-qa-1");
    expect(view.textContent).toContain("a".repeat(40));
    expect(view.textContent).toContain("src/filter.ts, líneas 12–19");
    expect(view.textContent).toContain("Precondición");
    expect(view.textContent).toContain("Mutación inversa");
    expect(view.textContent).toContain("Demostración");
    expect(view.textContent).toContain("Restauración");
    expect(view.textContent).toContain("Tiempo estimado del reto: 18 min");
    expect(view.textContent).toContain("Registrar la defensa");
    expect(view.querySelector(".inspector-panel__private")?.textContent).toContain("FAKE_PRIVATE_TEACHER_HINT");
    expect(view.querySelector(".inspector-panel__private")?.textContent).toContain("Orientación privada para el docente");
    expect(view.textContent).not.toMatch(/\b(?:puntaje|puntuación|porcentaje|nivel|XP)\b/i);
  });

  it("shows only a persisted defense summary when the record has one", async () => {
    const completed: InspectorChallengeRecordResponse = {
      ...fakeRecord,
      status: "completed",
      defense: { mutationObserved: true, restorationConfirmed: true, notes: "FAKE_DEFENSE_NOTE", recordedAt: "2026-11-23T10:20:00.000Z" },
    };
    const view = await render({ record: completed, onAssign: vi.fn(), onRecord: vi.fn() });
    expect(view.textContent).toContain("Mutación explicada");
    expect(view.textContent).toContain("Restauración confirmada");
    expect(view.textContent).toContain("Sí");
    expect(view.textContent).not.toContain("FAKE_DEFENSE_NOTE");
    expect(view.textContent).not.toContain("FAKE_PRIVATE_TEACHER_HINT");
    expect(view.querySelector("form")).toBeNull();
    expect(view.querySelector("button")).toBeNull();
  });

  it("hides teacher guidance when the panel is not teacher-authorized", async () => {
    const view = await render({ record: fakeRecord, onAssign: vi.fn(), onRecord: vi.fn() });
    expect(view.textContent).not.toContain("FAKE_PRIVATE_TEACHER_HINT");
    expect(view.querySelector(".inspector-panel__private")).toBeNull();
  });

  it("keeps the empty state truthful and the existing Review navigation out of scope", async () => {
    const view = await render({ record: null, onAssign: vi.fn(), onRecord: vi.fn() });
    expect(view.textContent).toContain("Sala de defensa");
    expect(view.textContent).toContain("Carga una revisión para consultar evidencia y preparar una defensa.");
    expect(view.textContent).not.toMatch(/(?:puntaje|puntuación|porcentaje|reto activo)/i);
    expect(view.querySelector("form")).toBeNull();
  });

  it("preserves assign and defense handlers", async () => {
    const onAssign = vi.fn();
    const onRecord = vi.fn();
    const pending = { ...fakeRecord, status: "pending" as const };
    let view = await render({ record: pending, onAssign, onRecord });
    await act(async () => [...view.querySelectorAll("button")].find((button) => button.textContent === "Asignar reto")?.click());
    expect(onAssign).toHaveBeenCalledOnce();
    await act(async () => { root?.unmount(); root = undefined; view.remove(); });

    view = await render({ record: fakeRecord, teacherAuthorized: true, onAssign, onRecord });
    await act(async () => {
      const mutation = view.querySelector<HTMLInputElement>('input[name="mutationObserved"]');
      const restoration = view.querySelector<HTMLInputElement>('input[name="restorationConfirmed"]');
      if (mutation) mutation.checked = true;
      if (restoration) restoration.checked = true;
      view.querySelector<HTMLFormElement>("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onRecord).toHaveBeenCalledOnce();
    const submitted = onRecord.mock.calls[0]?.[0];
    expect(submitted?.get("mutationObserved")).toBe("true");
    expect(submitted?.get("restorationConfirmed")).toBe("true");
  });
});
