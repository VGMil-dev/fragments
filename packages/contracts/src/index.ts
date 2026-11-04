import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f\d]{64}$/i, "Debe ser un SHA-256 hexadecimal.");
const gitObjectId = z.string().regex(/^(?:[a-f\d]{40}|[a-f\d]{64})$/i);
const safeRelativePath = z
  .string()
  .min(1)
  .max(512)
  .regex(/^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/);

const LineRangeSchema = z
  .tuple([z.number().int().min(1), z.number().int().min(1)])
  .refine(([start, end]) => start <= end, "El inicio debe ser menor o igual al final.");

export const ApiErrorSchema = z
  .object({ code: nonEmptyText, message: nonEmptyText })
  .strict();

export function ApiResultSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data: dataSchema }).strict(),
    z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
  ]);
}

export const EvidenceReferenceSchema = z.discriminatedUnion("source", [
  z
    .object({ source: z.literal("repository"), path: safeRelativePath, lines: LineRangeSchema, digest: sha256 })
    .strict(),
  z
    .object({ source: z.literal("proposal"), field: nonEmptyText, digest: sha256 })
    .strict(),
]);

export const FeedbackFindingSchema = z
  .object({
    criterionId: nonEmptyText,
    status: z.enum(["verified", "not_verified", "failed"]),
    evidence: z.array(EvidenceReferenceSchema).min(1),
    file: safeRelativePath.optional(),
    lines: LineRangeSchema.optional(),
    reason: nonEmptyText,
    guidanceLevel: z.number().int().min(1).max(4),
  })
  .strict();

export const RepositorySnapshotSchema = z
  .object({
    owner: z.string().regex(/^[A-Za-z0-9-]{1,39}$/),
    repo: z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/),
    commitSha: gitObjectId,
    files: z
      .array(
        z
          .object({
            path: safeRelativePath,
            content: z.string(),
            sha: gitObjectId,
          })
          .strict(),
      )
      .max(2000),
    digest: sha256,
  })
  .strict();

export const AiAnalysisSchema = z
  .object({
    rubricVersion: nonEmptyText,
    score: z.number().min(0).max(100),
    findings: z.array(FeedbackFindingSchema).min(1),
    limitations: z.array(nonEmptyText),
    modelId: nonEmptyText,
    inputDigest: sha256,
  })
  .strict();

export const InspectorChallengePublicSchema = z
  .object({
    evaluationId: nonEmptyText,
    sourceEvidence: z.array(EvidenceReferenceSchema).min(1),
    precondition: nonEmptyText,
    mutation: nonEmptyText,
    demonstration: nonEmptyText,
    restoration: nonEmptyText,
    estimatedMinutes: z.number().int().min(1).max(240),
  })
  .strict();

export const InspectorChallengeSchema = InspectorChallengePublicSchema.extend({
  teacherHint: nonEmptyText,
}).strict();

export const SubmissionSnapshotSchema = z
  .object({
    kind: z.enum(["mentor", "review"]),
    sourceId: nonEmptyText,
    score: z.number().min(0).max(100),
    snapshotJson: z.record(z.string(), z.unknown()),
    contentHash: sha256,
    verificationCode: z.string().regex(/^[A-Za-z0-9_-]{24,128}$/),
    rubricVersion: nonEmptyText,
    createdAt: z.iso.datetime(),
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
export type FeedbackFinding = z.infer<typeof FeedbackFindingSchema>;
export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;
export type InspectorChallenge = z.infer<typeof InspectorChallengeSchema>;
export type InspectorChallengePublic = z.infer<typeof InspectorChallengePublicSchema>;
export type SubmissionSnapshot = z.infer<typeof SubmissionSnapshotSchema>;
