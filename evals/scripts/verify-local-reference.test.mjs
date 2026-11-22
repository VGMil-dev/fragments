import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyLocalReferenceCorpus } from "./verify-local-reference.mjs";

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
    assert.equal(result.semanticValidity, "NOT_VALIDATED");
  } finally {
    rmSync(repo.root, { recursive: true, force: true });
  }
});
