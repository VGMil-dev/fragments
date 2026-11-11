import { describe, expect, it, vi } from "vitest";
import { createResendPasswordResetEmailSender } from "./resend-password-reset.js";

describe("Resend password reset sender", () => {
  it("sends the one-time reset link with native fetch and does not inspect response bodies", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    const sender = createResendPasswordResetEmailSender({ apiKey: "test-resend-key", from: "Fragments <noreply@fragments.gavanti.org>", fetcher });

    await sender({ email: "teacher@example.test", url: "https://fragments.gavanti.org/teacher/reset-password#token=one-time-test-token" });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-resend-key");
    expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
      from: "Fragments <noreply@fragments.gavanti.org>",
      to: ["teacher@example.test"],
      text: expect.stringContaining("https://fragments.gavanti.org/teacher/reset-password#token=one-time-test-token"),
    }));
  });

  it("does not call Resend if configuration is incomplete or the provider rejects the message", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 401 }));
    const missing = createResendPasswordResetEmailSender({ apiKey: "", from: "", fetcher });
    await expect(missing({ email: "teacher@example.test", url: "https://example.test/reset?token=x" })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();

    const configured = createResendPasswordResetEmailSender({ apiKey: "test-resend-key", from: "Fragments <noreply@example.test>", fetcher });
    await expect(configured({ email: "teacher@example.test", url: "https://example.test/reset?token=x" })).rejects.toThrow();
  });
});
