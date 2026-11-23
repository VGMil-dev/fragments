import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f\d]{64}$/i, "Debe ser un SHA-256 hexadecimal.");
const gitObjectId = z.string().regex(/^(?:[a-f\d]{40}|[a-f\d]{64})$/i);
const safeRelativePath = z
  .string()
  .min(1)
  .max(512)
  .refine((path) => {
    if (path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.includes("\\") || /\p{Cc}/u.test(path)) return false;
    return path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  }, "Debe ser una ruta relativa segura.");
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/);
const githubOwner = z.string().regex(/^[A-Za-z0-9-]{1,39}$/);
const githubRepo = z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/);

const LineRangeSchema = z
  .tuple([z.number().int().min(1), z.number().int().min(1)])
  .refine(([start, end]) => start <= end, "El inicio debe ser menor o igual al final.");

export const ApiErrorSchema = z
  .object({ code: nonEmptyText, message: nonEmptyText })
  .strict();

export const TeacherLoginRequestSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(1024) }).strict();
export const TeacherSessionResponseSchema = z.discriminatedUnion("authenticated", [
  z.object({ authenticated: z.literal(true), teacherId: identifier, expiresAt: z.number().int().positive() }).strict(),
  z.object({ authenticated: z.literal(false) }).strict(),
]);

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

export const MentorRubricCriterionSchema = z.object({
  id: identifier,
  title: nonEmptyText.max(120),
  description: nonEmptyText.max(800),
  weight: z.number().int().min(1).max(100),
}).strict();

const MentorConfigFieldsSchema = z.object({
  subject: nonEmptyText.max(120),
  theme: nonEmptyText.max(160),
  assignment: nonEmptyText.max(3000),
  expectedLevel: nonEmptyText.max(240),
  rubricTitle: nonEmptyText.max(120),
  criteria: z.array(MentorRubricCriterionSchema).min(1).max(10),
}).strict();
const validateMentorCriteria = (value: z.infer<typeof MentorConfigFieldsSchema>, context: z.RefinementCtx) => {
  const ids = new Set<string>();
  value.criteria.forEach((criterion, index) => {
    if (ids.has(criterion.id)) context.addIssue({ code: "custom", path: ["criteria", index, "id"], message: "Cada criterio necesita un identificador distinto." });
    ids.add(criterion.id);
  });
};

// F11's editable configuration stays capped at 20 requirements. F18.B adds up to
// 12 objectives and 20 required + 20 optional skills to that published snapshot.
export const MentorControlConfigSchema = MentorConfigFieldsSchema.extend({
  requirements: z.array(nonEmptyText.max(500)).max(20),
}).strict().superRefine(validateMentorCriteria);
export const MentorEvaluationConfigSchema = MentorConfigFieldsSchema.extend({
  requirements: z.array(nonEmptyText.max(500)).max(72),
}).strict().superRefine(validateMentorCriteria);

export const MentorPublishedConfigSchema = z.object({
  version: z.number().int().positive(),
  config: MentorControlConfigSchema,
  publishedAt: z.iso.datetime(),
}).strict();
export const MentorEvaluationContextSchema = z.object({
  version: z.number().int().positive(),
  config: MentorEvaluationConfigSchema,
  publishedAt: z.iso.datetime(),
}).strict();

export const MentorDraftConfigSchema = z.object({
  config: MentorControlConfigSchema,
  updatedAt: z.iso.datetime(),
}).strict();

export const MentorCriterionBreakdownSchema = z.object({
  criterionId: identifier,
  title: nonEmptyText.max(120),
  weight: z.number().int().min(1).max(100),
  status: z.enum(["verified", "not_verified", "failed"]),
  points: z.number().int().min(0).max(100),
  reason: nonEmptyText.max(1000),
  guidanceLevel: z.number().int().min(1).max(4),
}).strict();

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

