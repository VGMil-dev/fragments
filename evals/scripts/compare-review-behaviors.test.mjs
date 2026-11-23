import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import FakeLocalReviewProvider from "../providers/fake-review-provider.mjs";
import {
  classifyReferenceBehaviors,
  classifyAgainstVerifiedReference,
  compareReviewCorpus,
  comparePersistedReview,
  digestReviewOutput,
} from "./compare-review-behaviors.mjs";

const persistedCorpus = JSON.parse(
  readFileSync(new URL("../fixtures/fragments-test-commits.json", import.meta.url), "utf8"),
);

const caseA = {
  label: "A",
  commitSha: "1".repeat(40),
  evidence: ["App.tsx"],
  behaviorReference: {
    required_validation: false,
    name_search: false,
    recovered_status: false,
  },
};

const caseC = {
  label: "C",
  commitSha: "3".repeat(40),
  behaviorReference: {
    required_validation: true,
    name_search: true,
    recovered_status: true,
  },
};

const caseB = {
  label: "B",
  commitSha: "2".repeat(40),
  behaviorReference: {
    required_validation: true,
    name_search: false,
    recovered_status: false,
  },
};

function makeFakeOutput({ commitSha = caseC.commitSha, inputDigest = "a".repeat(64), findings = [] } = {}) {
  return {
    status: "completed",
    commitSha,
    analysis: {
      rubricVersion: "unit-test-only",
      score: 75,
      findings,
      limitations: ["Fake output used only to test deterministic mechanics."],
      modelId: "fake:behavior-comparator-test",
      inputDigest,
    },
    provenance: {
      source: "fake-test-fixture",
      exportId: "fake-export",
      recordId: "fake-record",
      provider: "fake",
      modelId: "fake:behavior-comparator-test",
    },
  };
}

function fakeFinding(criterionId, status = "verified") {
  return {
    criterionId,
    status,
    evidence: [{ source: "repository", path: "src/example.ts", lines: [1, 2], digest: "b".repeat(64) }],
    reason: "Synthetic test finding; it does not establish source truth.",
    guidanceLevel: 1,
  };
}

function fakeMarkerVerification(caseReference) {
  return {
    status: "REFERENCE_MARKERS_MATCH",
    referenceSource: "LOCAL_GIT_COMMIT_OBJECTS",
    execution: "SOURCE_NOT_EXECUTED",
    cases: [{
      label: caseReference.label,
      commitSha: caseReference.commitSha,
      status: "REFERENCE_MARKERS_MATCH",
      checks: Object.entries(caseReference.behaviorReference).map(([behaviorId, present]) => ({
        behaviorId,
        expectedPresent: present,
        detectedPresent: present,
        status: "MATCH",
      })),
    }],
  };
}

test("el gate exige cotejo estático del SHA y todos los marcadores antes de clasificar", () => {
  const output = makeFakeOutput({
    commitSha: caseB.commitSha,
    findings: [fakeFinding("required_validation"), fakeFinding("name_search")],
  });
  const coverage = { complete: true, criterionIds: Object.keys(caseB.behaviorReference) };
  const markerReport = fakeMarkerVerification(caseB);

  const accepted = classifyAgainstVerifiedReference({
    caseReference: caseB,
    reviewOutput: output,
    coverage,
    referenceVerification: markerReport,
  });
  assert.equal(accepted.status, "MECHANICAL_REFERENCE_CLASSIFIED");
  assert.equal(accepted.referenceValidation, "STATIC_SOURCE_MARKERS_MATCHED");
  assert.deepEqual(accepted.classification.falsePositives.map((item) => item.criterionId), ["name_search"]);
  assert.equal(accepted.semanticValidity, "NOT_VALIDATED");
  assert.equal(accepted.referenceReportAuthentication, "NOT_AUTHENTICATED");
  assert.equal(accepted.inputProvenance, "CALLER_SUPPLIED_OUTPUT_NOT_AUTHENTICATED");

  markerReport.cases[0].checks[0].detectedPresent = false;
  markerReport.cases[0].checks[0].status = "MISMATCH";
  const blocked = classifyAgainstVerifiedReference({
    caseReference: caseB,
    reviewOutput: output,
    coverage,
    referenceVerification: markerReport,
  });
  assert.equal(blocked.status, "BLOCKED");
  assert.equal(blocked.classification, null);
  assert.deepEqual(blocked.blockers, ["reference_not_verified_against_local_markers"]);

  markerReport.cases[0].status = "REFERENCE_MARKERS_MATCH";
  markerReport.cases[0].checks = Object.entries(caseB.behaviorReference).map(([behaviorId, present]) => ({
    behaviorId,
    expectedPresent: present,
    detectedPresent: present,
    status: "MATCH",
  }));
  markerReport.cases[0].commitSha = caseC.commitSha;
  const wrongCommit = classifyAgainstVerifiedReference({
    caseReference: caseB,
    reviewOutput: output,
    coverage,
    referenceVerification: markerReport,
  });
  assert.equal(wrongCommit.status, "BLOCKED");
  assert.equal(wrongCommit.classification, null);
});

