import { describe, expect, it, vi } from "vitest";
import { createReviewService, digestSnapshot, type ReviewDependencies, type ReviewRecord } from "./review.service.js";
import { createGitHubRepositoryReader } from "../../adapters/github/github.repository-reader.js";
import { createRepositoryPacker } from "../../adapters/repomix/repository-packer.js";
import { createAiProvider } from "../../adapters/ai/ai-provider.js";
import { createPdfRenderer } from "../../adapters/ai/pdf-renderer.js";
import { createInMemoryReviewStore } from "./in-memory-review-store.js";

const source = "export function total(items: number[]) {\n  return items.reduce((a, b) => a + b, 0)\n}\n";
const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const commitSha = "a".repeat(40);
const fileSha = "b".repeat(40);

async function fixture(overrides: Partial<ReviewDependencies> = {}) {
  const snapshotContent = {
    owner: "student",
    repo: "demo",
    commitSha,
    files: [{ path: "src/math.ts", content: source, sha: fileSha }],
  };
  const snapshot = { ...snapshotContent, digest: await digestSnapshot(snapshotContent) };
  const find = {
    criterionId: "correctness",
    status: "verified" as const,
    evidence: [{ source: "repository" as const, path: "src/math.ts", lines: [1, 3] as [number, number], digest: snapshot.digest }],
    file: "src/math.ts",
    lines: [1, 3] as [number, number],
    reason: "El cálculo suma los elementos presentes en el archivo.",
    guidanceLevel: 1 as const,
  };
  const repository = {
    getCommitSnapshot: vi.fn(async () => snapshot),
  };
  const packedDigest = await sha256("commit snapshot");
  const packer = { pack: vi.fn(async () => ({ text: "commit snapshot", inputDigest: packedDigest, tokenCount: 2 })) };
  const ai = {
    analyze: vi.fn(async () => ({ rubricVersion: "review-v1", score: 80, findings: [find], limitations: [], modelId: "fake-review-v1", inputDigest: packedDigest })),
  };
  const byId = new Map<string, ReviewRecord>();
  const byKey = new Map<string, ReviewRecord>();
  const evaluations = {
    getByKey: vi.fn(async (key: string) => byKey.get(key) ?? null),
    getById: vi.fn(async (id: string) => byId.get(id) ?? null),
    save: vi.fn(async (value: ReviewRecord) => { byId.set(value.id, value); byKey.set(value.key, value); return value; }),
  };
  const savedSubmissions = new Map<string, Parameters<NonNullable<ReviewDependencies["submissions"]>["save"]>[0]>();
  const submissions = {
    save: vi.fn(async (value: Parameters<NonNullable<ReviewDependencies["submissions"]>["save"]>[0]) => { savedSubmissions.set(value.verificationCode, value); }),
    getByVerificationCode: vi.fn(async (code: string) => savedSubmissions.get(code) ?? null),
  };
  const pdf = { render: vi.fn(async (text: string) => new TextEncoder().encode(`%PDF-1.4\n${text}\n%%EOF`)) };
  const dependencies: ReviewDependencies = {
    repository,
    packer,
    ai,
    evaluations,
    submissions,
    pdf,
    createVerificationCode: () => "a".repeat(32),
    now: () => new Date("2026-11-04T12:00:00.000Z"),
    ...overrides,
  };
  return { service: createReviewService(dependencies), snapshot, repository, packer, ai, evaluations, submissions, pdf };
}

