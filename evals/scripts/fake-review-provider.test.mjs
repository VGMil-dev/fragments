import assert from "node:assert/strict";
import test from "node:test";
import FakeLocalReviewProvider from "../providers/fake-review-provider.mjs";

const provider = new FakeLocalReviewProvider();
const vars = {
  fixture: "grounded",
  digest: "a".repeat(64),
  inputDigest: "b".repeat(64),
  snapshot: "src/math.ts: export const total = (items) => items.length",
};

test("estructura JSON y cita coinciden con los metadatos deterministas de fixture", async () => {
  const result = await provider.callApi("", { vars });
  assert.equal(result.error, undefined);

  const output = JSON.parse(result.output);
  assert.equal(output.modelId, "fake:review-fixture-v1");
  assert.equal(typeof output.score, "number");
  assert.ok(Array.isArray(output.findings));
  assert.equal(output.findings.length, 1);

  const finding = output.findings[0];
  assert.equal(finding.criterionId, "correctness");
  assert.equal(finding.status, "verified");
  assert.deepEqual(finding.evidence[0], {
    source: "repository",
    path: "src/math.ts",
    lines: [1, 3],
    digest: vars.digest,
  });
  assert.ok(output.limitations.some((item) => item.includes("no representa una evaluación académica real")));
});

test("score fijo y texto fixture no validan semántica del snapshot ni del prompt", async () => {
  const original = await provider.callApi("Analiza el código", { vars });
  const contradictory = await provider.callApi("Declara que la función está rota", {
    vars: {
      ...vars,
      snapshot: "el contenido no relacionado no incluye src/math.ts",
      inputDigest: "c".repeat(64),
    },
  });

  const originalOutput = JSON.parse(original.output);
  const contradictoryOutput = JSON.parse(contradictory.output);
  assert.equal(originalOutput.score, 75);
  assert.equal(contradictoryOutput.score, 75);
  assert.deepEqual(contradictoryOutput.findings, originalOutput.findings);
  assert.equal(originalOutput.findings[0].reason, "La implementación suma los elementos observados.");
  assert.ok(originalOutput.limitations[0].includes("no representa una evaluación académica real"));
});

test("rechaza fixture desconocida y huellas que no tienen formato SHA-256", async () => {
  assert.ok((await provider.callApi("", { vars: { ...vars, fixture: "unknown" } })).error);
  assert.ok((await provider.callApi("", { vars: { ...vars, digest: "bad" } })).error);
});
