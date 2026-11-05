import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { AiBudgetUnavailableError, SqliteAiBudgetLedger } from "./budget-ledger.js";
import { createGatewayReviewAiProvider } from "./gateway-review-provider.js";

const databases: DatabaseSync[] = [];
function makeLedger() { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return new SqliteAiBudgetLedger(db); }
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

const input = {
  packedText: "Commit exact sha\n### App.tsx\nexport default function App() { return null; }",
  snapshotFiles: [{ path: "App.tsx", content: "export default function App() { return null; }" }],
  rubricVersion: "review-test-v1",
  inputDigest: "a".repeat(64),
  snapshotDigest: "b".repeat(64),
  budget: { maxInputTokens: 10_000, maxOutputTokens: 1_000, signal: new AbortController().signal },
};
const result = {
  score: 72,
  findings: [{ criterionId: "app-entry", status: "verified" as const, evidence: [{ path: "App.tsx", quote: "export default function App()" }], reason: "La ruta contiene el punto de entrada observado.", guidanceLevel: 1 }],
  limitations: ["La evaluación es orientativa."],
};

describe("Gateway Review adapter (labelled offline generation)", () => {
  it("derives evidence digests and model metadata locally while settling the receipt", async () => {
    const generate = vi.fn(async ({ modelId }: { modelId: string }) => ({ value: result, costUsd: 0.0002 }));
    const provider = createGatewayReviewAiProvider({
      modelId: "fixture/model", gatewayKeyConfigured: true,
      rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 },
      ledger: makeLedger(), generate,
    });

    const analysis = await provider.analyze(input) as { modelId: string; inputDigest: string; findings: Array<{ evidence: Array<{ digest: string }> }> };
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0].prompt).toContain("no confiable");
    expect(analysis).toMatchObject({ modelId: "fixture/model", inputDigest: input.inputDigest });
    expect(analysis.findings[0]?.evidence[0]?.digest).toBe(input.snapshotDigest);
    expect(analysis.findings[0]?.evidence[0]).toMatchObject({ path: "App.tsx", lines: [1, 1] });
  });

  it("does not dispatch without a configured gateway key, model, or rate card", async () => {
    const generate = vi.fn(async () => ({ value: result, costUsd: 0 }));
    const provider = createGatewayReviewAiProvider({ gatewayKeyConfigured: false, ledger: makeLedger(), generate });
    await expect(provider.analyze(input)).rejects.toThrow(/no está configurada/);
    const configured = createGatewayReviewAiProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, ledger: makeLedger(), generate });
    await expect(configured.analyze(input)).rejects.toThrow(AiBudgetUnavailableError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("stops future calls when the Gateway receipt is unavailable", async () => {
    const ledger = makeLedger();
    const provider = createGatewayReviewAiProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 }, ledger,
      generate: async () => ({ value: result }) });
    await expect(provider.analyze(input)).rejects.toThrow(AiBudgetUnavailableError);
    expect(ledger.summary().blocked).toBe(true);
  });

  it("rejects quotes that are absent from the exact snapshot", async () => {
    const provider = createGatewayReviewAiProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 }, ledger: makeLedger(),
      generate: async () => ({ value: { ...result, findings: [{ ...result.findings[0]!, evidence: [{ path: "App.tsx", quote: "missing citation text" }] }] }, costUsd: 0 }) });
    await expect(provider.analyze(input)).rejects.toThrow(/no está presente/);
  });

  it("resolves repeated literal citations to every exact source line", async () => {
    const repeated = { ...input, snapshotFiles: [{ path: "App.tsx", content: "export default function App() { return null; }\nexport default function App() { return null; }" }] };
    const provider = createGatewayReviewAiProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 }, ledger: makeLedger(),
      generate: async () => ({ value: result, costUsd: 0 }) });
    const analysis = await provider.analyze(repeated) as { findings: Array<{ evidence: Array<{ lines: [number, number] }> }> };
    expect(analysis.findings[0]?.evidence.map(({ lines }) => lines)).toEqual([[1, 1], [2, 2]]);
  });

  it("maps a literal citation spanning adjacent snapshot lines to the full line range", async () => {
    const multiline = { ...input, snapshotFiles: [{ path: "App.tsx", content: "export function validate(input) {\n  return input.name.trim();\n}" }] };
    const citation = "export function validate(input) {\n  return input.name.trim();";
    const provider = createGatewayReviewAiProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 }, ledger: makeLedger(),
      generate: async () => ({ value: { ...result, findings: [{ ...result.findings[0]!, evidence: [{ path: "App.tsx", quote: citation }] }] }, costUsd: 0 }) });
    const analysis = await provider.analyze(multiline) as { findings: Array<{ evidence: Array<{ lines: [number, number] }> }> };
    expect(analysis.findings[0]?.evidence).toMatchObject([{ lines: [1, 2] }]);
  });
});