test("la clasificación mecánica con output fake etiqueta correctos, falsos positivos y omisiones", () => {
  const comparisonB = classifyReferenceBehaviors({
    caseReference: caseB,
    reviewOutput: makeFakeOutput({
      commitSha: caseB.commitSha,
      findings: [fakeFinding("required_validation"), fakeFinding("name_search")],
    }),
    coverage: { complete: true, criterionIds: Object.keys(caseB.behaviorReference) },
  });
  const comparisonC = classifyReferenceBehaviors({
    caseReference: caseC,
    reviewOutput: makeFakeOutput({
      findings: [fakeFinding("required_validation"), fakeFinding("recovered_status")],
    }),
    coverage: { complete: true, criterionIds: Object.keys(caseC.behaviorReference) },
  });

  assert.equal(comparisonB.mode, "MECHANICAL_REFERENCE_ONLY");
  assert.deepEqual(comparisonB.correctFindings.map((item) => item.criterionId), ["required_validation"]);
  assert.deepEqual(comparisonB.falsePositives.map((item) => item.criterionId), ["name_search"]);
  assert.deepEqual(comparisonC.correctFindings.map((item) => item.criterionId), ["required_validation", "recovered_status"]);
  assert.deepEqual(comparisonC.omissions.map((item) => item.criterionId), ["name_search"]);
  for (const comparison of [comparisonB, comparisonC]) {
    assert.equal(comparison.semanticValidity, "NOT_VALIDATED");
    assert.equal("qualityScore" in comparison, false);
    assert.equal("scoreComputed" in comparison, false);
  }
});

test("no clasifica omisiones si la cobertura completa no está declarada", () => {
  const comparison = classifyReferenceBehaviors({
    caseReference: caseC,
    reviewOutput: makeFakeOutput({ findings: [fakeFinding("required_validation")] }),
    coverage: { complete: false, criterionIds: ["required_validation"] },
  });

  assert.deepEqual(comparison.omissions, []);
  assert.equal(comparison.omissionStatus, "NOT_COMPUTED_COVERAGE_INCOMPLETE");
});

