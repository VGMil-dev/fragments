import { MentorControlConfigSchema, MentorEvaluationConfigSchema, type MentorEvaluationConfig } from "@fragments/contracts";

export function buildAssignmentMentorConfig(baseValue: unknown, snapshotValue: unknown, subject: string): MentorEvaluationConfig {
  const base = MentorControlConfigSchema.parse(baseValue);
  const mission = snapshotValue && typeof snapshotValue === "object" ? snapshotValue as { title?: unknown; instructions?: unknown; objectives?: unknown; requiredSkills?: unknown; optionalSkills?: unknown; _classroomSubject?: unknown } : {};
  const pinnedSubject = typeof mission._classroomSubject === "string" ? mission._classroomSubject : subject;
  const requiredSkills = Array.isArray(mission.requiredSkills) ? mission.requiredSkills.flatMap((skill) => skill && typeof skill === "object" && "name" in skill && typeof skill.name === "string" ? [skill.name] : []) : [];
  const optionalSkills = Array.isArray(mission.optionalSkills) ? mission.optionalSkills.flatMap((skill) => skill && typeof skill === "object" && "name" in skill && typeof skill.name === "string" ? [skill.name] : []) : [];
  const objectives = Array.isArray(mission.objectives) ? mission.objectives.filter((item): item is string => typeof item === "string") : [];
  return MentorEvaluationConfigSchema.parse({
    ...base,
    subject: pinnedSubject.slice(0, 120),
    theme: typeof mission.title === "string" ? mission.title.slice(0, 160) : base.theme,
    assignment: typeof mission.instructions === "string" ? mission.instructions.slice(0, 3000) : base.assignment,
    requirements: [...objectives, ...requiredSkills.map((name) => `Habilidad requerida: ${name}`), ...optionalSkills.map((name) => `Habilidad optativa: ${name}`), ...base.requirements],
  });
}