export const InspectorDefenseRecordRequestSchema = z.object({
  mutationObserved: z.boolean(),
  restorationConfirmed: z.boolean(),
  notes: z.string().trim().max(2000),
}).strict();

export const InspectorDefenseRecordSchema = InspectorDefenseRecordRequestSchema.extend({
  recordedAt: z.iso.datetime(),
}).strict();

export const InspectorChallengeStatusSchema = z.enum(["pending", "assigned", "completed", "obsolete"]);

export const InspectorChallengeRecordResponseSchema = z.object({
  id: identifier,
  reviewId: identifier,
  projectId: identifier,
  commitSha: gitObjectId,
  challenge: InspectorChallengeSchema,
  status: InspectorChallengeStatusSchema,
  createdAt: z.iso.datetime(),
  assignedTo: identifier.optional(),
  assignedAt: z.iso.datetime().optional(),
  supersededByCommitSha: gitObjectId.optional(),
  defense: InspectorDefenseRecordSchema.optional(),
}).strict();

export const InspectorChallengeRecordsResponseSchema = z.array(InspectorChallengeRecordResponseSchema).max(500);

export const InspectorStudentChallengeResponseSchema = z.object({
  id: identifier,
  status: z.enum(["assigned", "completed"]),
  challenge: InspectorChallengePublicSchema,
}).strict();

export const InspectorAssignChallengeRequestSchema = z.object({}).strict();

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

export const ProposalMentorSkillsSchema = z.object({
  classroomId: identifier.nullable(),
  selectedSkillIds: z.array(identifier).max(20).refine((ids) => new Set(ids).size === ids.length, "No repitas habilidades seleccionadas."),
}).strict().refine((selection) => selection.classroomId !== null || selection.selectedSkillIds.length === 0, {
  message: "Elige un aula antes de seleccionar habilidades.",
  path: ["selectedSkillIds"],
});

