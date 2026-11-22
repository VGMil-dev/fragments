import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { auditSemanticCorpus } from "./audit-semantic-corpus.mjs";

const fixturePath = new URL("../fixtures/fragments-test-commits.json", import.meta.url);
const sha256Pattern = /^[a-f\d]{64}$/i;
const syntheticModelPattern = /^(?:fake|fixture|mock|test)(?::|[-_])/i;
const syntheticProviderPattern = /^(?:fake|fixture|mock|test)(?::|[-_])/i;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function digestReviewOutput(reviewOutput) {
  const canonical = JSON.stringify(canonicalize(reviewOutput));
  return createHash("sha256").update(canonical).digest("hex");
}

function normalizeCoverage(reference, coverage) {
  const behaviorIds = Object.keys(reference ?? {}).sort();
  if (!coverage?.complete || !Array.isArray(coverage.criterionIds)) return false;
  const declaredIds = [...new Set(coverage.criterionIds)].sort();
  return declaredIds.length === behaviorIds.length
    && declaredIds.every((id, index) => id === behaviorIds[index]);
}

export function classifyReferenceBehaviors({ caseReference, reviewOutput, coverage }) {
  const reference = caseReference?.behaviorReference ?? {};
  const findings = Array.isArray(reviewOutput?.analysis?.findings) ? reviewOutput.analysis.findings : [];
  const knownIds = new Set(Object.keys(reference));
  const correctFindings = [];
  const falsePositives = [];
  const statusMismatches = [];
  const unclassifiedFindings = [];
  const seenBehaviorIds = new Set();

  for (const finding of findings) {
    const expectedPresence = reference[finding?.criterionId];
    if (!knownIds.has(finding?.criterionId) || typeof expectedPresence !== "boolean") {
      unclassifiedFindings.push({ criterionId: finding?.criterionId ?? null, status: finding?.status ?? null });
      continue;
    }
    seenBehaviorIds.add(finding.criterionId);

    if (expectedPresence && finding.status === "verified") {
      correctFindings.push({ criterionId: finding.criterionId, status: finding.status });
    } else if (!expectedPresence && finding.status === "verified") {
      falsePositives.push({ criterionId: finding.criterionId, status: finding.status });
    } else if (!expectedPresence && ["not_verified", "failed"].includes(finding.status)) {
      correctFindings.push({ criterionId: finding.criterionId, status: finding.status });
    } else {
      statusMismatches.push({ criterionId: finding.criterionId, status: finding.status });
    }
  }

  const completeCoverage = normalizeCoverage(reference, coverage);
  const omissions = completeCoverage
    ? Object.entries(reference)
      .filter(([criterionId, expectedPresence]) => expectedPresence && !seenBehaviorIds.has(criterionId))
      .map(([criterionId]) => ({ criterionId }))
    : [];

  return {
    mode: "MECHANICAL_REFERENCE_ONLY",
    correctFindings,
    falsePositives,
    omissions,
    omissionStatus: completeCoverage ? "COMPUTED_FOR_DECLARED_COVERAGE" : "NOT_COMPUTED_COVERAGE_INCOMPLETE",
    statusMismatches,
    unclassifiedFindings,
    citationValidation: "SHAPE_ONLY",
    semanticValidity: "NOT_VALIDATED",
  };
}

function findManifestRecord({ caseReference, reviewOutput, manifest }) {
  if (manifest?.source !== "operator-authorized-qa-export"
    || typeof manifest.exportId !== "string" || !manifest.exportId.trim()
    || !Array.isArray(manifest.records)) return null;

  const provenance = reviewOutput?.provenance;
  if (!provenance || provenance.source !== "operator-authorized-qa-export"
    || provenance.exportId !== manifest.exportId) return null;

  return manifest.records.find((record) => record.label === caseReference?.label
    && record.recordId === provenance.recordId
    && record.commitSha === caseReference?.commitSha
    && record.inputDigest === reviewOutput?.analysis?.inputDigest
    && record.provider === provenance.provider
    && record.modelId === reviewOutput?.analysis?.modelId
    && provenance.modelId === record.modelId
    && record.reviewOutputDigest === digestReviewOutput(reviewOutput)) ?? null;
}

export function comparePersistedReview({ caseReference, reviewOutput, manifest, authorizedExportIds = [], coverage }) {
  const audit = auditSemanticCorpus({ cases: [{ ...caseReference, reviewOutput }] });
  const blockers = [...audit.cases[0].blockers];
  const analysis = reviewOutput?.analysis;

  if (!reviewOutput) {
    return {
      status: "BLOCKED",
      blockers,
      classification: null,
      qualityComparison: "NOT_PERFORMED",
      scoreComputed: false,
      providerProvenance: "NOT_AVAILABLE",
      citationValidation: "NOT_AVAILABLE",
    };
  }

  if (typeof analysis?.inputDigest !== "string" || !sha256Pattern.test(analysis.inputDigest)) {
    blockers.push("invalid_input_digest");
  } else if (!Array.isArray(manifest?.records) || !manifest.records.some((record) => record.label === caseReference?.label
    && record.inputDigest === analysis.inputDigest)) {
    blockers.push("input_digest_mismatch");
  }
  if (!authorizedExportIds.includes(manifest?.exportId)) {
    blockers.push("untrusted_export");
  } else if (!findManifestRecord({ caseReference, reviewOutput, manifest })) {
    blockers.push("manifest_record_mismatch");
  }
  if (analysis && typeof analysis.modelId === "string" && syntheticModelPattern.test(analysis.modelId)
    && !blockers.includes("synthetic_model")) blockers.push("synthetic_model");
  if (syntheticProviderPattern.test(String(reviewOutput?.provenance?.provider ?? ""))) {
    blockers.push("synthetic_provider");
  }

  const uniqueBlockers = [...new Set(blockers)];
  if (uniqueBlockers.length) {
    return {
      status: "BLOCKED",
      blockers: uniqueBlockers,
      classification: null,
      qualityComparison: "NOT_PERFORMED",
      scoreComputed: false,
      providerProvenance: "NOT_ACCEPTED",
      citationValidation: audit.cases[0].citationValidation,
    };
  }

  return {
    status: "MECHANICAL_REFERENCE_CLASSIFIED",
    blockers: [],
    classification: classifyReferenceBehaviors({ caseReference, reviewOutput, coverage }),
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    providerProvenance: "MANIFEST_MATCHED_AUTHENTICATION_EXTERNAL",
    citationValidation: "SHAPE_ONLY",
  };
}

export function compareReviewCorpus(corpus, { manifest = null, authorizedExportIds = [], coverageByLabel = {} } = {}) {
  const cases = Array.isArray(corpus?.cases) ? corpus.cases : [];
  const results = cases.map((caseReference) => ({
    label: caseReference.label ?? null,
    commitSha: caseReference.commitSha ?? null,
    ...comparePersistedReview({
      caseReference,
      reviewOutput: caseReference.reviewOutput,
      manifest,
      authorizedExportIds,
      coverage: coverageByLabel[caseReference.label],
    }),
  }));
  const blocked = results.filter((result) => result.status === "BLOCKED");

  return {
    status: results.length > 0 && blocked.length === 0 ? "MECHANICAL_REFERENCE_CLASSIFIED" : "BLOCKED",
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    semanticValidity: "NOT_VALIDATED",
    cases: results,
    blockedLabels: blocked.map((item) => item.label),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const corpus = JSON.parse(readFileSync(fixturePath, "utf8"));
  process.stdout.write(`${JSON.stringify(compareReviewCorpus(corpus), null, 2)}\n`);
}
