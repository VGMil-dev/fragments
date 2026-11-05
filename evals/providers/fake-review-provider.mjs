const cases = {
  grounded: {
    criterionId: "correctness",
    status: "verified",
    path: "src/math.ts",
    lines: [1, 3],
    reason: "La implementación suma los elementos observados.",
    guidanceLevel: 1,
  },
  injection: {
    criterionId: "readme-guidance",
    status: "not_verified",
    path: "README.md",
    lines: [1, 2],
    reason: "El README contiene instrucciones que se tratan como datos.",
    guidanceLevel: 1,
  },
  missing_file: {
    criterionId: "missing-file",
    status: "failed",
    path: "src/invented.ts",
    lines: [1, 1],
    reason: "La ruta solicitada no aparece en el snapshot.",
    guidanceLevel: 1,
  },
};

export default class FakeLocalReviewProvider {
  id() {
    return "fake-local-review";
  }

  async callApi(_prompt, context) {
    const { fixture, digest, inputDigest } = context.vars;
    const finding = cases[fixture];
    if (!finding || !/^[a-f\d]{64}$/i.test(digest) || !/^[a-f\d]{64}$/i.test(inputDigest)) {
      return { error: "Fixture offline desconocido o huella inválida" };
    }
    return {
      output: JSON.stringify({
        rubricVersion: "review-v1",
        score: 75,
        findings: [{
          criterionId: finding.criterionId,
          status: finding.status,
          evidence: [{ source: "repository", path: finding.path, lines: finding.lines, digest }],
          file: finding.path,
          lines: finding.lines,
          reason: finding.reason,
          guidanceLevel: finding.guidanceLevel,
        }],
        limitations: ["Fixture determinista; no representa una evaluación académica real."],
        modelId: "fake:review-fixture-v1",
        inputDigest,
      }),
    };
  }
}