const ProposalDraftSchema = z.object({
  title: nonEmptyText.max(160),
  problem: nonEmptyText.max(3000),
  solution: nonEmptyText.max(3000),
  description: nonEmptyText.max(3000).optional(),
  purpose: nonEmptyText.max(1000).optional(),
  goals: z.array(nonEmptyText.max(240)).min(1).max(12),
  skills: z.array(nonEmptyText.max(80)).max(20),
  mentorSkills: ProposalMentorSkillsSchema.optional(),
  technologies: z.array(nonEmptyText.max(80)).max(20).optional(),
  technologyIds: z.array(identifier).max(20).optional(),
  expectedOutcome: z.string().max(3000).optional(),
  tags: z.array(nonEmptyText.max(50)).max(20).default([]),
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

const githubLogin = z.string().regex(/^[A-Za-z0-9-]{1,39}$/);
export const StudentMeSchema = z.object({
  authenticated: z.literal(true),
  id: identifier,
  githubLogin: githubLogin.nullable(),
  avatarUrl: z.url().nullable(),
  profileUrl: z.url().nullable(),
  registeredAt: z.iso.datetime(),
}).strict();
export const MeResponseSchema = z.discriminatedUnion("authenticated", [
  StudentMeSchema,
  z.object({
    authenticated: z.literal(false),
    githubOAuthConfigured: z.boolean(),
    reason: z.enum(["session_required", "role_not_student", "github_account_not_linked", "invalid_github_identity"]),
  }).strict(),
]);
export const AcademicGalleryEntrySchema = z.object({
  id: identifier,
  title: nonEmptyText.max(160),
  summary: nonEmptyText.max(500),
  problem: nonEmptyText.max(3000),
  solution: nonEmptyText.max(3000),
  goals: z.array(nonEmptyText.max(240)).min(1).max(12),
  skills: z.array(nonEmptyText.max(80)).max(20),
  tags: z.array(nonEmptyText.max(50)).max(20),
  scope: nonEmptyText.max(3000),
  constraints: z.array(nonEmptyText.max(500)).max(20),
  author: z.object({ login: githubLogin, profileUrl: z.url(), avatarUrl: z.url().nullable() }).strict(),
  subject: nonEmptyText.max(120),
  theme: nonEmptyText.max(160),
  assignment: nonEmptyText.max(3000),
  proposalVersion: z.number().int().positive(),
  rubricVersion: z.number().int().positive(),
  rubricTitle: nonEmptyText.max(120),
  publishedAt: z.iso.datetime(),
  academicStatus: z.literal("Evaluada"),
}).strict();
export const AcademicGalleryPageSchema = z.object({
  items: z.array(AcademicGalleryEntrySchema).max(50),
  nextOffset: z.number().int().min(0).nullable(),
}).strict();
export const AcademicGalleryDetailSchema = z.object({
  project: AcademicGalleryEntrySchema,
  history: z.array(AcademicGalleryEntrySchema).max(200),
}).strict();
export const TeacherStudentEntrySchema = z.object({
  id: identifier,
  githubLogin,
  avatarUrl: z.url().nullable(),
  profileUrl: z.url(),
  registeredAt: z.iso.datetime(),
  projectCount: z.number().int().min(0),
}).strict();
export const TeacherStudentsPageSchema = z.object({
  items: z.array(TeacherStudentEntrySchema).max(50),
  nextOffset: z.number().int().min(0).nullable(),
}).strict();
const classroomText = (max: number) => z.string().trim().min(1).max(max);
export const ClassroomStatusSchema = z.enum(["active", "archived"]);
export const ClassroomSchema = z.object({
  id: identifier, title: classroomText(120), subject: classroomText(120), groupLabel: classroomText(80).nullable(),
  period: z.string().trim().max(80).nullable(), context: z.string().trim().max(2000).nullable(),
  status: ClassroomStatusSchema, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export const ClassroomSummarySchema = ClassroomSchema.omit({ context: true });
export const ClassroomPageSchema = z.object({ items: z.array(ClassroomSummarySchema).max(50), nextOffset: z.number().int().min(0).nullable() }).strict();
export const TeacherDashboardSummarySchema = z.object({
  totalClassrooms: z.number().int().min(0),
  pendingJoinRequests: z.number().int().min(0),
  classrooms: z.array(ClassroomSummarySchema).max(4),
}).strict();
export const ClassroomCreateRequestSchema = z.object({
  title: classroomText(120), subject: classroomText(120), groupLabel: classroomText(80).nullable().optional(),
  period: z.string().trim().max(80).nullable().optional(), context: z.string().trim().max(2000).nullable().optional(),
}).strict();
export const ClassroomUpdateRequestSchema = ClassroomCreateRequestSchema.partial().extend({ status: ClassroomStatusSchema.optional() }).strict()
  .refine((input) => Object.keys(input).length > 0, "Indica al menos un campo para actualizar.");
export const ClassroomJoinCodeRequestSchema = z.object({ expiresInDays: z.number().int().min(1).max(90).nullable().optional() }).strict();
export const ClassJoinCodeSchema = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/), expiresAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime() }).strict();
export const ClassEnrollmentStatusSchema = z.enum(["pending", "active", "rejected", "removed"]);
export const ClassEnrollmentSourceSchema = z.enum(["join_code", "teacher_assignment"]);
export const ClassEnrollmentSchema = z.object({
  id: identifier, studentId: identifier, githubLogin: githubLogin.nullable(), status: ClassEnrollmentStatusSchema,
  source: ClassEnrollmentSourceSchema, requestedAt: z.iso.datetime(), decidedAt: z.iso.datetime().nullable(),
}).strict();
export const ClassEnrollmentsResponseSchema = z.array(ClassEnrollmentSchema).max(500);
export const StudentClassroomRequestSchema = z.object({
  id: identifier, status: ClassEnrollmentStatusSchema, source: ClassEnrollmentSourceSchema,
  requestedAt: z.iso.datetime(), decidedAt: z.iso.datetime().nullable(),
}).strict();
export const StudentClassroomRequestsSchema = z.array(StudentClassroomRequestSchema).max(200);
export const StudentClassroomsSchema = z.array(ClassroomSummarySchema).max(200);
export const DirectEnrollmentRequestSchema = z.object({ studentId: identifier }).strict();
export const JoinClassroomRequestSchema = z.object({ code: z.string().trim().regex(/^[A-Za-z0-9_-]{32,64}$/) }).strict();
export const SkillCatalogEntrySchema = z.object({
  id: identifier, name: classroomText(100), description: z.string().trim().max(1000).nullable(), archived: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export const SkillCatalogResponseSchema = z.array(SkillCatalogEntrySchema).max(500);
export const SkillCreateRequestSchema = z.object({ name: classroomText(100), description: z.string().trim().max(1000).nullable().optional() }).strict();
export const SkillUpdateRequestSchema = SkillCreateRequestSchema.partial().strict().refine((input) => Object.keys(input).length > 0, "Indica al menos un campo para actualizar.");
export const ClassroomSkillsResponseSchema = z.array(SkillCatalogEntrySchema.extend({ enabled: z.boolean() })).max(500);
export const ClassroomSkillAvailabilitySchema = z.object({ classroomId: identifier, skillId: identifier, enabled: z.boolean(), updatedAt: z.iso.datetime() }).strict();
// F18.B missions: draft edits are mutable; each published version is an immutable snapshot.
export const AssignmentStatusSchema = z.enum(["draft", "published", "archived"]);
export const AssignmentRequiredSkillSchema = z.object({ id: identifier, name: classroomText(100) }).strict();
export const AssignmentSkillSnapshotSchema = AssignmentRequiredSkillSchema.extend({ description: z.string().trim().max(1000).nullable() }).strict();
const AssignmentDraftFieldsSchema = z.object({
  title: classroomText(160),
  instructions: classroomText(5000),
  objectives: z.array(classroomText(240)).min(1).max(12),
  requiredSkillIds: z.array(identifier).min(1).max(20),
  optionalSkillIds: z.array(identifier).max(20),
}).strict();
const assignmentSkillListsAreDisjoint = (value: { requiredSkillIds: string[]; optionalSkillIds: string[] }) => new Set([...value.requiredSkillIds, ...value.optionalSkillIds]).size === value.requiredSkillIds.length + value.optionalSkillIds.length;
export const AssignmentDraftSchema = AssignmentDraftFieldsSchema.refine(assignmentSkillListsAreDisjoint, {
  message: "Una habilidad no puede ser obligatoria y optativa a la vez.",
});
const AssignmentVersionFieldsSchema = AssignmentDraftFieldsSchema.extend({
  id: identifier,
  assignmentId: identifier,
  version: z.number().int().positive(),
  status: z.literal("published"),
  requiredSkills: z.array(AssignmentSkillSnapshotSchema).min(1).max(20),
  optionalSkills: z.array(AssignmentSkillSnapshotSchema).max(20),
  mentorContextVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
}).omit({ requiredSkillIds: true, optionalSkillIds: true }).strict();
export const AssignmentVersionSchema = AssignmentVersionFieldsSchema;
export const ClassroomAssignmentSchema = z.object({
  id: identifier, classroomId: identifier, status: AssignmentStatusSchema,
  draftVersion: z.number().int().positive(), publishedVersion: z.number().int().positive().nullable(),
  draft: AssignmentDraftSchema.nullable(), versions: z.array(AssignmentVersionSchema).max(50), updatedAt: z.iso.datetime(),
}).strict();
export const ClassroomAssignmentsResponseSchema = z.array(ClassroomAssignmentSchema).max(200);
export const StudentAssignmentSchema = AssignmentVersionFieldsSchema.extend({
  classroomId: identifier, classroomTitle: classroomText(120), subject: classroomText(120),
  mentorContext: MentorEvaluationContextSchema,
}).strict();
export const StudentAssignmentsResponseSchema = z.array(StudentAssignmentSchema).max(200);
export const CreateAssignmentRequestSchema = AssignmentDraftSchema;
export const UpdateAssignmentDraftRequestSchema = AssignmentDraftSchema.extend({ expectedVersion: z.number().int().positive() }).strict();
export const PublishAssignmentRequestSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const TechnologyCatalogEntrySchema = z.object({
  id: identifier, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), name: classroomText(100), description: z.string().trim().max(1000).nullable(),
}).strict();
export const TechnologyCatalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), cursor: identifier.optional(), selectedIds: z.array(identifier).max(20).optional(),
}).strict();
export const TechnologyCatalogPageSchema = z.object({ items: z.array(TechnologyCatalogEntrySchema).max(70), nextCursor: identifier.nullable() }).strict();
export const SuggestedTechnologiesPageSchema = TechnologyCatalogPageSchema;
export const ClassroomJoinCodeRevocationSchema = z.object({ revoked: z.literal(true) }).strict();
export const ClassEnrollmentTransitionSchema = z.object({ status: z.enum(["active", "rejected", "removed"]) }).strict();
export const TeacherProjectSchema = z.object({
  id: identifier,
  title: nonEmptyText.max(160),
  ownerGithubLogin: githubLogin.nullable(),
  currentVersion: z.number().int().positive(),
  withdrawn: z.boolean(),
  withdrawalReason: nonEmptyText.max(1000).nullable(),
  withdrawnAt: z.iso.datetime().nullable(),
  history: z.array(z.object({
    version: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
    proposal: ProposalDraftSchema.omit({ mentorSkills: true }),
    published: z.boolean(),
    contextVersion: z.number().int().positive().nullable(),
    subject: nonEmptyText.max(120).nullable(),
    theme: nonEmptyText.max(160).nullable(),
    rubricTitle: nonEmptyText.max(120).nullable(),
  }).strict()).max(200),
}).strict();
export const TeacherProjectsResponseSchema = z.array(TeacherProjectSchema).max(200);
export const HistoricalProjectsResponseSchema = z.array(z.object({ id: identifier, title: nonEmptyText.max(160), currentVersion: z.number().int().positive(), updatedAt: z.iso.datetime() }).strict()).max(200);
export const GalleryWithdrawalRequestSchema = z.object({ reason: nonEmptyText.max(1000) }).strict();
export const GalleryWithdrawalResponseSchema = z.object({ withdrawn: z.literal(true) }).strict();

