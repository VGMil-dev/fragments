import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { SqliteAiBudgetLedger } from "./budget-ledger.js";
import { createGatewayInspectorProvider } from "./gateway-inspector-provider.js";

const databases: DatabaseSync[] = [];
function makeLedger() { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return new SqliteAiBudgetLedger(db); }
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

const evidenceExcerpt = "src/lost-items.ts\n1: return items.filter((item) => item.name.toLowerCase().includes(query));";
const output = {
  groundingQuote: "item.name.toLowerCase().includes(query)",
  precondition: "La lista está filtrada por el nombre en minúsculas.",
  mutation: "Invierte temporalmente el resultado de esta condición para comprobar qué elementos aparecen.",
  demonstration: "Busca un nombre que coincida y compara el resultado antes y durante el cambio.",
  restoration: "Restaura la condición original y confirma que vuelve a aparecer el elemento esperado.",
  estimatedMinutes: 15,
  teacherHint: "La llamada a includes determina la coincidencia.",
};

describe("Gateway Inspector adapter (labelled offline generation)", () => {
  it("requires an exact quote from verified source lines and reserves/settles cost", async () => {
    const generate = vi.fn(async ({ prompt }: { prompt: string }) => ({ value: output, costUsd: 0.0001 }));
    const provider = createGatewayInspectorProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 }, ledger: makeLedger(), generate });
    const challenge = await provider.createChallenge({
      commitSha: "a".repeat(40), evidenceExcerpt,
      evidence: { path: "src/lost-items.ts", lines: [1, 1], digest: "b".repeat(64) },
      findingReason: "El filtro compara el nombre en minúsculas.",
      practicedFeatures: ["Búsqueda por nombre"],
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0].prompt).toContain(evidenceExcerpt);
    expect(generate.mock.calls[0]?.[0].prompt).toContain("Búsqueda por nombre");
    expect(challenge.teacherHint).toContain("includes");
  });

  it("rejects a quote not present in verified source and blocks secrets", async () => {
    const ledger = makeLedger();
    const badQuote = createGatewayInspectorProvider({ modelId: "fixture/model", gatewayKeyConfigured: true, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 }, ledger,
      generate: async () => ({ value: { ...output, groundingQuote: "different method()" }, costUsd: 0.0001 }) });
    await expect(badQuote.createChallenge({ commitSha: "a".repeat(40), evidenceExcerpt, evidence: { path: "src/lost-items.ts", lines: [1, 1], digest: "b".repeat(64) }, findingReason: "Verified." })).rejects.toThrow(/no cita literalmente/);
    await expect(badQuote.createChallenge({ commitSha: "a".repeat(40), evidenceExcerpt: "src/key.ts\n1: const key = 'ghp_123456789012345678901234';", evidence: { path: "src/key.ts", lines: [1, 1], digest: "b".repeat(64) }, findingReason: "Verified." })).rejects.toThrow(/no está permitida/);
  });
});
