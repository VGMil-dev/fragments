import { describe, expect, it, vi } from "vitest";
import { createAssignmentRepository } from "./repository.js";

function memoryDb() {
  const state: { assignment: any; versions: any[]; draft: any; enrollment: any } = { assignment: null, versions: [], draft: null, enrollment: null };
  const tx: any = {
    classroom: { findFirst: vi.fn(async ({ where }: any) => where.teacherId === "fixture-owner" ? null : ({ id: "fixture-class", title: "Ciencias", subject: "Ciencias" })) },
    classroomAssignment: {
      findMany: vi.fn(async () => state.assignment ? [{ ...state.assignment, versions: state.versions }] : []),
      findFirst: vi.fn(async () => state.assignment),
      create: vi.fn(async ({ data }: any) => (state.assignment = { ...data, publishedVersion: null })),
      findUniqueOrThrow: vi.fn(async () => state.assignment),
      update: vi.fn(async ({ data }: any) => (state.assignment = { ...state.assignment, ...data, draftVersion: data.draftVersion?.increment ? state.assignment.draftVersion + data.draftVersion.increment : data.draftVersion ?? state.assignment.draftVersion })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (!state.assignment || state.assignment.id !== where.id || state.assignment.draftVersion !== where.draftVersion || (where.publishedVersion !== undefined && state.assignment.publishedVersion !== where.publishedVersion)) return { count: 0 };
        state.assignment = { ...state.assignment, ...data, draftVersion: data.draftVersion?.increment ? state.assignment.draftVersion + data.draftVersion.increment : data.draftVersion ?? state.assignment.draftVersion };
        return { count: 1 };
      }),
    },
    classroomAssignmentVersion: {
      findMany: vi.fn(async () => state.versions),
      create: vi.fn(async ({ data }: any) => { state.versions.push(data); return data; }),
    },
    classroomSkillAvailability: { findMany: vi.fn(async ({ where }: any) => where.skillId.in.includes("fixture-skill") ? [{ skillId: "fixture-skill", skill: { id: "fixture-skill", name: "Observación", description: null } }] : []) },
    mentorControlVersion: {
      findFirst: vi.fn(async () => ({ version: 3 })),
      findUnique: vi.fn(async () => ({ version: 3, publishedAt: new Date("2026-11-22T00:00:00.000Z"), configJson: {
        subject: "Otra materia", theme: "Tema", assignment: "Consigna", requirements: [], expectedLevel: "Bachillerato",
        rubricTitle: "Rúbrica", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Evidencia verificable", weight: 100 }],
      } })),
    },
    classEnrollment: { findFirst: vi.fn(async ({ where }: any) => state.enrollment?.status === where.status ? state.enrollment : null) },
  };
  return { state, database: { ...tx, $transaction: async (fn: (client: any) => unknown) => fn(tx) } as any };
}

const missionRubric = { title: "Rúbrica de observación", criteria: [{ id: "criterion-observation", title: "Evidencia", description: "Describe el fenómeno con observaciones comprobables.", weight: 100 }] };
const deliverables = [
  { id: "delivery-proposal", order: 1, title: "Propuesta", type: "proposal" as const, requirements: ["Define una solución pequeña."], dueDate: null, criterionIds: ["criterion-observation"] },
  { id: "delivery-progress", order: 2, title: "Avance", type: "progress" as const, requirements: ["Muestra una primera evidencia."], dueDate: null, criterionIds: ["criterion-observation"] },
];
const draft = { title: "Misión de observación", instructions: "Registra un fenómeno.", objectives: ["Describir el fenómeno"], requiredSkillIds: ["fixture-skill"], optionalSkillIds: [], missionRubric, deliverables };

