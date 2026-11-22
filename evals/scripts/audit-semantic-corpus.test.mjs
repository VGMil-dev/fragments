import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditSemanticCorpus } from "./audit-semantic-corpus.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/fragments-test-commits.json", import.meta.url), "utf8"),
);

test("el corpus histórico A/B/C bloquea la comparación semántica por falta de respuestas completas", () => {
  const report = auditSemanticCorpus(fixture);

  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.blockedLabels, ["A", "B", "C"]);
  assert.equal(report.source, "evals/fixtures/fragments-test-commits.json");
  assert.match(report.reason, /No complete persisted Review output/);
  for (const item of report.cases) {
    assert.deepEqual(item.responseFields, []);
    assert.deepEqual(item.missingResponseFields, ["rubricVersion", "score", "findings", "modelId", "inputDigest"]);
    assert.ok(item.fixtureFields.includes("verified"));
    assert.ok(item.fixtureFields.includes("notPresent"));
  }
});

test("el harness Review existente solo fija una respuesta sintética", () => {
  const provider = readFileSync(new URL("../providers/fake-review-provider.mjs", import.meta.url), "utf8");
  assert.match(provider, /modelId: "fake:review-fixture-v1"/);
  assert.match(provider, /score: 75/);
  assert.match(provider, /never validates repository meaning/);
});
