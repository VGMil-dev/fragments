// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createTrainerApi } from "../../lib/api/trainer-api";
import { TrainerScreen } from "./TrainerScreen";

describe("TrainerScreen", () => {
  it("shows the student practice entry point without inventing a Review or a challenge", () => {
    const html = renderToStaticMarkup(<TrainerScreen api={createTrainerApi()} />);
    expect(html).toContain("No memorices el reto. Domina tu código.");
    expect(html).toContain("Sortear reto");
    expect(html).toContain("Historial de práctica");
    expect(html).toContain("Buscando análisis completados");
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
});
