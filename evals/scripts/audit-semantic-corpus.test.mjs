import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditSemanticCorpus } from "./audit-semantic-corpus.mjs";
import FakeLocalReviewProvider from "../providers/fake-review-provider.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/fragments-test-commits.json", import.meta.url), "utf8"),
);

test("el corpus histórico A/B/C bloquea la comparación semántica por falta de respuestas completas", () => {
  const report = auditSemanticCorpus(fixture);

  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.blockedLabels, ["A", "B", "C"]);
  assert.equal(report.source, "evals/fixtures/fragments-test-commits.json");
  assert.match(report.reason, /No eligible complete Review output/);
  for (const item of report.cases) {
    assert.deepEqual(item.responseFields, []);
    assert.deepEqual(item.missingResponseFields, ["rubricVersion", "score", "findings", "limitations", "modelId", "inputDigest"]);
    assert.deepEqual(item.blockers, ["missing_persisted_output"]);
    assert.ok(item.fixtureFields.includes("verified"));
    assert.ok(item.fixtureFields.includes("notPresent"));
  }
  assert.equal(report.qualityComparison, "NOT_PERFORMED");
  assert.equal("qualityScore" in report, false);
});

test("el harness Review existente solo fija una respuesta sintética", () => {
  const provider = readFileSync(new URL("../providers/fake-review-provider.mjs", import.meta.url), "utf8");
  assert.match(provider, /modelId: "fake:review-fixture-v1"/);
  assert.match(provider, /score: 75/);
  assert.match(provider, /never validates repository meaning/);
});

test("un output completo del provider fake sigue bloqueado y nunca genera scoring de calidad", async () => {
  const fakeProvider = new FakeLocalReviewProvider();
  const fakeResult = await fakeProvider.callApi("", {
    vars: {
      fixture: "grounded",
      digest: "a".repeat(64),
      inputDigest: "b".repeat(64),
    },
  });
  const reviewOutput = {
    status: "completed",
    commitSha: fixture.cases[0].commitSha,
    analysis: JSON.parse(fakeResult.output),
  };
  const report = auditSemanticCorpus({
    ...fixture,
    cases: [{ ...fixture.cases[0], reviewOutput }],
  });

  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.cases[0].blockers, ["synthetic_model"]);
  assert.equal(report.qualityComparison, "NOT_PERFORMED");
  assert.equal("qualityScore" in report, false);
});

test("el validador detecta citas con forma inválida sin inferir si su contenido es verdadero", async () => {
  const fakeProvider = new FakeLocalReviewProvider();
  const fakeResult = await fakeProvider.callApi("", {
    vars: {
      fixture: "grounded",
      digest: "a".repeat(64),
      inputDigest: "b".repeat(64),
    },
  });
  const analysis = JSON.parse(fakeResult.output);
  analysis.findings[0].evidence[0].lines = [0, 99];
  const reviewOutput = { status: "completed", commitSha: fixture.cases[0].commitSha, analysis };
  const report = auditSemanticCorpus({ ...fixture, cases: [{ ...fixture.cases[0], reviewOutput }] });

  assert.ok(report.cases[0].blockers.includes("synthetic_model"));
  assert.ok(report.cases[0].blockers.includes("invalid_citation_shape"));
  assert.equal(report.cases[0].citationValidation, "SHAPE_ONLY");
  assert.equal(report.qualityComparison, "NOT_PERFORMED");
});