describe("review vertical slice", () => {
  it("analyzes the requested exact commit and returns the first guidance level", async () => {
    const f = await fixture();
    const result = await f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" });

    expect(f.repository.getCommitSnapshot).toHaveBeenCalledWith({ owner: "student", repo: "demo", commitSha });
    expect(f.packer.pack).toHaveBeenCalledWith(expect.objectContaining({ files: f.snapshot.files }), { maxBytes: 100_000, maxTokens: 20_000 });
    expect((await f.service.getFeedback(result.id, 1)).findings).toHaveLength(1);
    const evidence = (await f.service.getFeedback(result.id, 1)).findings[0]?.evidence[0];
    expect(evidence?.source === "repository" ? evidence.path : undefined).toBe("src/math.ts");
  });

  it("rejects a driver that returns another commit without exposing repository contents", async () => {
    const f = await fixture({ repository: { getCommitSnapshot: vi.fn(async () => ({ owner: "student", repo: "demo", commitSha: "d".repeat(40), files: [], digest: "c".repeat(64) })) } });

    await expect(f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" })).rejects.toThrow("El proveedor devolvió un commit distinto");
    expect(f.ai.analyze).not.toHaveBeenCalled();
  });

  it("explains that a branch name or abbreviated reference must be replaced with a full commit SHA", async () => {
    const f = await fixture();

    await expect(f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha: "main", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" } as never)).rejects.toThrow("Indica el SHA completo del commit");
    expect(f.repository.getCommitSnapshot).not.toHaveBeenCalled();
  });

  it("rejects arbitrary repository URLs at the GitHub adapter boundary", async () => {
    const client = { readCommitSnapshot: vi.fn() };
    const repository = createGitHubRepositoryReader(client);

    await expect(repository.getCommitSnapshot({ owner: "https://example.com", repo: "demo", commitSha })).rejects.toThrow("propietario y repositorio de GitHub válidos");
    expect(client.readCommitSnapshot).not.toHaveBeenCalled();
  });

  it("rejects findings that cite a file absent from the validated snapshot", async () => {
    const f = await fixture({ ai: { analyze: vi.fn(async () => ({ rubricVersion: "review-v1", score: 80, findings: [{ criterionId: "missing", status: "failed" as const, evidence: [{ source: "repository" as const, path: "src/missing.ts", lines: [1, 1] as [number, number], digest: "c".repeat(64) }], reason: "La evidencia debe existir.", guidanceLevel: 1 as const }], limitations: [], modelId: "fake-review-v1", inputDigest: await sha256("commit snapshot") })) } });

    await expect(f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" })).rejects.toThrow("La evidencia cita un archivo que no está en el commit");
  });

  it("uses an idempotency key for a cached exact commit and rubric", async () => {
    const f = await fixture();
    const result = await f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" });
    const cached = await f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" });

    expect(cached.id).toBe(result.id);
    expect(f.ai.analyze).toHaveBeenCalledTimes(1);
  });

  it("reveals progressive guidance and creates a verifiable PDF only when requested", async () => {
    const f = await fixture({ ai: { analyze: vi.fn(async () => ({ rubricVersion: "review-v1", score: 80, findings: [
      { criterionId: "step-1", status: "verified" as const, evidence: [{ source: "repository" as const, path: "src/math.ts", lines: [1, 1] as [number, number], digest: await digestSnapshot({ owner: "student", repo: "demo", commitSha, files: [{ path: "src/math.ts", content: source, sha: fileSha }] }) }], reason: "Primera pista.", guidanceLevel: 1 as const },
      { criterionId: "step-3", status: "not_verified" as const, evidence: [{ source: "repository" as const, path: "src/math.ts", lines: [2, 2] as [number, number], digest: await digestSnapshot({ owner: "student", repo: "demo", commitSha, files: [{ path: "src/math.ts", content: source, sha: fileSha }] }) }], reason: "Tercera pista.", guidanceLevel: 3 as const },
    ], limitations: [], modelId: "fake-review-v1", inputDigest: await sha256("commit snapshot") })) } });
    const result = await f.service.review({ projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" });

    expect((await f.service.getFeedback(result.id, 1)).findings.map((finding) => finding.criterionId)).toEqual(["step-1"]);
    expect(f.pdf.render).not.toHaveBeenCalled();
    const report = await f.service.createPdf(result.id);

    expect(new TextDecoder().decode(report.bytes)).toContain("%PDF-1.4");
    expect(await f.service.verify(report.verificationCode)).toMatchObject({ valid: true, kind: "review", sourceId: result.id });
    expect(f.pdf.render).toHaveBeenCalledOnce();
    const multipage = await createPdfRenderer().render(Array.from({ length: 61 }, (_, index) => `línea ${index + 1}`).join("\n"));
    expect(new TextDecoder().decode(multipage)).toContain("/Count 2");
  });

  it("runs offline through the real bounded packer, fake providers, cache and PDF renderer", async () => {
    const snapshotFiles = [
      { path: "src/math.ts", content: source, sha: fileSha },
      { path: ".env", content: "never-send-this-value", sha: "c".repeat(40) },
      { path: "config/deploy.ts", content: "const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';", sha: "d".repeat(40) },
    ];
    const snapshotContent = { owner: "student", repo: "demo", commitSha, files: snapshotFiles };
    const snapshot = { ...snapshotContent, digest: await digestSnapshot(snapshotContent) };
    const store = createInMemoryReviewStore();
    let packedText = "";
    const service = createReviewService({
      repository: createGitHubRepositoryReader({ readCommitSnapshot: async (input) => {
        expect(input).toEqual({ owner: "student", repo: "demo", commitSha });
        return snapshot;
      } }),
      packer: createRepositoryPacker(),
      ai: createAiProvider(async (input) => {
        packedText = input.packedText;
        return { rubricVersion: input.rubricVersion, score: 82, findings: [{
          criterionId: "correctness", status: "verified", evidence: [{ source: "repository", path: "src/math.ts", lines: [1, 3], digest: snapshot.digest }],
          file: "src/math.ts", lines: [1, 3], reason: "La suma tiene evidencia en el commit.", guidanceLevel: 1,
        }], limitations: ["Evaluación orientativa."], modelId: "fake:offline-v1", inputDigest: input.inputDigest };
      }),
      evaluations: store,
      submissions: { save: store.saveSubmission, getByVerificationCode: store.getByVerificationCode },
      pdf: createPdfRenderer(),
      createId: () => "offline-review-1",
      createVerificationCode: () => "z".repeat(32),
    });

    const request = { projectId: "project-1", owner: "student", repo: "demo", commitSha, rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" };
    const first = await service.review(request);
    const second = await service.review(request);
    const report = await service.createPdf(first.id);

    expect(second.id).toBe(first.id);
    expect(first.analysis.limitations.join(" ")).toContain(".env");
    expect(packedText).toContain("src/math.ts");
    expect(packedText).not.toContain("never-send-this-value");
    expect(packedText).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz");
    expect(new TextDecoder().decode(report.bytes)).toMatch(/^%PDF-1\.4/);
    expect(await service.verify(report.verificationCode)).toMatchObject({ valid: true, score: 82, commitSha });
  });
});
