import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditSemanticCorpus, validateCitationsAgainstSnapshot } from "./audit-semantic-corpus.mjs";
import FakeLocalReviewProvider from "../providers/fake-review-provider.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/fragments-test-commits.json", import.meta.url), "utf8"),
);

function snapshotFixture() {
  const content = "export function total(values) {\n  return values.reduce((a, b) => a + b, 0);\n}";
  const blob = Buffer.from(content, "utf8");
  const fileSha = createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${blob.length}\0`), blob])).digest("hex");
  const snapshot = {
    owner: "fixture-owner",
    repo: "fixture-repo",
    commitSha: "a".repeat(40),
    files: [{ path: "src/math.ts", content, sha: fileSha }],
  };
  const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
      : JSON.stringify(value);
  return { ...snapshot, digest: createHash("sha256").update(canonical(snapshot)).digest("hex") };
}

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

test("valida ruta, rango de líneas y digest contra un snapshot local sin inferir semántica", () => {
  const snapshot = snapshotFixture();
  const analysis = {
    findings: [{
      file: "src/math.ts",
      lines: [1, 2],
      evidence: [{ source: "repository", path: "src/math.ts", lines: [1, 3], digest: snapshot.digest }],
    }],
  };

  const valid = validateCitationsAgainstSnapshot(analysis, snapshot);
  assert.equal(valid.status, "SNAPSHOT_CITATIONS_MATCH");
  assert.equal(valid.citationsChecked, 1);
  assert.equal(valid.citationValidation, "SNAPSHOT_CHECKED_NO_SEMANTICS");

  const missingPath = structuredClone(analysis);
  missingPath.findings[0].evidence[0].path = "src/not-in-snapshot.ts";
  assert.ok(validateCitationsAgainstSnapshot(missingPath, snapshot).blockers.includes("citation_path_missing_from_snapshot"));

  const invalidLines = structuredClone(analysis);
  invalidLines.findings[0].evidence[0].lines = [2, 4];
  assert.ok(validateCitationsAgainstSnapshot(invalidLines, snapshot).blockers.includes("citation_lines_out_of_range"));

  const invalidDigest = structuredClone(analysis);
  invalidDigest.findings[0].evidence[0].digest = "b".repeat(64);
  assert.ok(validateCitationsAgainstSnapshot(invalidDigest, snapshot).blockers.includes("citation_snapshot_digest_mismatch"));

  const corruptedSnapshot = structuredClone(snapshot);
  corruptedSnapshot.files[0].content += "\n// altered";
  const corrupted = validateCitationsAgainstSnapshot(analysis, corruptedSnapshot);
  assert.ok(corrupted.blockers.includes("snapshot_digest_mismatch"));
  assert.ok(corrupted.blockers.includes("snapshot_file_sha_mismatch"));
});

test("el reporte aplica la comprobación de snapshot solo cuando se entrega evidencia local", async () => {
  const fakeResult = await new FakeLocalReviewProvider().callApi("", {
    vars: { fixture: "grounded", digest: "a".repeat(64), inputDigest: "b".repeat(64) },
  });
  const reviewOutput = { status: "completed", commitSha: fixture.cases[0].commitSha, analysis: JSON.parse(fakeResult.output) };
  const report = auditSemanticCorpus(
    { ...fixture, cases: [{ ...fixture.cases[0], reviewOutput }] },
    { snapshotsByCommit: { [fixture.cases[0].commitSha]: snapshotFixture() } },
  );

  assert.equal(report.cases[0].citationValidation, "SNAPSHOT_CHECKED_NO_SEMANTICS");
  assert.equal(report.cases[0].citationCheck.status, "BLOCKED");
  assert.ok(report.cases[0].blockers.includes("citation_snapshot_digest_mismatch"));
  assert.ok(report.cases[0].blockers.includes("synthetic_model"));
  assert.equal(report.qualityComparison, "NOT_PERFORMED");
});
