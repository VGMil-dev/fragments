import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses a server-only database path and reports auth disabled without a Better Auth secret", () => {
    const config = loadConfig({ API_PORT: "4312", DATABASE_URL: "file:./private.sqlite" });

    expect(config.port).toBe(4312);
    expect(config.databasePath).toBe("./private.sqlite");
    expect(config.authEnabled).toBe(false);
    expect(config).toMatchObject({ betterAuthSecretConfigured: false, betterAuthUrl: "http://localhost:4312", publicAppUrl: "http://localhost:5173" });
    expect(JSON.stringify(config)).not.toContain("BETTER_AUTH_SECRET");
  });

  it("enables Better Auth by default when its secret is supplied", () => {
    expect(loadConfig({ BETTER_AUTH_SECRET: "a-better-auth-secret-with-at-least-32-characters" }).authEnabled).toBe(true);
  });

  it("requires a SQLite file URL and rejects unsupported database schemes", () => {
    expect(() => loadConfig({ DATABASE_URL: "postgres://localhost/db" })).toThrow("DATABASE_URL");
    expect(() => loadConfig({ DATABASE_URL: "file:./data.db?mode=memory" })).toThrow("DATABASE_URL");
  });

  it("keeps credentials out of config snapshots and parses optional pricing ceilings", () => {
    const config = loadConfig({
      AI_GATEWAY_API_KEY: "fake-secret-do-not-log",
      AI_GATEWAY_MODEL: "fixture/model",
      AI_GATEWAY_PROVIDER_ONLY: "fixture-provider",
      AI_GATEWAY_MAX_INPUT_USD_PER_MILLION: "1.25",
      AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION: "3.5",
      GITHUB_TOKEN: "fake-github-token-do-not-log",
    });
    expect(config).toMatchObject({ githubTokenConfigured: true, aiGatewayKeyConfigured: true, aiGatewayModel: "fixture/model", aiGatewayProviderOnly: "fixture-provider", aiGatewayMaxInputUsdPerMillion: 1.25, aiGatewayMaxOutputUsdPerMillion: 3.5 });
    expect(JSON.stringify(config)).not.toContain("fake-secret-do-not-log");
    expect(JSON.stringify(config)).not.toContain("fake-github-token-do-not-log");
  });

  it("rejects invalid ports and refuses auth activation without a Better Auth secret", () => {
    expect(() => loadConfig({ API_PORT: "0" })).toThrow();
    expect(() => loadConfig({ AUTH_ENABLED: "true" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadConfig({ BETTER_AUTH_SECRET: "short" })).toThrow(/32 caracteres/);
    expect(() => loadConfig({ AI_GATEWAY_MAX_INPUT_USD_PER_MILLION: "0" })).toThrow(/AI_GATEWAY_MAX_INPUT_USD_PER_MILLION/);
    expect(() => loadConfig({ AI_GATEWAY_MODEL: "fixture/model", AI_GATEWAY_MAX_INPUT_USD_PER_MILLION: "1", AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION: "1" })).toThrow(/AI_GATEWAY_PROVIDER_ONLY/);
  });
});
