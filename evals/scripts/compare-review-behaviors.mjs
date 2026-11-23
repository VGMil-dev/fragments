import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { auditSemanticCorpus } from "./audit-semantic-corpus.mjs";

const fixturePath = new URL("../fixtures/fragments-test-commits.json", import.meta.url);
const sha256Pattern = /^[a-f\d]{64}$/i;
const syntheticModelPattern = /^(?:fake|fixture|mock|test)(?:$|[:_-])/i;
const syntheticProviderPattern = /^(?:fake|fixture|mock|test)(?:$|[:_-])/i;

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
  const evidencePaths = new Set(Array.isArray(caseReference?.evidence) ? caseReference.evidence : []);
  const knownIds = new Set(Object.keys(reference));
  const correctFindings = [];
  const falsePositives = [];
  const statusMismatches = [];
  const unclassifiedFindings = [];
  const citationsNotInEvidenceList = [];
  const seenBehaviorIds = new Set();

  for (const finding of findings) {
    const expectedPresence = reference[finding?.criterionId];
    if (!knownIds.has(finding?.criterionId) || typeof expectedPresence !== "boolean") {
      unclassifiedFindings.push({ criterionId: finding?.criterionId ?? null, status: finding?.status ?? null });
    } else {
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

    for (const citation of Array.isArray(finding?.evidence) ? finding.evidence : []) {
      if (citation?.source === "repository" && typeof citation.path === "string" && !evidencePaths.has(citation.path)) {
        citationsNotInEvidenceList.push({ criterionId: finding?.criterionId ?? null, path: citation.path });
      }
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
    citationsNotInEvidenceList,
    citationPathCheck: Array.isArray(caseReference?.evidence)
      ? "FIXTURE_EVIDENCE_MEMBERSHIP_ONLY"
      : "FIXTURE_EVIDENCE_UNAVAILABLE",
    citationValidation: "SHAPE_ONLY",
    semanticValidity: "NOT_VALIDATED",
  };
}

/**
 * Runs the fixture-only diagnostic only after the same case reference has been
 * checked against local Git source markers. This links two mechanical checks;
 * it does not establish semantic truth or validate a Review output.
 */
export function classifyAgainstVerifiedReference({ caseReference, reviewOutput, coverage, referenceVerification }) {
  const verificationCase = Array.isArray(referenceVerification?.cases)
    ? referenceVerification.cases.find((item) => item.label === caseReference?.label)
    : null;
  const expected = caseReference?.behaviorReference;
  const checks = Array.isArray(verificationCase?.checks) ? verificationCase.checks : [];
  const checkById = new Map(checks.map((item) => [item.behaviorId, item]));
  const referenceMatches = expected && typeof expected === "object" && !Array.isArray(expected)
    && Object.keys(expected).length > 0
    && Object.entries(expected).every(([behaviorId, expectedPresent]) => {
      const check = checkById.get(behaviorId);
      return typeof expectedPresent === "boolean"
        && check?.status === "MATCH"
        && check.expectedPresent === expectedPresent
        && check.detectedPresent === expectedPresent;
    })
    && checks.length === Object.keys(expected).length
    && verificationCase?.commitSha === caseReference?.commitSha
    && verificationCase?.status === "REFERENCE_MARKERS_MATCH"
    && referenceVerification?.status === "REFERENCE_MARKERS_MATCH"
    && referenceVerification?.referenceSource === "LOCAL_GIT_COMMIT_OBJECTS"
    && referenceVerification?.execution === "SOURCE_NOT_EXECUTED";

  if (!referenceMatches) {
    return {
      status: "BLOCKED",
      blockers: ["reference_not_verified_against_local_markers"],
      classification: null,
      qualityComparison: "NOT_PERFORMED",
      scoreComputed: false,
      semanticValidity: "NOT_VALIDATED",
    };
  }

  return {
    status: "MECHANICAL_REFERENCE_CLASSIFIED",
    blockers: [],
    classification: classifyReferenceBehaviors({ caseReference, reviewOutput, coverage }),
    referenceValidation: "STATIC_SOURCE_MARKERS_MATCHED",
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    semanticValidity: "NOT_VALIDATED",
    referenceReportAuthentication: "NOT_AUTHENTICATED",
    inputProvenance: "CALLER_SUPPLIED_OUTPUT_NOT_AUTHENTICATED",
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
  const exportAllowlisted = authorizedExportIds.includes(manifest?.exportId);
  const manifestRecordMatches = exportAllowlisted
    ? Boolean(findManifestRecord({ caseReference, reviewOutput, manifest }))
    : false;
  if (!exportAllowlisted) {
    blockers.push("untrusted_export");
  } else if (!manifestRecordMatches) {
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
      providerProvenance: "NOT_CRYPTOGRAPHICALLY_AUTHENTICATED",
      exportIntegrity: manifestRecordMatches ? "OUTPUT_DIGEST_AND_RECORD_MATCHED" : "NOT_MATCHED_OR_UNAVAILABLE",
      exportAuthorization: exportAllowlisted
        ? "EXTERNAL_ALLOWLIST_DECLARATION_MATCHED"
        : "NOT_ALLOWLISTED",
      citationValidation: audit.cases[0].citationValidation,
    };
  }

  return {
    status: "MECHANICAL_REFERENCE_CLASSIFIED",
    blockers: [],
    classification: classifyReferenceBehaviors({ caseReference, reviewOutput, coverage }),
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    providerProvenance: "NOT_CRYPTOGRAPHICALLY_AUTHENTICATED",
    exportIntegrity: "OUTPUT_DIGEST_AND_RECORD_MATCHED",
    exportAuthorization: "EXTERNAL_ALLOWLIST_DECLARATION_MATCHED",
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
