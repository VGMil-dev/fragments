import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses a server-only database path and reports auth disabled when no secret is configured", () => {
    const config = loadConfig({ API_PORT: "4312", DATABASE_URL: "file:./private.sqlite" });

    expect(config.port).toBe(4312);
    expect(config.databasePath).toBe("./private.sqlite");
    expect(config.authEnabled).toBe(false);
    expect(JSON.stringify(config)).not.toContain("SESSION_SECRET");
  });

  it("requires a SQLite file URL and rejects unsupported database schemes", () => {
    expect(() => loadConfig({ DATABASE_URL: "postgres://localhost/db" })).toThrow("DATABASE_URL");
    expect(() => loadConfig({ DATABASE_URL: "file:./data.db?mode=memory" })).toThrow("DATABASE_URL");
  });

  it("rejects invalid ports and refuses auth activation without a session secret", () => {
    expect(() => loadConfig({ API_PORT: "0" })).toThrow();
    expect(() => loadConfig({ AUTH_ENABLED: "true" })).toThrow(/SESSION_SECRET/);
  });
});
