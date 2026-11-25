import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AiAnalysisSchema,
  MentorControlConfigSchema,
  MentorEvaluationConfigSchema,
  MentorPublishedConfigSchema,
  MentorCriterionBreakdownSchema,
  ApiResultSchema,
  CreateMentorSubmissionRequestSchema,
  CreateProposalRequestSchema,
  CreateProposalDraftRequestSchema,
  ProposalDraftFieldsSchema,
  ProposalDraftResponseSchema,
  ProposalEvaluationInputSchema,
  ProposalMentorSkillsSchema,
  GalleryOptInRequestSchema,
  CreateReviewSubmissionRequestSchema,
  EvidenceReferenceSchema,
  GalleryEntrySchema,
  GalleryResponseSchema,
  FeedbackFindingSchema,
  InspectorChallengePublicSchema,
  InspectorChallengeSchema,
  InspectorChallengeRecordResponseSchema,
  InspectorDefenseRecordRequestSchema,
  InspectorStudentChallengeResponseSchema,
  MentorSubmissionResponseSchema,
  ProposalEvaluationResponseSchema,
  ProposalResponseSchema,
  UpdateProposalRequestSchema,
  TeacherLoginRequestSchema,
  TeacherSessionResponseSchema,
  ReviewRequestSchema,
  ReviewAcademicLinkSchema,
  MissionDeliveryHistorySchema,
  ReviewResponseSchema,
  ReviewQueuedResponseSchema,
  TeacherClassroomReviewsResponseSchema,
  TeacherStudentIdentityPageSchema,
  RepositorySnapshotSchema,
  SubmissionSnapshotSchema,
  VerifySubmissionResponseSchema,
  ClassJoinCodeSchema,
  ClassroomSchema,
  ClassroomSummarySchema,
  TeacherDashboardSummarySchema,
  ClassroomJoinCodeRevocationSchema,
  ClassEnrollmentTransitionSchema,
  ClassroomCreateRequestSchema,
  ClassroomUpdateRequestSchema,
  SkillCreateRequestSchema,
  AssignmentDraftSchema,
  AssignmentPublicationSchema,
  AssignmentVersionSchema,
  StudentAssignmentSchema,
} from "./index.js";

const digest = "a".repeat(64);
const now = "2026-11-04T12:00:00.000Z";

const proposal = {
  title: "Huerto escolar interactivo",
  problem: "El curso no cuenta con una forma sencilla de registrar el crecimiento de sus plantas.",
  solution: "Una aplicación local registra medidas y muestra cómo cambian con el tiempo.",
  goals: ["Registrar medidas semanales", "Comparar el crecimiento por planta"],
  skills: ["TypeScript", "SQLite"],
  scope: "Una pantalla de registro, una tabla local y un resumen visual.",
  constraints: ["Debe funcionar en el laboratorio sin conexión"],
};

const analysis = {
  rubricVersion: "1.0.0",
  score: 78,
  findings: [
    {
      criterionId: "scope",
      status: "verified" as const,
      evidence: [{ source: "proposal" as const, field: "scope", digest }],
      reason: "El alcance cabe en un prototipo formativo.",
      guidanceLevel: 1,
    },
  ],
  limitations: [],
  modelId: "fake/local",
  inputDigest: digest,
};