export const CreateProposalRequestSchema = ProposalDraftSchema;
export const ProposalDraftFieldsSchema = z.object({
  title: z.string().max(160).optional(),
  problem: z.string().max(3000).optional(),
  solution: z.string().max(3000).optional(),
  description: z.string().max(3000).optional(),
  purpose: z.string().max(1000).optional(),
  goals: z.array(nonEmptyText.max(240)).max(12).optional(),
  skills: z.array(nonEmptyText.max(80)).max(20).optional(),
  mentorSkills: ProposalMentorSkillsSchema.optional(),
  technologies: z.array(nonEmptyText.max(80)).max(20).optional(),
  technologyIds: z.array(identifier).max(20).optional(),
  expectedOutcome: z.string().max(3000).optional(),
  tags: z.array(nonEmptyText.max(50)).max(20).optional(),
  scope: z.string().max(3000).optional(),
  constraints: z.array(nonEmptyText.max(500)).max(20).optional(),
}).strict();
export const ProposalEvaluationInputSchema = ProposalDraftSchema.extend({
  description: nonEmptyText.max(3000),
  purpose: nonEmptyText.max(1000),
}).strict();
export const CreateProposalDraftRequestSchema = z.object({ proposal: ProposalDraftFieldsSchema, assignmentVersionId: identifier.optional() }).strict();
export const UpdateProposalDraftRequestSchema = z.object({
  expectedVersion: z.number().int().min(1),
  proposal: ProposalDraftFieldsSchema,
}).strict();
export const UpdateProposalRequestSchema = ProposalDraftSchema.extend({
  expectedVersion: z.number().int().min(1),
}).strict();
export const GalleryOptInRequestSchema = z.object({ optIn: z.boolean() }).strict();
export const ProposalResponseSchema = z.object({
  id: identifier,
  version: z.number().int().min(1),
  proposal: ProposalDraftSchema,
  assignmentVersionId: identifier.nullable().optional(),
  updatedAt: z.iso.datetime(),
}).strict();
export const ProposalDraftResponseSchema = z.object({
  id: identifier,
  version: z.number().int().min(1),
  proposal: ProposalDraftFieldsSchema,
  assignmentVersionId: identifier.nullable().optional(),
  assignmentContext: z.object({ assignmentVersionId: identifier, requiredSkills: z.array(AssignmentRequiredSkillSchema).max(20), mentorContext: MentorEvaluationContextSchema }).strict().nullable().optional(),
  updatedAt: z.iso.datetime(),
}).strict();
export const OwnedProposalsResponseSchema = z.array(ProposalDraftResponseSchema).max(200);
export const StudentSubmissionSchema = z.object({
  id: identifier,
  kind: z.enum(["mentor", "review"]),
  sourceId: identifier,
  label: nonEmptyText.max(200),
  score: z.number().min(0).max(100),
  rubricVersion: nonEmptyText.max(120),
  createdAt: z.iso.datetime(),
}).strict();
export const StudentSubmissionsResponseSchema = z.array(StudentSubmissionSchema).max(200);
export const ProposalEvaluationResponseSchema = z.object({
  evaluationId: identifier,
  proposalId: identifier,
  proposalVersion: z.number().int().min(1),
  viability: z.enum(["feasible", "needs_revision", "not_feasible"]),
  analysis: AiAnalysisSchema,
  guidance: z.array(nonEmptyText.max(1000)).max(12),
  similarityMatches: z.array(z.object({
    galleryId: identifier,
    title: nonEmptyText.max(160),
    reason: nonEmptyText.max(1000),
  }).strict()).max(20),
  mentorContextVersion: z.number().int().positive().optional(),
  mentorContext: MentorEvaluationConfigSchema.optional(),
  criterionBreakdown: z.array(MentorCriterionBreakdownSchema).max(10).optional(),
  evaluatedAt: z.iso.datetime(),
}).strict();

