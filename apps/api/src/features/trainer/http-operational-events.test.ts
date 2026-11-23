import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTrainerHttp } from "./http.js";

describe("Trainer operational attempt events", () => {
  const servers: Server[] = [];
  afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

  it("records only a bounded failure event when recording an attempt fails", async () => {
    const logEvent = vi.fn();
    const service = { async record() { throw new Error("private store detail"); }, async listReviews() { return []; } } as never;
    const server = createServer((request, response) => {
      void createTrainerHttp(service, async () => true, undefined, logEvent)(request, response);
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected test server address");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/trainer/attempts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewId: "review-private", challengeId: "challenge-private", status: "completed", hintsUsed: 1, idempotencyKey: "c8aa3e3e-f9e7-4e0d-8434-9d05a279e618" }),
    });
    expect(response.status).toBe(500);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent.mock.calls[0]?.[0]).toMatchObject({ event: "trainer.attempt.failed", stage: "attempt_record", result: "failure", error_code: "attempt_failed" });
    expect(Object.keys(logEvent.mock.calls[0]?.[0] as object).sort()).toEqual(["duration_ms", "error_code", "event", "occurredAt", "result", "stage"]);
    expect(JSON.stringify(logEvent.mock.calls[0]?.[0])).not.toContain("review-private");
    expect(JSON.stringify(logEvent.mock.calls[0]?.[0])).not.toContain("private store detail");
  });
});