describe("shared API contracts", () => {
  it("validates assignment identities without private project counts", () => {
    const identity = { id: "student-1", githubLogin: "fixture-student", avatarUrl: null, profileUrl: "https://github.com/fixture-student", registeredAt: now };
    expect(TeacherStudentIdentityPageSchema.safeParse({ items: [identity], nextOffset: null }).success).toBe(true);
    expect(TeacherStudentIdentityPageSchema.safeParse({ items: [{ ...identity, projectCount: 4 }], nextOffset: null }).success).toBe(false);
  });

  it("keeps mission required and optional skills disjoint and snapshots published versions", () => {
    const rubric = { title: "Rúbrica de misión", criteria: [{ id: "criterion-a", title: "Navegación", description: "La acción lleva a la pantalla esperada.", weight: 100 }] };
    const deliverables = [
      { id: "delivery-proposal", order: 1, title: "Propuesta", type: "proposal", requirements: ["Describe una solución comprobable."], dueDate: null, criterionIds: ["criterion-a"] },
      { id: "delivery-progress", order: 2, title: "Avance", type: "progress", requirements: ["Presenta el recorrido implementado."], dueDate: "2026-12-10", criterionIds: ["criterion-a"] },
    ];
    const draft = { title: "Lista de tareas", instructions: "Construye una lista con Expo.", objectives: ["Agregar y completar una tarea"], requiredSkillIds: ["skill-a"], optionalSkillIds: ["skill-b"], missionRubric: rubric, deliverables };
    expect(AssignmentDraftSchema.safeParse(draft).success).toBe(true);
    expect(AssignmentPublicationSchema.safeParse(draft).success).toBe(true);
    expect(AssignmentDraftSchema.safeParse({ ...draft, optionalSkillIds: ["skill-a"] }).success).toBe(false);
    expect(AssignmentDraftSchema.safeParse({ ...draft, teacherId: "teacher-1" }).success).toBe(false);
    expect(AssignmentPublicationSchema.safeParse({ ...draft, missionRubric: { ...rubric, criteria: [{ ...rubric.criteria[0], weight: 99 }] } }).success).toBe(false);
    expect(AssignmentDraftSchema.safeParse({ ...draft, missionRubric: { ...rubric, criteria: [rubric.criteria[0], { ...rubric.criteria[0] }] } }).success).toBe(false);
    expect(AssignmentPublicationSchema.safeParse({ ...draft, deliverables: [deliverables[0]] }).success).toBe(false);
    expect(AssignmentDraftSchema.safeParse({ ...draft, deliverables: [{ ...deliverables[1], criterionIds: ["missing-criterion"] }] }).success).toBe(false);
    expect(AssignmentDraftSchema.safeParse({ ...draft, deliverables: [deliverables[0], { ...deliverables[1], order: 3 }] }).success).toBe(false);
    const version = { id: "version-1", assignmentId: "assignment-1", version: 1, status: "published", title: draft.title, instructions: draft.instructions, objectives: draft.objectives,
      requiredSkills: [{ id: "skill-a", name: "React Native", description: null }], optionalSkills: [{ id: "skill-b", name: "Expo", description: "Herramientas de Expo." }], mentorContextVersion: 1, createdAt: now };
    expect(AssignmentVersionSchema.safeParse(version).success).toBe(true);
    expect(AssignmentVersionSchema.safeParse({ ...version, version: 0 }).success).toBe(false);
    expect(AssignmentVersionSchema.safeParse({ ...version, missionRubric: rubric, deliverables }).success).toBe(true);
    const effectiveConfig = { subject: "Programación", theme: "Lista de tareas", assignment: "Construye una lista con Expo.",
      requirements: Array.from({ length: 72 }, (_, index) => `Criterio ${index + 1}`), expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11",
      criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cambios observables en código.", weight: 100 }] };
    const studentAssignment = { ...version, classroomId: "classroom-1", classroomTitle: "Programación Móvil", subject: "Programación",
      mentorContext: { version: 1, publishedAt: now, config: effectiveConfig }, missionPlanVersion: 1 };
    expect(StudentAssignmentSchema.safeParse(studentAssignment).success).toBe(true);
    expect(StudentAssignmentSchema.safeParse({ ...studentAssignment, missionPlanVersion: undefined })).toMatchObject({ success: true, data: { missionPlanVersion: 0 } });
    expect(MentorPublishedConfigSchema.safeParse({ version: 1, publishedAt: now,
      config: { ...effectiveConfig, requirements: Array.from({ length: 21 }, (_, index) => `F11 ${index + 1}`) } }).success).toBe(false);
  });

  it("validates classroom input without accepting client-supplied ownership", () => {
    const valid = { title: "Grupo A", subject: "Programación", groupLabel: "10A" };
    expect(ClassroomCreateRequestSchema.safeParse(valid).success).toBe(true);
    expect(ClassroomCreateRequestSchema.safeParse({ title: "Programación móvil", subject: "Programación móvil" }).success).toBe(true);
    expect(ClassroomCreateRequestSchema.safeParse({ title: "Programación móvil", subject: "Programación móvil", groupLabel: null }).success).toBe(true);
    expect(ClassroomCreateRequestSchema.safeParse({ ...valid, groupLabel: null }).success).toBe(true);
    expect(ClassroomCreateRequestSchema.safeParse({ ...valid, teacherId: "teacher-1" }).success).toBe(false);
    expect(ClassroomUpdateRequestSchema.safeParse({}).success).toBe(false);
  });

  it("keeps historical classroom labels and represents thematic classrooms without a school group", () => {
    const base = {
      id: "classroom-1", title: "Programación móvil", subject: "Programación móvil", period: null,
      status: "active", createdAt: now, updatedAt: now,
    };
    expect(ClassroomSchema.safeParse({ ...base, context: null, groupLabel: null }).success).toBe(true);
    expect(ClassroomSummarySchema.safeParse({ ...base, groupLabel: null }).success).toBe(true);
    expect(ClassroomSummarySchema.safeParse({ ...base, groupLabel: "10A" }).success).toBe(true);
    expect(ClassroomSchema.safeParse({ ...base, context: null, groupLabel: "10A" }).success).toBe(true);
  });

  it("validates the minimal teacher dashboard summary", () => {
    const classroom = {
      id: "classroom-1", title: "Programación móvil", subject: "Programación móvil", groupLabel: null,
      period: null, status: "archived", createdAt: now, updatedAt: now,
    };
    const tooManyClassrooms = Array.from({ length: 5 }, (_, index) => ({ ...classroom, id: `classroom-${index}` }));
    expect(TeacherDashboardSummarySchema.safeParse({ totalClassrooms: 3, pendingJoinRequests: 0, classrooms: [classroom] }).success).toBe(true);
    expect(TeacherDashboardSummarySchema.safeParse({ totalClassrooms: -1, pendingJoinRequests: 0, classrooms: [] }).success).toBe(false);
    expect(TeacherDashboardSummarySchema.safeParse({ totalClassrooms: 0, pendingJoinRequests: 0, classrooms: tooManyClassrooms }).success).toBe(false);
  });

  it("exposes only the join code and safe expiry metadata", () => {
    const publicCode = { code: "A".repeat(43), expiresAt: null, createdAt: new Date().toISOString() };
    expect(ClassJoinCodeSchema.safeParse(publicCode).success).toBe(true);
    expect(ClassJoinCodeSchema.safeParse({ ...publicCode, codeHash: "secret" }).success).toBe(false);
  });

  it("validates code revocation responses and enrollment transitions", () => {
    expect(ClassroomJoinCodeRevocationSchema.safeParse({ revoked: true }).success).toBe(true);
    expect(ClassroomJoinCodeRevocationSchema.safeParse({ revoked: true, codeHash: "private" }).success).toBe(false);
    expect(ClassroomJoinCodeRevocationSchema.safeParse({ ok: true }).success).toBe(false);
    expect(ClassEnrollmentTransitionSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(ClassEnrollmentTransitionSchema.safeParse({ status: "pending" }).success).toBe(false);
  });

  it("bounds and trims skill catalog names", () => {
    expect(SkillCreateRequestSchema.safeParse({ name: "  Custom Hooks  " }).success).toBe(true);
    expect(SkillCreateRequestSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("validates teacher login and session responses without exposing session tokens", () => {
    expect(TeacherLoginRequestSchema.safeParse({ email: "teacher@example.test", password: "fake-password" }).success).toBe(true);
    expect(TeacherLoginRequestSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: false }).success).toBe(true);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: true, teacherId: "teacher-1", expiresAt: 10_000 }).success).toBe(true);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: true, teacherId: "teacher-1", expiresAt: 10_000, token: "secret" }).success).toBe(false);
  });
  it("accepts both standard API result variants", () => {
    const resultSchema = ApiResultSchema(z.object({ id: z.string() }));
    const success = resultSchema.safeParse({
      ok: true,
      data: { id: "p-1" },
    });
    const failure = resultSchema.safeParse({
      ok: false,
      error: { code: "NOT_FOUND", message: "No existe." },
    });

    expect(success.success).toBe(true);
    expect(failure.success).toBe(true);
  });

  it("rejects malformed API errors", () => {
    const result = ApiResultSchema(z.object({ id: z.string() })).safeParse({
      ok: false,
      error: { code: "", message: "No existe." },
    });

    expect(result.success).toBe(false);
  });

  it("validates evidence paths and line ranges in feedback findings", () => {
    expect(
      FeedbackFindingSchema.safeParse({
        criterionId: "correctness",
        status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [4, 8], digest }],
        file: "src/index.ts",
        lines: [4, 8],
        reason: "La ruta valida la entrada antes de usarla.",
        guidanceLevel: 1,
      }).success,
    ).toBe(true);

    expect(
      FeedbackFindingSchema.safeParse({
        criterionId: "correctness",
        status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [8, 4], digest }],
        file: "../secrets.txt",
        lines: [8, 4],
        reason: "Sin evidencia válida.",
        guidanceLevel: 1,
      }).success,
    ).toBe(false);
  });

  it("requires a source reference for each evidence record", () => {
    expect(
      EvidenceReferenceSchema.safeParse({
        source: "proposal",
        field: "goals",
        digest,
      }).success,
    ).toBe(true);
    expect(
      EvidenceReferenceSchema.safeParse({ source: "proposal", field: "goals" }).success,
    ).toBe(false);
  });

  it("accepts a repository snapshot tied to an exact commit and content digest", () => {
    const result = RepositorySnapshotSchema.safeParse({
      owner: "student",
      repo: "demo",
      commitSha: "b".repeat(40),
      files: [{ path: "src/index.ts", content: "export {};", sha: "c".repeat(40) }],
      digest,
    });

    expect(result.success).toBe(true);
  });

  it("preserves printable Unicode and spaces in repository paths", () => {
    const path = "src/diseño/niñez y café.ts";
    const result = RepositorySnapshotSchema.safeParse({
      owner: "student",
      repo: "demo",
      commitSha: "b".repeat(40),
      files: [{ path, content: "export {};", sha: "c".repeat(40) }],
      digest,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.files[0]?.path).toBe(path);
    expect(EvidenceReferenceSchema.safeParse({ source: "repository", path, lines: [1, 1], digest }).success).toBe(true);
    expect(FeedbackFindingSchema.safeParse({
      criterionId: "source",
      status: "verified",
      evidence: [{ source: "repository", path, lines: [1, 1], digest }],
      file: path,
      lines: [1, 1],
      reason: "La ruta del archivo coincide con el commit.",
      guidanceLevel: 1,
    }).success).toBe(true);
  });

  it("rejects unsafe or non-portable repository paths", () => {
    const paths = [
      "/etc/passwd",
      "../secrets.txt",
      "src/../secrets.txt",
      "src/./index.ts",
      "src//index.ts",
      "src/",
      "src\\index.ts",
      "src/\u0001index.ts",
      `src/${"a".repeat(508)}.ts`,
    ];

    for (const path of paths) {
      expect(RepositorySnapshotSchema.safeParse({
        owner: "student",
        repo: "demo",
        commitSha: "b".repeat(40),
        files: [{ path, content: "x", sha: "c".repeat(40) }],
        digest,
      }).success, path).toBe(false);
    }
  });

  it("rejects unsafe paths and incomplete commit identifiers", () => {
    const result = RepositorySnapshotSchema.safeParse({
      owner: "student",
      repo: "demo",
      commitSha: "main",
      files: [{ path: "../../.env", content: "x", sha: "short" }],
      digest,
    });

    expect(result.success).toBe(false);
  });

  it("requires evidence-backed analysis findings", () => {
    const valid = AiAnalysisSchema.safeParse({
      rubricVersion: "1.0.0",
      score: 75,
      findings: [
        {
          criterionId: "correctness",
          status: "verified",
          evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 2], digest }],
          file: "src/index.ts",
          lines: [1, 2],
          reason: "La función devuelve el resultado esperado.",
          guidanceLevel: 1,
        },
      ],
      limitations: [],
      modelId: "provider/model",
      inputDigest: digest,
    });
    const ungrounded = AiAnalysisSchema.safeParse({
      rubricVersion: "1.0.0",
      score: 75,
      findings: [
        {
          criterionId: "correctness",
          status: "verified",
          reason: "Sin referencia.",
          guidanceLevel: 1,
        },
      ],
      limitations: [],
      modelId: "provider/model",
      inputDigest: "not-a-digest",
    });

    expect(valid.success).toBe(true);
    expect(ungrounded.success).toBe(false);
  });

  it("keeps the teacher hint out of the student challenge contract", () => {
    const challenge = {
      evaluationId: "review-1",
      sourceEvidence: [
        { source: "repository", path: "src/index.ts", lines: [1, 2], digest },
      ],
      precondition: "El cálculo devuelve el resultado documentado.",
      mutation: "Cambia temporalmente el operador de comparación.",
      demonstration: "Muestra la regresión con la prueba existente.",
      restoration: "Restaura el operador original y ejecuta la prueba.",
      estimatedMinutes: 10,
      teacherHint: "Guía privada del docente.",
    };

    expect(InspectorChallengeSchema.safeParse(challenge).success).toBe(true);
    expect(InspectorChallengePublicSchema.safeParse(challenge).success).toBe(false);
  });

  it("validates immutable submission snapshots and verification tokens", () => {
    const result = SubmissionSnapshotSchema.safeParse({
      kind: "mentor",
      sourceId: "project-1",
      score: 82,
      snapshotJson: { title: "Un proyecto", note: "Orientación formativa" },
      contentHash: digest,
      verificationCode: "verify_123456789012345678901234",
      rubricVersion: "1.0.0",
      createdAt: "2026-11-04T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("accepts opt-in gallery cards without student or repository identity fields", () => {
    const entry = {
      id: "gallery-1",
      title: "Huerto escolar interactivo",
      summary: "Registra el crecimiento de plantas con una aplicación local.",
      skills: ["TypeScript", "SQLite"],
      tags: ["ciencia", "web"],
      estimatedMinutes: 90,
    };

    expect(GalleryEntrySchema.safeParse(entry).success).toBe(true);
    expect(GalleryResponseSchema.safeParse([entry]).success).toBe(true);
    expect(GalleryEntrySchema.safeParse({ ...entry, studentId: "student-1" }).success).toBe(false);
  });

  it("validates proposal requests and versioned proposal responses", () => {
    expect(CreateProposalRequestSchema.safeParse(proposal).success).toBe(true);
    expect(CreateProposalRequestSchema.safeParse({ ...proposal, technologies: ["TypeScript", "SQLite"], expectedOutcome: "Prototipo verificable" }).success).toBe(true);
    expect(CreateProposalRequestSchema.safeParse({ ...proposal, technologies: Array.from({ length: 21 }, () => "TypeScript") }).success).toBe(false);
    expect(CreateProposalRequestSchema.safeParse({ ...proposal, goals: [] }).success).toBe(false);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 2 }).success).toBe(true);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 0 }).success).toBe(false);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 2, ownerId: "student-1" }).success).toBe(false);
    expect(GalleryOptInRequestSchema.safeParse({ optIn: true }).success).toBe(true);
    expect(GalleryOptInRequestSchema.safeParse({ optIn: true, studentId: "student-1" }).success).toBe(false);
    expect(
      ProposalResponseSchema.safeParse({ id: "proposal-1", version: 2, proposal, updatedAt: now }).success,
    ).toBe(true);
  });

  it("accepts partial Mentor drafts but requires the full F17 proposal before evaluation", () => {
    const partial = { title: "Mi idea", problem: "", technologies: ["TypeScript"], expectedOutcome: "Prototipo verificable" };
    expect(ProposalDraftFieldsSchema.safeParse(partial).success).toBe(true);
    expect(CreateProposalDraftRequestSchema.safeParse({ proposal: partial }).success).toBe(true);
    expect(ProposalDraftResponseSchema.safeParse({ id: "proposal-1", version: 1, proposal: partial, updatedAt: now }).success).toBe(true);
    expect(ProposalDraftResponseSchema.safeParse({ id: "proposal-1", version: 1, proposal: partial, updatedAt: now,
      assignmentContext: { assignmentVersionId: "assignment-version-1", requiredSkills: [{ id: "skill-1", name: "Navegación" }], mentorContext: { version: 1, publishedAt: now,
        config: { subject: "Programación", theme: "Misión", assignment: "Consigna", requirements: Array.from({ length: 72 }, (_, index) => `Criterio ${index + 1}`),
          expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cambios observables en código.", weight: 100 }] } } } }).success).toBe(true);
    expect(ProposalDraftResponseSchema.safeParse({ id: "proposal-1", version: 1, proposal: partial, updatedAt: now,
      assignmentContext: { assignmentVersionId: "assignment-version-1", mentorContext: { version: 1, publishedAt: now,
        config: { subject: "Programación", theme: "Misión", assignment: "Consigna", requirements: [], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11", criteria: [] } } } }).success).toBe(false);
    expect(ProposalEvaluationInputSchema.safeParse(proposal).success).toBe(false);
    expect(ProposalEvaluationInputSchema.safeParse({ ...proposal, description: "Una descripción concreta.", purpose: "Ayudar al curso." }).success).toBe(true);
    expect(ProposalEvaluationInputSchema.safeParse({ ...proposal, description: "Una descripción concreta.", purpose: "Ayudar al curso.", technologies: ["TypeScript"], expectedOutcome: "MVP demostrable" }).success).toBe(true);
    expect(CreateProposalDraftRequestSchema.safeParse({ proposal: partial, ownerUserId: "spoofed" }).success).toBe(false);
    const mentorSkills = { classroomId: "classroom-1", selectedSkillIds: ["skill-1", "skill-2"] };
    expect(ProposalMentorSkillsSchema.safeParse(mentorSkills).success).toBe(true);
    expect(ProposalDraftFieldsSchema.safeParse({ ...partial, mentorSkills }).success).toBe(true);
    expect(ProposalMentorSkillsSchema.safeParse({ classroomId: "classroom-1", selectedSkillIds: ["skill-1", "skill-1"] }).success).toBe(false);
    expect(ProposalMentorSkillsSchema.safeParse({ classroomId: null, selectedSkillIds: ["skill-1"] }).success).toBe(false);
  });

  it("validates evidence-backed Mentor evaluation and similarity matches", () => {
    const result = ProposalEvaluationResponseSchema.safeParse({
      evaluationId: "evaluation-1",
      proposalId: "proposal-1",
      proposalVersion: 2,
      viability: "feasible",
      analysis,
      guidance: ["¿Qué parte puedes validar primero?"],
      similarityMatches: [
        { galleryId: "gallery-1", title: "Huerto comunitario", reason: "Comparte el seguimiento de plantas." },
      ],
      evaluatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a GitHub owner/repo/commit request and rejects arbitrary repository URLs", () => {
    const request = { owner: "student", repo: "course-project", commitSha: "b".repeat(40) };
    expect(ReviewRequestSchema.safeParse(request).success).toBe(true);
    expect(ReviewRequestSchema.safeParse({ ...request, linkedProposalId: "proposal-1" }).success).toBe(true);
    expect(ReviewRequestSchema.safeParse({ ...request, linkedProposalId: "proposal-1", assignmentDeliverableId: "delivery-1" }).success).toBe(true);
    expect(ReviewRequestSchema.safeParse({ ...request, assignmentDeliverableId: "delivery-1" }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ ...request, linkedProposalId: "" }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ ...request, repositoryUrl: "http://127.0.0.1/secret" }).success).toBe(false);
  });

  it("keeps mission skill names in a bounded optional Review academic snapshot", () => {
    const link = { proposalId: "proposal-1", proposalVersion: 1, proposalTitle: "Mi propuesta", assignmentVersionId: "mission-v1",
      missionTitle: "Proyecto móvil", missionVersion: 1, mentorContextVersion: 2, classroomId: "class-1", classroomTitle: "Tercero",
      requiredSkills: ["Navegación", "Componentes"] };
    expect(ReviewAcademicLinkSchema.safeParse(link).success).toBe(true);
    expect(ReviewAcademicLinkSchema.safeParse({ ...link, requiredSkills: Array.from({ length: 21 }, () => "Skill") }).success).toBe(false);
    expect(ReviewAcademicLinkSchema.safeParse({ ...link, requiredSkills: ["Navegación", 1] }).success).toBe(false);
    expect(ReviewAcademicLinkSchema.safeParse({ ...link, requiredSkills: undefined }).success).toBe(true);
  });

  it("validates delivery history without exposing private analysis", () => {
    const result = MissionDeliveryHistorySchema.safeParse({ proposalId: "proposal-1", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-2", deliveries: [{
      deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: ["Definir alcance"], criterionIds: ["criterion-1"] },
      status: "completed", attempts: [{ reviewId: "review-1", commitSha: "a".repeat(40), status: "completed", createdAt: now, updatedAt: now }],
    }] });
    expect(result.success).toBe(true);
    expect(MissionDeliveryHistorySchema.safeParse({ proposalId: "proposal-1", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-2", privateFindings: "no", deliveries: [] }).success).toBe(false);
  });

  it("validates a minimal classroom Review progress row", () => {
    expect(TeacherClassroomReviewsResponseSchema.safeParse([{
      reviewId: "review-1", studentLabel: "vgmilton", proposalTitle: "Navegación móvil", proposalVersion: 2,
      missionTitle: "Navegación con Expo", missionVersion: 1, mentorContextVersion: 4,
      repositoryOwner: "vgmilton", repositoryName: "mobile-app", commitSha: "b".repeat(40),
      status: "completed", score: 84, updatedAt: now,
    }]).success).toBe(true);
    expect(TeacherClassroomReviewsResponseSchema.safeParse([{
      reviewId: "review-1", studentLabel: "vgmilton", proposalTitle: "", proposalVersion: 2,
      missionTitle: "Navegación con Expo", missionVersion: 1, mentorContextVersion: 4,
      repositoryOwner: "vgmilton", repositoryName: "mobile-app", commitSha: "b".repeat(40),
      status: "completed", score: 84, updatedAt: now, studentEmail: "private@example.test",
    }]).success).toBe(false);
  });

  it("validates queued and completed Review responses without unsafe exception fields", () => {
    const queued = ReviewQueuedResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "queued",
      createdAt: now,
    });
    const completed = ReviewResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "completed",
      analysis,
      progress: 100,
      updatedAt: now,
    });
    const unsafe = ReviewResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "failed",
      errorStack: "secret-bearing stack trace",
      updatedAt: now,
    });

    expect(queued.success).toBe(true);
    expect(completed.success).toBe(true);
    expect(unsafe.success).toBe(false);
  });

  it("validates submission requests and their shared snapshot response", () => {
    expect(
      CreateMentorSubmissionRequestSchema.safeParse({
        proposalId: "proposal-1",
        proposalVersion: 2,
        evaluationId: "evaluation-1",
      }).success,
    ).toBe(true);
    expect(CreateReviewSubmissionRequestSchema.safeParse({ reviewId: "review-1" }).success).toBe(true);
    const snapshot = {
      id: "submission-1",
      kind: "review",
      sourceId: "review-1",
      score: 78,
      snapshotJson: { commitSha: "b".repeat(40), analysis },
      contentHash: digest,
      verificationCode: "verify_123456789012345678901234",
      rubricVersion: "1.0.0",
      createdAt: now,
    };
    expect(MentorSubmissionResponseSchema.safeParse(snapshot).success).toBe(true);
  });

  it("returns only a minimal integrity verification summary", () => {
    expect(
      VerifySubmissionResponseSchema.safeParse({
        kind: "mentor",
        score: 78,
        rubricVersion: "1.0.0",
        createdAt: now,
        integrityValid: true,
      }).success,
    ).toBe(true);
    expect(
      VerifySubmissionResponseSchema.safeParse({
        kind: "mentor",
        score: 78,
        rubricVersion: "1.0.0",
        createdAt: now,
        integrityValid: true,
        studentName: "Private",
      }).success,
    ).toBe(false);
  });

  it("validates Inspector defense requests and keeps teacher hints out of student responses", () => {
    const record = {
      id: "challenge-1",
      reviewId: "review-1",
      projectId: "project-1",
      commitSha: "b".repeat(40),
      challenge: {
        evaluationId: "review-1",
        sourceEvidence: [{ source: "repository", path: "src/math.ts", lines: [2, 4], digest }],
        precondition: "Existe un acumulador.",
        mutation: "Invierte la condición.",
        demonstration: "Comprueba el resultado anterior.",
        restoration: "Devuelve la condición a su forma original.",
        estimatedMinutes: 15,
        teacherHint: "Revisa el acumulador.",
      },
      status: "pending",
      createdAt: now,
    };
    const assigned = { ...record, status: "assigned" as const, assignedTo: "teacher-1", assignedAt: now };
    const completed = {
      ...assigned,
      status: "completed" as const,
      defense: { mutationObserved: true, restorationConfirmed: true, notes: "Registrado.", recordedAt: now },
    };

    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: " Bien " }).data)
      .toEqual({ mutationObserved: true, restorationConfirmed: true, notes: "Bien" });
    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: "x".repeat(2001) }).success).toBe(false);
    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: "", teacherHint: "private" }).success).toBe(false);
    expect(InspectorChallengeRecordResponseSchema.safeParse(record).success).toBe(true);
    expect(InspectorChallengeRecordResponseSchema.safeParse(assigned).success).toBe(true);
    expect(InspectorChallengeRecordResponseSchema.safeParse(completed).success).toBe(true);
    expect(InspectorStudentChallengeResponseSchema.safeParse({
      id: "challenge-1", status: "assigned", challenge: Object.fromEntries(Object.entries(record.challenge).filter(([key]) => key !== "teacherHint")),
    }).success).toBe(true);
    expect(InspectorStudentChallengeResponseSchema.safeParse({
      id: "challenge-1", status: "assigned", challenge: record.challenge,
    }).success).toBe(false);
  });

  it("validates Mentor themes, weighted rubrics and criterion score breakdowns", () => {
    const config = {
      subject: "Proyectos de aula", theme: "Huerto escolar", assignment: "Propón un MVP para el curso.",
      requirements: ["Funciona sin conexión"], expectedLevel: "Primer proyecto",
      rubricTitle: "Rúbrica inicial", criteria: [{ id: "scope", title: "Alcance", description: "Cabe en el curso.", weight: 100 }],
    };
    expect(MentorControlConfigSchema.safeParse(config).success).toBe(true);
    expect(MentorControlConfigSchema.safeParse({ ...config, requirements: Array.from({ length: 21 }, (_, index) => `F11 ${index}`) }).success).toBe(false);
    expect(MentorEvaluationConfigSchema.safeParse({ ...config, requirements: Array.from({ length: 72 }, (_, index) => `Contexto ${index}`) }).success).toBe(true);
    expect(MentorControlConfigSchema.safeParse({ ...config, criteria: [config.criteria[0], config.criteria[0]] }).success).toBe(false);
    expect(MentorControlConfigSchema.safeParse({ ...config, criteria: [{ ...config.criteria[0], weight: 0 }] }).success).toBe(false);
    expect(MentorPublishedConfigSchema.safeParse({ version: 1, config, publishedAt: now }).success).toBe(true);
    expect(MentorCriterionBreakdownSchema.safeParse({ criterionId: "scope", title: "Alcance", weight: 100, status: "not_verified", points: 50, reason: "Agrega evidencia observable.", guidanceLevel: 1 }).success).toBe(true);
    expect(MentorCriterionBreakdownSchema.safeParse({ criterionId: "scope", title: "Alcance", weight: 100, status: "failed", points: 101, reason: "No corresponde al criterio.", guidanceLevel: 2 }).success).toBe(false);
  });
});
