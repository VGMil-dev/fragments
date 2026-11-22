import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixturePath = new URL("../fixtures/fragments-test-commits.json", import.meta.url);

export function auditSemanticCorpus(corpus) {
  const cases = Array.isArray(corpus.cases) ? corpus.cases : [];
  const auditedCases = cases.map((item) => {
    const response = item.reviewOutput;
    const responseFields = response && typeof response === "object" ? Object.keys(response) : [];
    const requiredFields = ["rubricVersion", "score", "findings", "modelId", "inputDigest"];
    const missingResponseFields = response
      ? requiredFields.filter((field) => !(field in response))
      : requiredFields;

    return {
      label: item.label ?? null,
      commitSha: item.commitSha ?? null,
      fixtureFields: Object.keys(item),
      responseFields,
      missingResponseFields,
    };
  });
  const blockedCases = auditedCases.filter((item) => item.missingResponseFields.length > 0);

  return {
    status: blockedCases.length === 0 && auditedCases.length > 0 ? "READY" : "BLOCKED",
    source: "evals/fixtures/fragments-test-commits.json",
    expectedPersistedResponseFields: ["rubricVersion", "score", "findings", "modelId", "inputDigest"],
    cases: auditedCases,
    blockedLabels: blockedCases.map((item) => item.label),
    reason: blockedCases.length
      ? "No complete persisted Review output is stored for these cases; fixture metadata cannot support semantic quality comparison."
      : null,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const corpus = JSON.parse(readFileSync(fixturePath, "utf8"));
  process.stdout.write(`${JSON.stringify(auditSemanticCorpus(corpus), null, 2)}\n`);
}