describe("assignment repository", () => {
  it("publishes immutable snapshots and publishes later edits as a new version", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const created = await repository.create("fixture-teacher", "fixture-class", draft);
    expect(created?.draftVersion).toBe(1);
    const first = await repository.publish("fixture-teacher", "fixture-class", created!.id, 1);
    expect(first.kind).toBe("ok");
    expect(state.versions[0].snapshotJson).toMatchObject({ _classroomSubject: "Ciencias" });
    expect(state.versions[0].snapshotJson).toMatchObject({ missionRubric, deliverables });
    expect(first.kind === "ok" && first.assignment.versions[0]).not.toHaveProperty("_classroomSubject");
    state.enrollment = { status: "active", classroom: { id: "fixture-class", title: "Ciencias", subject: "Materia editada" } };
    const studentRows = await repository.listStudent("fixture-student", "fixture-class");
    expect(studentRows).toMatchObject([{ id: state.versions[0].id, assignmentId: created!.id, version: 1, requiredSkills: [{ id: "fixture-skill", name: "Observación" }] }]);
    expect(studentRows?.[0]).not.toHaveProperty("_classroomSubject");
    expect(studentRows?.[0]?.mentorContext.config.subject).toBe("Ciencias");
    expect(studentRows?.[0]?.subject).toBe("Materia editada");
    expect((await repository.updateDraft("fixture-teacher", "fixture-class", created!.id, 1, draft)).kind).toBe("conflict");
    const edited = { ...draft, title: "Misión revisada", missionRubric: { ...missionRubric, title: "Rúbrica v2" }, deliverables: [deliverables[0], { ...deliverables[1], title: "Avance v2" }] };
    const update = await repository.updateDraft("fixture-teacher", "fixture-class", created!.id, 2, edited);
    expect(update.kind).toBe("ok");
    const second = await repository.publish("fixture-teacher", "fixture-class", created!.id, 3);
    expect(second.kind).toBe("ok");
    expect(state.versions.map((item) => (item.snapshotJson as { title: string }).title)).toEqual(["Misión de observación", "Misión revisada"]);
    expect(state.versions.map((item) => item.version)).toEqual([1, 2]);
    expect((state.versions[0].snapshotJson as any).missionRubric.title).toBe("Rúbrica de observación");
    expect((state.versions[1].snapshotJson as any).missionRubric.title).toBe("Rúbrica v2");
    expect((state.versions[0].snapshotJson as any).deliverables[1].title).toBe("Avance");
    expect((state.versions[1].snapshotJson as any).deliverables[1].title).toBe("Avance v2");
  });

  it("preserves proposal, progress, and final delivery details in the published mission snapshot", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const threeDeliveries = [...deliverables, {
      id: "delivery-final", order: 3, title: "Informe final", type: "final" as const,
      requirements: ["Incluye evidencia de la solución."], dueDate: "2026-12-20", criterionIds: ["criterion-observation"],
    }];
    const created = await repository.create("fixture-teacher", "fixture-class", { ...draft, deliverables: threeDeliveries });
    expect(created?.draftVersion).toBe(1);
    const published = await repository.publish("fixture-teacher", "fixture-class", created!.id, 1);
    expect(published.kind).toBe("ok");
    expect((state.versions[0]?.snapshotJson as any).deliverables).toEqual(threeDeliveries);
  });

  it("rejects unavailable skills before persisting a draft", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const result = await repository.create("fixture-teacher", "fixture-class", { ...draft, requiredSkillIds: ["not-enabled"] });
    expect(result).toMatchObject({ kind: "invalid_skills" });
    expect(state.assignment).toBeNull();
  });

  it("does not publish a mission until it has its own 100-point rubric and at least two deliveries", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const created = await repository.create("fixture-teacher", "fixture-class", { ...draft, missionRubric: undefined, deliverables: [] } as any);
    expect(created).toBeTruthy();
    if (!created || "kind" in created) throw new Error("Expected an incomplete draft to remain editable.");
    const result = await repository.publish("fixture-teacher", "fixture-class", created.id, 1);
    expect(result).toEqual({ kind: "incomplete_assignment" });
    expect(state.versions).toHaveLength(0);
    expect(state.assignment.publishedVersion).toBeNull();
  });

  it("does not publish a mission when its rubric weights do not sum to 100", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const invalidRubricDraft = {
      ...draft,
      missionRubric: { ...missionRubric, criteria: [{ ...missionRubric.criteria[0]!, weight: 99 }] },
    };
    const created = await repository.create("fixture-teacher", "fixture-class", invalidRubricDraft);
    if (!created || "kind" in created) throw new Error("Expected the invalid rubric draft to remain editable.");

    const result = await repository.publish("fixture-teacher", "fixture-class", created.id, created.draftVersion);

    expect(result).toEqual({ kind: "incomplete_assignment" });
    expect(state.versions).toHaveLength(0);
    expect(state.assignment.publishedVersion).toBeNull();
  });

  it("does not replace an existing draft when its skills are unavailable", async () => {
    const { state, database } = memoryDb();
    const repository = createAssignmentRepository(database);
    const created = await repository.create("fixture-teacher", "fixture-class", draft);
    const invalid = { ...draft, requiredSkillIds: ["archived-or-disabled"] };
    expect(await repository.updateDraft("fixture-teacher", "fixture-class", created!.id, 1, invalid)).toMatchObject({ kind: "invalid_skills" });
    expect(state.assignment.draftJson).toEqual(draft);
  });

  it("returns no student missions without an active enrollment", async () => {
    const { database, state } = memoryDb();
    state.enrollment = { status: "pending" };
    const repository = createAssignmentRepository(database);
    expect(await repository.listStudent("fixture-student", "fixture-class")).toBeNull();
  });

  it("does not expose an assignment to another teacher", async () => {
    const { database } = memoryDb();
    const repository = createAssignmentRepository(database);
    expect(await repository.list("fixture-owner", "fixture-class")).toBeNull();
  });
});
