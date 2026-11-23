import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { auditReferenceProgression, verifyLocalReferenceCorpus } from "./verify-local-reference.mjs";

function verifiedCase(label, behaviors) {
  return {
    label,
    commitSha: `${label.toLowerCase().charCodeAt(0).toString(16)}`.repeat(40),
    status: "REFERENCE_MARKERS_MATCH",
    checks: Object.entries(behaviors).map(([behaviorId, detectedPresent]) => ({
      behaviorId,
      expectedPresent: detectedPresent,
      detectedPresent,
      status: "MATCH",
    })),
  };
}

test("audita progresión A/B/C sin confundirla con validez semántica", () => {
  const result = auditReferenceProgression([
    verifiedCase("A", { required_validation: false, name_search: false, recovered_status: false }),
    verifiedCase("B", { required_validation: true, name_search: false, recovered_status: false }),
    verifiedCase("C", { required_validation: true, name_search: true, recovered_status: true }),
  ]);

  assert.equal(result.status, "REFERENCE_PROGRESSION_MATCH");
  assert.deepEqual(result.caseOrder, ["A", "B", "C"]);
  assert.deepEqual(result.behaviors.map(({ behaviorId, detectedPresent }) => ({ behaviorId, detectedPresent })), [
    { behaviorId: "name_search", detectedPresent: [false, false, true] },
    { behaviorId: "recovered_status", detectedPresent: [false, false, true] },
    { behaviorId: "required_validation", detectedPresent: [false, true, true] },
  ]);
  assert.equal(result.basis, "STATIC_SOURCE_MARKERS_ONLY");
  assert.equal(result.semanticValidity, "NOT_VALIDATED");
});

test("identifica regresión de marcador entre referencias verificadas", () => {
  const result = auditReferenceProgression([
    verifiedCase("A", { required_validation: false }),
    verifiedCase("B", { required_validation: true }),
    verifiedCase("C", { required_validation: false }),
  ]);

  assert.equal(result.status, "REFERENCE_PROGRESSION_MISMATCH");
  assert.deepEqual(result.regressions, [{ behaviorId: "required_validation", from: "B", to: "C" }]);
  assert.equal(result.semanticValidity, "NOT_VALIDATED");
});

function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), "fragments-reference-audit-"));
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "config", "user.name", "Fixture Author"]);
  execFileSync("git", ["-C", root, "config", "user.email", "fixture@example.test"]);
  mkdirSync(join(root, "src", "domain"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(join(root, "App.tsx"), [
    "import { validateLostItem, filterLostItems, markLostItemRecovered } from './src/domain/lost-items';",
    "const add = () => validateLostItem({ name, description });",
    "const visible = filterLostItems(items, query);",
    "const recover = () => markLostItemRecovered(items, id);",
  ].join("\n"));
  writeFileSync(join(root, "src", "domain", "lost-items.ts"), [
    "export function validateLostItem(form) { return !form.name.trim() && !form.description.trim(); }",
    "export function filterLostItems(items, query) { const normalizedQuery = query.trim().toLowerCase(); return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery)); }",
    "export function markLostItemRecovered(items, id) { return items.map((item) => item.id === id ? { ...item, status: 'recovered' } : item); }",
  ].join("\n"));
  writeFileSync(join(root, "tests", "reference.test.mjs"), "// Test source marker only; this file is never executed.\n");
  execFileSync("git", ["-C", root, "add", "App.tsx", "src/domain/lost-items.ts", "tests/reference.test.mjs"]);
  execFileSync("git", ["-C", root, "commit", "--quiet", "-m", "fixture"]);
  return { root, sha: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() };
}

test("verifica marcadores de referencia en el objeto Git local sin ejecutar fuentes", () => {
  const repo = fixtureRepo();
  try {
    const result = verifyLocalReferenceCorpus({
      repoPath: repo.root,
      cases: [{
        label: "fixture-machinery-only",
        commitSha: repo.sha,
        behaviorReference: { required_validation: true, name_search: true, recovered_status: true },
      }],
    });

    assert.equal(result.status, "REFERENCE_MARKERS_MATCH");
    assert.deepEqual(result.cases[0].checks.map((check) => check.status), ["MATCH", "MATCH", "MATCH"]);
    assert.equal(result.semanticValidity, "NOT_VALIDATED");
    assert.equal(result.execution, "SOURCE_NOT_EXECUTED");
  } finally {
    rmSync(repo.root, { recursive: true, force: true });
  }
});

test("separa discrepancia y referencia ausente de una coincidencia", () => {
  const repo = fixtureRepo();
  try {
    const result = verifyLocalReferenceCorpus({
      repoPath: repo.root,
      cases: [{ label: "fixture-machinery-only", commitSha: repo.sha, behaviorReference: { name_search: false } },
        { label: "missing-reference", commitSha: repo.sha }],
    });

    assert.equal(result.status, "BLOCKED");
    assert.equal(result.cases[0].checks[0].status, "MISMATCH");
    assert.deepEqual(result.cases[1].blockers, ["missing_behavior_reference"]);
    assert.equal(result.referenceProgression.status, "BLOCKED");
    assert.equal(result.semanticValidity, "NOT_VALIDATED");
  } finally {
    rmSync(repo.root, { recursive: true, force: true });
  }
});
