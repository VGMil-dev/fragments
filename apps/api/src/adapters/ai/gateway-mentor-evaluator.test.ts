import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { SqliteAiBudgetLedger } from "./budget-ledger.js";
import { createGatewayMentorEvaluator } from "./gateway-mentor-evaluator.js";

const databases: DatabaseSync[] = [];
function makeLedger() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  migrate(database);
  return new SqliteAiBudgetLedger(database);
}
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

const proposal = {
  title: "Huerto de aula",
  problem: "El curso no puede registrar el crecimiento de sus plantas en un sitio común.",
  solution: "Una aplicación permite registrar medidas y consultar el progreso semanal.",
  goals: ["Registrar medidas"],
  skills: ["TypeScript"],
  scope: "Una pantalla registra y consulta las medidas del cultivo.",
  constraints: ["No recopila datos personales"],
};
const generated = {
  score: 74,
  findings: [{ criterionId: "scope", status: "verified" as const, evidence: [{ field: "scope" }], reason: "El alcance describe dos acciones observables.", guidanceLevel: 1 }],
  limitations: ["La evaluación es orientativa."],
  guidance: ["¿Qué mostrarás en la primera demostración?"] ,
};

describe("Gateway Mentor evaluator (labelled offline generation)", () => {
  it("validates structured feedback, adds local evidence digest, and settles the cost receipt", async () => {
    const generate = vi.fn(async ({ modelId }: { modelId: string }) => ({ value: generated, costUsd: 0.0004 }));
    const ledger = makeLedger();
    const evaluator = createGatewayMentorEvaluator({
      modelId: "fixture/model",
      gatewayKeyConfigured: true,
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      ledger,
      generate,
    });

    const result = await evaluator.evaluate({ proposal, proposalDigest: "a".repeat(64) });

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0].modelId).toBe("fixture/model");
    expect(result).toMatchObject({
      rubricVersion: "mentor-gateway-v1",
      score: 74,
      modelId: "fixture/model",
      inputDigest: "a".repeat(64),
      findings: [{ evidence: [{ source: "proposal", field: "scope", digest: "a".repeat(64) }] }],
      guidance: ["¿Qué mostrarás en la primera demostración?"],
    });
    expect(ledger.summary()).toMatchObject({ settledMicroUsd: 400, blocked: false });
  });

  it("does not dispatch when model pricing is unavailable", async () => {
    const generate = vi.fn(async () => ({ value: generated, costUsd: 0 }));
    const evaluator = createGatewayMentorEvaluator({ modelId: "fixture/model", gatewayKeyConfigured: true, ledger: makeLedger(), generate });
    await expect(evaluator.evaluate({ proposal, proposalDigest: "b".repeat(64) })).rejects.toThrow(/garantizar una reserva/);
    expect(generate).not.toHaveBeenCalled();
  });
});
