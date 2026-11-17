import { describe, expect, it, vi } from "vitest";
import { createSafeBetterAuthLogger } from "./auth-diagnostics.js";

describe("safe Better Auth diagnostics", () => {
  it("preserves a known OAuth category without serializing nested error data", () => {
    const write = vi.fn<(line: string) => void>();
    const logger = createSafeBetterAuthLogger(write);
    const nested = Object.assign(new Error("FAKE_OAUTH_CODE_NESTED"), {
      code: "state_mismatch",
      details: { state: "FAKE_OAUTH_STATE_NESTED", headers: { cookie: "FAKE_OAUTH_COOKIE_NESTED" } },
      cause: Object.assign(new Error("FAKE_OAUTH_TOKEN_NESTED"), { token: "FAKE_OAUTH_TOKEN_NESTED" }),
    });

    logger.log("error", "FAKE_OAUTH_MESSAGE", nested);

    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(write.mock.calls[0]![0])).toEqual({ event: "auth.diagnostic", level: "error", code: "state_mismatch" });
    expect(write.mock.calls[0]![0]).not.toMatch(/FAKE_OAUTH_(?:CODE|STATE|COOKIE|TOKEN|MESSAGE)/);
  });

  it("keeps warnings observable and maps unknown exceptions to a fixed category", () => {
    const write = vi.fn<(line: string) => void>();
    const logger = createSafeBetterAuthLogger(write);

    logger.log("warn", "FAKE_OAUTH_WARNING", new Error("FAKE_OAUTH_CODE_WARNING"));

    expect(JSON.parse(write.mock.calls[0]![0])).toEqual({ event: "auth.diagnostic", level: "warn", code: "AUTH_WARNING" });
    expect(write.mock.calls[0]![0]).not.toContain("FAKE_OAUTH");
  });
});
