import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f\d]{64}$/i, "Debe ser un SHA-256 hexadecimal.");
const gitObjectId = z.string().regex(/^(?:[a-f\d]{40}|[a-f\d]{64})$/i);
const safeRelativePath = z
  .string()
  .min(1)
  .max(512)
  .regex(/^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/);
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/);
const githubOwner = z.string().regex(/^[A-Za-z0-9-]{1,39}$/);
const githubRepo = z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/);

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

const ProposalDraftSchema = z.object({
  title: nonEmptyText.max(160),
  problem: nonEmptyText.max(3000),
  solution: nonEmptyText.max(3000),
  goals: z.array(nonEmptyText.max(240)).min(1).max(12),
  skills: z.array(nonEmptyText.max(80)).max(20),
  scope: nonEmptyText.max(3000),
  constraints: z.array(nonEmptyText.max(500)).max(20),
}).strict();

export const GalleryEntrySchema = z.object({
  id: identifier,
  title: nonEmptyText.max(160),
  summary: nonEmptyText.max(500),
  skills: z.array(nonEmptyText.max(80)).max(20),
  tags: z.array(nonEmptyText.max(50)).max(20),
  estimatedMinutes: z.number().int().min(1).max(2400).optional(),
}).strict();
export const GalleryResponseSchema = z.array(GalleryEntrySchema).max(500);

export const CreateProposalRequestSchema = ProposalDraftSchema;
export const ProposalResponseSchema = z.object({
  id: identifier,
  version: z.number().int().min(1),
  proposal: ProposalDraftSchema,
  updatedAt: z.iso.datetime(),
}).strict();
export const ProposalEvaluationResponseSchema = z.object({
  evaluationId: identifier,
  proposalId: identifier,
  proposalVersion: z.number().int().min(1),
  viability: z.enum(["feasible", "needs_revision", "not_feasible"]),
  analysis: AiAnalysisSchema,
  similarityMatches: z.array(z.object({
    galleryId: identifier,
    title: nonEmptyText.max(160),
    reason: nonEmptyText.max(1000),
  }).strict()).max(20),
  evaluatedAt: z.iso.datetime(),
}).strict();

export const ReviewRequestSchema = z.object({
  owner: githubOwner,
  repo: githubRepo,
  commitSha: gitObjectId,
}).strict();
export const ReviewQueuedResponseSchema = z.object({
  id: identifier,
  owner: githubOwner,
  repo: githubRepo,
  commitSha: gitObjectId,
  status: z.literal("queued"),
  createdAt: z.iso.datetime(),
}).strict();
export const ReviewResponseSchema = z.discriminatedUnion("status", [
  ReviewQueuedResponseSchema.extend({ status: z.literal("queued"), progress: z.number().int().min(0).max(100).optional(), updatedAt: z.iso.datetime().optional() }).strict(),
  z.object({
    id: identifier, owner: githubOwner, repo: githubRepo, commitSha: gitObjectId,
    status: z.literal("running"), progress: z.number().int().min(0).max(99), updatedAt: z.iso.datetime(),
  }).strict(),
  z.object({
    id: identifier, owner: githubOwner, repo: githubRepo, commitSha: gitObjectId,
    status: z.literal("completed"), analysis: AiAnalysisSchema, progress: z.literal(100), updatedAt: z.iso.datetime(),
  }).strict(),
  z.object({
    id: identifier, owner: githubOwner, repo: githubRepo, commitSha: gitObjectId,
    status: z.literal("failed"), message: nonEmptyText.max(500), updatedAt: z.iso.datetime(),
  }).strict(),
]);

export const CreateMentorSubmissionRequestSchema = z.object({
  proposalId: identifier,
  proposalVersion: z.number().int().min(1),
  evaluationId: identifier,
}).strict();
export const CreateReviewSubmissionRequestSchema = z.object({ reviewId: identifier }).strict();
export const MentorSubmissionResponseSchema = SubmissionSnapshotSchema;
export const VerifySubmissionResponseSchema = z.object({
  kind: z.enum(["mentor", "review"]),
  score: z.number().min(0).max(100),
  rubricVersion: nonEmptyText,
  createdAt: z.iso.datetime(),
  integrityValid: z.boolean(),
}).strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
export type FeedbackFinding = z.infer<typeof FeedbackFindingSchema>;
export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;
export type InspectorChallenge = z.infer<typeof InspectorChallengeSchema>;
export type InspectorChallengePublic = z.infer<typeof InspectorChallengePublicSchema>;
export type SubmissionSnapshot = z.infer<typeof SubmissionSnapshotSchema>;
export type GalleryEntry = z.infer<typeof GalleryEntrySchema>;
export type CreateProposalRequest = z.infer<typeof CreateProposalRequestSchema>;
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>;
export type ProposalEvaluationResponse = z.infer<typeof ProposalEvaluationResponseSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewQueuedResponse = z.infer<typeof ReviewQueuedResponseSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type CreateMentorSubmissionRequest = z.infer<typeof CreateMentorSubmissionRequestSchema>;
export type CreateReviewSubmissionRequest = z.infer<typeof CreateReviewSubmissionRequestSchema>;
export type MentorSubmissionResponse = z.infer<typeof MentorSubmissionResponseSchema>;
export type VerifySubmissionResponse = z.infer<typeof VerifySubmissionResponseSchema>;
