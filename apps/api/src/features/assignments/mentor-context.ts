import { AssignmentRequiredSkillSchema, MentorControlConfigSchema, MentorEvaluationConfigSchema, type MentorEvaluationConfig } from "@fragments/contracts";

export function assignmentSkillSnapshots(snapshotValue: unknown, key: "requiredSkills" | "optionalSkills"): Array<{ id: string; name: string }> {
  if (!snapshotValue || typeof snapshotValue !== "object") return [];
  const values = (snapshotValue as Record<string, unknown>)[key];
  if (!Array.isArray(values)) return [];
  return values.flatMap((skill) => {
    if (!skill || typeof skill !== "object" || !("id" in skill) || !("name" in skill)) return [];
    const parsed = AssignmentRequiredSkillSchema.safeParse({ id: skill.id, name: skill.name });
    return parsed.success ? [parsed.data] : [];
  }).slice(0, 20);
}

export function buildAssignmentMentorConfig(baseValue: unknown, snapshotValue: unknown, subject: string): MentorEvaluationConfig {
  const base = MentorControlConfigSchema.parse(baseValue);
  const mission = snapshotValue && typeof snapshotValue === "object" ? snapshotValue as { title?: unknown; instructions?: unknown; objectives?: unknown; requiredSkills?: unknown; optionalSkills?: unknown; _classroomSubject?: unknown } : {};
  const pinnedSubject = typeof mission._classroomSubject === "string" ? mission._classroomSubject : subject;
  const requiredSkills = assignmentSkillSnapshots(mission, "requiredSkills").map((skill) => skill.name);
  const optionalSkills = assignmentSkillSnapshots(mission, "optionalSkills").map((skill) => skill.name);
  const objectives = Array.isArray(mission.objectives) ? mission.objectives.filter((item): item is string => typeof item === "string") : [];
  return MentorEvaluationConfigSchema.parse({
    ...base,
    subject: pinnedSubject.slice(0, 120),
    theme: typeof mission.title === "string" ? mission.title.slice(0, 160) : base.theme,
    assignment: typeof mission.instructions === "string" ? mission.instructions.slice(0, 3000) : base.assignment,
    requirements: [...objectives, ...requiredSkills.map((name) => `Habilidad requerida: ${name}`), ...optionalSkills.map((name) => `Habilidad optativa: ${name}`), ...base.requirements],
  });
}