export const MentorControlEvaluationHistoryItemSchema = z.object({
  evaluationId: identifier,
  proposalId: identifier,
  proposalVersion: z.number().int().positive(),
  proposalTitle: nonEmptyText.max(160),
  evaluatedAt: z.iso.datetime(),
  evaluation: ProposalEvaluationResponseSchema,
}).strict();

export const MentorControlWorkspaceResponseSchema = z.object({
  draft: MentorDraftConfigSchema,
  active: MentorPublishedConfigSchema,
  evaluations: z.array(MentorControlEvaluationHistoryItemSchema).max(100),
}).strict();

export const ReviewRequestSchema = z.object({
  owner: githubOwner,
  repo: githubRepo,
  commitSha: gitObjectId,
  linkedProposalId: identifier.optional(),
}).strict();
export const ReviewAcademicLinkSchema = z.object({
  proposalId: identifier,
  proposalVersion: z.number().int().positive(),
  proposalTitle: z.string().max(160),
  assignmentVersionId: identifier,
  missionTitle: nonEmptyText.max(160),
  missionVersion: z.number().int().positive(),
  mentorContextVersion: z.number().int().positive(),
  classroomId: identifier,
  classroomTitle: nonEmptyText.max(160),
  requiredSkills: z.array(classroomText(100)).max(20).optional(),
}).strict();
export const TeacherClassroomReviewSchema = z.object({
  reviewId: identifier,
  studentLabel: nonEmptyText.max(100),
  proposalTitle: z.string().max(160),
  proposalVersion: z.number().int().positive(),
  missionTitle: nonEmptyText.max(160),
  missionVersion: z.number().int().positive(),
  mentorContextVersion: z.number().int().positive(),
  repositoryOwner: githubOwner,
  repositoryName: githubRepo,
  commitSha: gitObjectId,
  status: z.enum(["queued", "running", "completed", "failed"]),
  score: z.number().min(0).max(100).optional(),
  updatedAt: z.iso.datetime(),
}).strict();
export const TeacherClassroomReviewsResponseSchema = z.array(TeacherClassroomReviewSchema).max(100);
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
export const SubmissionResponseSchema = SubmissionSnapshotSchema.extend({ id: identifier }).strict();
export const MentorSubmissionResponseSchema = SubmissionResponseSchema;
export const ReviewSubmissionResponseSchema = SubmissionResponseSchema;
export const VerifySubmissionResponseSchema = z.object({
  kind: z.enum(["mentor", "review"]),
  score: z.number().min(0).max(100),
  rubricVersion: nonEmptyText,
  createdAt: z.iso.datetime(),
  integrityValid: z.boolean(),
}).strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type TeacherLoginRequest = z.infer<typeof TeacherLoginRequestSchema>;
export type TeacherSessionResponse = z.infer<typeof TeacherSessionResponseSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
export type FeedbackFinding = z.infer<typeof FeedbackFindingSchema>;
export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;
export type MentorRubricCriterion = z.infer<typeof MentorRubricCriterionSchema>;
export type MentorControlConfig = z.infer<typeof MentorControlConfigSchema>;
export type MentorEvaluationConfig = z.infer<typeof MentorEvaluationConfigSchema>;
export type MentorPublishedConfig = z.infer<typeof MentorPublishedConfigSchema>;
export type MentorDraftConfig = z.infer<typeof MentorDraftConfigSchema>;
export type MentorCriterionBreakdown = z.infer<typeof MentorCriterionBreakdownSchema>;
export type InspectorChallenge = z.infer<typeof InspectorChallengeSchema>;
export type InspectorChallengePublic = z.infer<typeof InspectorChallengePublicSchema>;
export type InspectorDefenseRecordRequest = z.infer<typeof InspectorDefenseRecordRequestSchema>;
export type InspectorChallengeRecordResponse = z.infer<typeof InspectorChallengeRecordResponseSchema>;
export type InspectorStudentChallengeResponse = z.infer<typeof InspectorStudentChallengeResponseSchema>;
export type SubmissionSnapshot = z.infer<typeof SubmissionSnapshotSchema>;
export type GalleryEntry = z.infer<typeof GalleryEntrySchema>;
export type StudentMe = z.infer<typeof StudentMeSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type AcademicGalleryEntry = z.infer<typeof AcademicGalleryEntrySchema>;
export type AcademicGalleryPage = z.infer<typeof AcademicGalleryPageSchema>;
export type AcademicGalleryDetail = z.infer<typeof AcademicGalleryDetailSchema>;
export type TeacherStudentEntry = z.infer<typeof TeacherStudentEntrySchema>;
export type TeacherStudentsPage = z.infer<typeof TeacherStudentsPageSchema>;
export type Classroom = z.infer<typeof ClassroomSchema>;
export type ClassroomSummary = z.infer<typeof ClassroomSummarySchema>;
export type ClassroomPage = z.infer<typeof ClassroomPageSchema>;
export type TeacherDashboardSummary = z.infer<typeof TeacherDashboardSummarySchema>;
export type ClassroomCreateRequest = z.infer<typeof ClassroomCreateRequestSchema>;
export type ClassroomUpdateRequest = z.infer<typeof ClassroomUpdateRequestSchema>;
export type ClassJoinCode = z.infer<typeof ClassJoinCodeSchema>;
export type ClassEnrollment = z.infer<typeof ClassEnrollmentSchema>;
export type StudentClassroomRequest = z.infer<typeof StudentClassroomRequestSchema>;
export type SkillCatalogEntry = z.infer<typeof SkillCatalogEntrySchema>;
export type ClassroomSkills = z.infer<typeof ClassroomSkillsResponseSchema>;
export type TechnologyCatalogEntry = z.infer<typeof TechnologyCatalogEntrySchema>;
export type TechnologyCatalogQuery = z.infer<typeof TechnologyCatalogQuerySchema>;
export type TechnologyCatalogPage = z.infer<typeof TechnologyCatalogPageSchema>;
export type SuggestedTechnologiesPage = z.infer<typeof SuggestedTechnologiesPageSchema>;
export type ClassEnrollmentTransition = z.infer<typeof ClassEnrollmentTransitionSchema>;
export type TeacherProject = z.infer<typeof TeacherProjectSchema>;
export type TeacherProjectsResponse = z.infer<typeof TeacherProjectsResponseSchema>;
export type CreateProposalRequest = z.infer<typeof CreateProposalRequestSchema>;
export type ProposalDraftFields = z.infer<typeof ProposalDraftFieldsSchema>;
export type ProposalEvaluationInput = z.infer<typeof ProposalEvaluationInputSchema>;
export type CreateProposalDraftRequest = z.infer<typeof CreateProposalDraftRequestSchema>;
export type UpdateProposalDraftRequest = z.infer<typeof UpdateProposalDraftRequestSchema>;
export type UpdateProposalRequest = z.infer<typeof UpdateProposalRequestSchema>;
export type GalleryOptInRequest = z.infer<typeof GalleryOptInRequestSchema>;
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>;
export type ProposalDraftResponse = z.infer<typeof ProposalDraftResponseSchema>;
export type StudentSubmission = z.infer<typeof StudentSubmissionSchema>;
export type StudentSubmissionsResponse = z.infer<typeof StudentSubmissionsResponseSchema>;
export type ProposalEvaluationResponse = z.infer<typeof ProposalEvaluationResponseSchema>;
export type MentorControlEvaluationHistoryItem = z.infer<typeof MentorControlEvaluationHistoryItemSchema>;
export type MentorControlWorkspaceResponse = z.infer<typeof MentorControlWorkspaceResponseSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewAcademicLink = z.infer<typeof ReviewAcademicLinkSchema>;
export type TeacherClassroomReview = z.infer<typeof TeacherClassroomReviewSchema>;
export type ReviewQueuedResponse = z.infer<typeof ReviewQueuedResponseSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type CreateMentorSubmissionRequest = z.infer<typeof CreateMentorSubmissionRequestSchema>;
export type CreateReviewSubmissionRequest = z.infer<typeof CreateReviewSubmissionRequestSchema>;
export type MentorSubmissionResponse = z.infer<typeof MentorSubmissionResponseSchema>;
export type ReviewSubmissionResponse = z.infer<typeof ReviewSubmissionResponseSchema>;
export type VerifySubmissionResponse = z.infer<typeof VerifySubmissionResponseSchema>;
export type AssignmentDraft = z.infer<typeof AssignmentDraftSchema>;
export type AssignmentVersion = z.infer<typeof AssignmentVersionSchema>;
export type ClassroomAssignment = z.infer<typeof ClassroomAssignmentSchema>;
export type StudentAssignment = z.infer<typeof StudentAssignmentSchema>;
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;
export type UpdateAssignmentDraftRequest = z.infer<typeof UpdateAssignmentDraftRequestSchema>;
export type PublishAssignmentRequest = z.infer<typeof PublishAssignmentRequestSchema>;