test("la comparación persistida bloquea outputs fake aunque SHA y manifest declarado coincidan", () => {
  const reviewOutput = makeFakeOutput({ findings: [fakeFinding("required_validation")] });
  reviewOutput.provenance.source = "operator-authorized-qa-export";
  const inputDigest = reviewOutput.analysis.inputDigest;
  const manifest = {
    source: "operator-authorized-qa-export",
    exportId: "fake-export",
    records: [{
      label: "C",
      recordId: "fake-record",
      commitSha: caseC.commitSha,
      inputDigest,
      provider: "fake",
      modelId: reviewOutput.analysis.modelId,
      reviewOutputDigest: digestReviewOutput(reviewOutput),
    }],
  };

  const result = comparePersistedReview({
    caseReference: caseC,
    reviewOutput,
    manifest,
    authorizedExportIds: ["fake-export"],
    coverage: { complete: true, criterionIds: Object.keys(caseC.behaviorReference) },
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.includes("synthetic_model"));
  assert.equal(result.classification, null);
  assert.equal(result.providerProvenance, "NOT_CRYPTOGRAPHICALLY_AUTHENTICATED");
  assert.equal(result.exportIntegrity, "OUTPUT_DIGEST_AND_RECORD_MATCHED");
  assert.equal(result.exportAuthorization, "EXTERNAL_ALLOWLIST_DECLARATION_MATCHED");
});

test("la provenance etiquetada fake bloquea la comparación aunque el modelId parezca productivo", () => {
  const reviewOutput = makeFakeOutput({ findings: [fakeFinding("required_validation")] });
  reviewOutput.analysis.modelId = "provider-x/model-y";
  reviewOutput.provenance.modelId = "provider-x/model-y";
  reviewOutput.provenance.provider = "fake-local-provider";
  const manifest = {
    source: "operator-authorized-qa-export",
    exportId: "fake-export",
    records: [{
      label: "C",
      recordId: "fake-record",
      commitSha: caseC.commitSha,
      inputDigest: reviewOutput.analysis.inputDigest,
      provider: "fake-local-provider",
      modelId: "provider-x/model-y",
      reviewOutputDigest: digestReviewOutput(reviewOutput),
    }],
  };

  const result = comparePersistedReview({
    caseReference: caseC,
    reviewOutput,
    manifest,
    authorizedExportIds: ["fake-export"],
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.includes("synthetic_provider"));
  assert.equal(result.classification, null);
});

test("bloquea export IDs que no están en la allowlist autorizada", () => {
  const reviewOutput = makeFakeOutput({ findings: [fakeFinding("required_validation")] });
  const manifest = {
    source: "operator-authorized-qa-export",
    exportId: "unapproved-export",
    records: [],
  };

  const result = comparePersistedReview({ caseReference: caseC, reviewOutput, manifest });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.includes("untrusted_export"));
  assert.equal(result.classification, null);
});

test("bloquea IDs sintéticos exactos fake, fixture, mock y test como modelId", () => {
  for (const modelId of ["fake", "fixture", "mock", "test"]) {
    const reviewOutput = makeFakeOutput({ findings: [fakeFinding("required_validation")] });
    reviewOutput.analysis.modelId = modelId;
    reviewOutput.provenance.modelId = modelId;
    const manifest = {
      source: "operator-authorized-qa-export",
      exportId: "bare-model-id-test",
      records: [{
        label: "C",
        recordId: "bare-model-id-test-record",
        commitSha: caseC.commitSha,
        inputDigest: reviewOutput.analysis.inputDigest,
        provider: "provider-x",
        modelId,
        reviewOutputDigest: digestReviewOutput(reviewOutput),
      }],
    };

    const result = comparePersistedReview({
      caseReference: caseC,
      reviewOutput,
      manifest,
      authorizedExportIds: ["bare-model-id-test"],
    });
    assert.equal(result.status, "BLOCKED", `${modelId} must be rejected`);
    assert.ok(result.blockers.includes("synthetic_model"), `${modelId} must be identified as synthetic`);
    assert.equal(result.classification, null);
  }
});

test("bloquea providers sintéticos exactos fake, fixture, mock y test", () => {
  for (const provider of ["fake", "fixture", "mock", "test"]) {
    const reviewOutput = makeFakeOutput({ findings: [fakeFinding("required_validation")] });
    reviewOutput.analysis.modelId = "provider-x/model-y";
    reviewOutput.provenance.modelId = "provider-x/model-y";
    reviewOutput.provenance.provider = provider;
    const manifest = {
      source: "operator-authorized-qa-export",
      exportId: "bare-provider-test",
      records: [{
        label: "C",
        recordId: "bare-provider-test-record",
        commitSha: caseC.commitSha,
        inputDigest: reviewOutput.analysis.inputDigest,
        provider,
        modelId: "provider-x/model-y",
        reviewOutputDigest: digestReviewOutput(reviewOutput),
      }],
    };

    const result = comparePersistedReview({
      caseReference: caseC,
      reviewOutput,
      manifest,
      authorizedExportIds: ["bare-provider-test"],
    });
    assert.equal(result.status, "BLOCKED", `${provider} must be rejected`);
    assert.ok(result.blockers.includes("synthetic_provider"), `${provider} must be identified as synthetic`);
    assert.equal(result.classification, null);
  }
});

test("la comparación persistida exige coincidencia exacta de commit e input digest", () => {
  const reviewOutput = makeFakeOutput({ commitSha: "4".repeat(40), inputDigest: "a".repeat(64) });
  const manifest = {
    source: "operator-authorized-qa-export",
    exportId: "test-export",
    records: [{
      label: "C",
      recordId: "test-record",
      commitSha: caseC.commitSha,
      inputDigest: "c".repeat(64),
      provider: "provider-x",
      modelId: "provider-x/model-y",
      reviewOutputDigest: digestReviewOutput(reviewOutput),
    }],
  };

  const result = comparePersistedReview({
    caseReference: caseC,
    reviewOutput,
    manifest,
    authorizedExportIds: ["test-export"],
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.includes("commit_sha_mismatch"));
  assert.ok(result.blockers.includes("input_digest_mismatch"));
  assert.ok(result.blockers.includes("manifest_record_mismatch"));
});

test("la referencia A distingue detección de comportamiento ausente de falso positivo", () => {
  const comparison = classifyReferenceBehaviors({
    caseReference: caseA,
    reviewOutput: makeFakeOutput({
      commitSha: caseA.commitSha,
      findings: [
        fakeFinding("required_validation", "failed"),
        fakeFinding("name_search", "not_verified"),
        fakeFinding("recovered_status", "verified"),
      ],
    }),
    coverage: { complete: true, criterionIds: Object.keys(caseA.behaviorReference) },
  });

  assert.deepEqual(comparison.falsePositives.map((item) => item.criterionId), ["recovered_status"]);
  assert.deepEqual(comparison.correctFindings.map((item) => item.criterionId), ["required_validation", "name_search"]);
  assert.deepEqual(comparison.omissions, []);
});

test("el corpus disponible permanece bloqueado sin outputs Review persistidos ni manifest", () => {
  const report = compareReviewCorpus(persistedCorpus);

  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.blockedLabels, ["A", "B", "C"]);
  assert.ok(report.cases.every((item) => item.blockers.length === 1
    && item.blockers[0] === "missing_persisted_output"));
  assert.equal(report.qualityComparison, "NOT_PERFORMED");
  assert.equal(report.scoreComputed, false);
  assert.equal(report.semanticValidity, "NOT_VALIDATED");
});

test("la referencia mecánica A/B/C refleja los tokens técnicos ya persistidos en el fixture", () => {
  for (const item of persistedCorpus.cases) {
    const present = item.verified.join(" ").toLowerCase();
    const absent = item.notPresent.join(" ").toLowerCase();
    assert.equal(item.behaviorReference.required_validation,
      present.includes("required field validation") || present.includes("trimmed required field validation"));
    assert.equal(item.behaviorReference.required_validation,
      !absent.includes("required field validation"));
    assert.equal(item.behaviorReference.name_search,
      present.includes("name search") && !absent.includes("name search"));
    assert.equal(item.behaviorReference.recovered_status,
      present.includes("mark item recovered") && !absent.includes("recovered status"));
  }
});

test("el finding fake missing_file para A queda sin clasificar y su ruta no está en evidence del fixture", async () => {
  const provider = new FakeLocalReviewProvider();
  const fakeResult = await provider.callApi("", {
    vars: {
      fixture: "missing_file",
      digest: "d".repeat(64),
      inputDigest: "e".repeat(64),
    },
  });
  const reviewOutput = { analysis: JSON.parse(fakeResult.output) };
  const comparison = classifyReferenceBehaviors({
    caseReference: caseA,
    reviewOutput,
    coverage: { complete: true, criterionIds: Object.keys(caseA.behaviorReference) },
  });

  assert.deepEqual(comparison.unclassifiedFindings, [{
    criterionId: "missing-file",
    status: "failed",
  }]);
  assert.deepEqual(comparison.citationsNotInEvidenceList, [{
    criterionId: "missing-file",
    path: "src/invented.ts",
  }]);
  assert.equal(comparison.citationPathCheck, "FIXTURE_EVIDENCE_MEMBERSHIP_ONLY");
  assert.equal(comparison.semanticValidity, "NOT_VALIDATED");
});
