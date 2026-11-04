import { describe, expect, it, vi } from "vitest";
import { toAsyncState } from "./use-api-request";

describe("toAsyncState", () => {
  it("maps an API error to a recoverable state without carrying the server message", () => {
    const retry = vi.fn();

    const state = toAsyncState(
      { ok: false, error: { code: "PRIVATE_FAILURE", message: "internal token=secret" } },
      retry,
    );

    expect(state).toEqual({ status: "error", retry });
    expect(JSON.stringify(state)).not.toContain("secret");
  });

  it("uses an explicit emptiness check for collection responses", () => {
    const state = toAsyncState({ ok: true, data: [] as string[] }, vi.fn());

    expect(state).toEqual({ status: "empty" });
  });

  it("preserves validated success data without adding academic results", () => {
    const data = { label: "Proyecto de prueba" };
    const state = toAsyncState({ ok: true, data }, vi.fn());

    expect(state).toEqual({ status: "success", data });
  });
});
