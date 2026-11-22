import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixturePath = new URL("../fixtures/fragments-test-commits.json", import.meta.url);
const requiredAnalysisFields = ["rubricVersion", "score", "findings", "limitations", "modelId", "inputDigest"];
const sha256Pattern = /^[a-f\d]{64}$/i;
const syntheticModelPattern = /^(?:fake|fixture|mock|test)(?::|[-_])/i;

function isSafeRelativePath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 512
    && !path.startsWith("/") && !/^[a-z]:/i.test(path) && !path.includes("\\")
    && path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function hasCitationShape(evidence) {
  return evidence?.source === "repository" && isSafeRelativePath(evidence.path)
    && Array.isArray(evidence.lines) && evidence.lines.length === 2
    && Number.isInteger(evidence.lines[0]) && Number.isInteger(evidence.lines[1])
    && evidence.lines[0] >= 1 && evidence.lines[1] >= evidence.lines[0]
    && typeof evidence.digest === "string" && sha256Pattern.test(evidence.digest);
}

function validateReviewOutput(item) {
  const response = item.reviewOutput;
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return {
      responseFields: [],
      missingResponseFields: requiredAnalysisFields,
      blockers: ["missing_persisted_output"],
      candidateForManualComparison: false,
      citationValidation: "NOT_AVAILABLE",
    };
  }

  const analysis = response.analysis;
  const analysisObject = analysis && typeof analysis === "object" && !Array.isArray(analysis) ? analysis : null;
  const responseFields = analysisObject ? Object.keys(analysisObject) : [];
  const missingResponseFields = analysisObject
    ? requiredAnalysisFields.filter((field) => !(field in analysisObject))
    : requiredAnalysisFields;
  const blockers = [];

  if (response.status !== "completed") blockers.push("review_not_completed");
  if (typeof response.commitSha !== "string" || response.commitSha.toLowerCase() !== String(item.commitSha ?? "").toLowerCase()) {
    blockers.push("commit_sha_mismatch");
  }
  if (!analysisObject) blockers.push("missing_analysis");
  if (missingResponseFields.length) blockers.push("incomplete_analysis");
  if (analysisObject && (!Number.isFinite(analysisObject.score) || analysisObject.score < 0 || analysisObject.score > 100)) {
    blockers.push("invalid_score_shape");
  }
  if (analysisObject && (!Array.isArray(analysisObject.findings) || analysisObject.findings.length === 0)) {
    blockers.push("invalid_findings_shape");
  }
  if (analysisObject && (!Array.isArray(analysisObject.limitations)
    || analysisObject.limitations.some((limitation) => typeof limitation !== "string" || !limitation.trim()))) {
    blockers.push("invalid_limitations_shape");
  }
  if (analysisObject && (typeof analysisObject.rubricVersion !== "string" || !analysisObject.rubricVersion.trim())) {
    blockers.push("missing_rubric_version");
  }
  if (analysisObject && (typeof analysisObject.modelId !== "string" || !analysisObject.modelId.trim())) {
    blockers.push("missing_model_id");
  } else if (analysisObject && syntheticModelPattern.test(analysisObject.modelId)) {
    blockers.push("synthetic_model");
  }
  if (analysisObject && (typeof analysisObject.inputDigest !== "string" || !sha256Pattern.test(analysisObject.inputDigest))) {
    blockers.push("invalid_input_digest");
  }
  if (analysisObject && Array.isArray(analysisObject.findings) && analysisObject.findings.some((finding) =>
    typeof finding?.criterionId !== "string" || !finding.criterionId.trim()
    || !["verified", "not_verified", "failed"].includes(finding.status)
    || !Array.isArray(finding.evidence) || finding.evidence.length === 0
    || finding.evidence.some((evidence) => !hasCitationShape(evidence))
    || typeof finding.reason !== "string" || !finding.reason.trim()
    || !Number.isInteger(finding.guidanceLevel) || finding.guidanceLevel < 1 || finding.guidanceLevel > 4)) {
    blockers.push("invalid_citation_shape");
  }

  return {
    responseFields,
    missingResponseFields,
    blockers: [...new Set(blockers)],
    candidateForManualComparison: blockers.length === 0,
    citationValidation: "SHAPE_ONLY",
  };
}

export function auditSemanticCorpus(corpus) {
  const cases = Array.isArray(corpus.cases) ? corpus.cases : [];
  const auditedCases = cases.map((item) => {
    return {
      label: item.label ?? null,
      commitSha: item.commitSha ?? null,
      fixtureFields: Object.keys(item),
      ...validateReviewOutput(item),
    };
  });
  const blockedCases = auditedCases.filter((item) => !item.candidateForManualComparison);
  const status = blockedCases.length === 0 && auditedCases.length > 0 ? "READY_FOR_MANUAL_COMPARISON" : "BLOCKED";

  return {
    status,
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    citationValidation: "SHAPE_ONLY",
    providerProvenance: "NOT_AUTHENTICATED",
    source: "evals/fixtures/fragments-test-commits.json",
    expectedPersistedResponseFields: ["status", "commitSha", ...requiredAnalysisFields],
    cases: auditedCases,
    blockedLabels: blockedCases.map((item) => item.label),
    reason: blockedCases.length
      ? "No eligible complete Review output is stored for these cases; fixture metadata and synthetic providers cannot support semantic quality comparison."
      : null,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const corpus = JSON.parse(readFileSync(fixturePath, "utf8"));
  process.stdout.write(`${JSON.stringify(auditSemanticCorpus(corpus), null, 2)}\n`);
}
