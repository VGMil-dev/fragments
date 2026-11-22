import { MentorControlConfigSchema, type MentorControlConfig } from "@fragments/contracts";

export function buildAssignmentMentorConfig(baseValue: unknown, snapshotValue: unknown, subject: string): MentorControlConfig {
  const base = MentorControlConfigSchema.parse(baseValue);
  const mission = snapshotValue && typeof snapshotValue === "object" ? snapshotValue as { title?: unknown; instructions?: unknown; objectives?: unknown; requiredSkills?: unknown } : {};
  const requiredSkills = Array.isArray(mission.requiredSkills) ? mission.requiredSkills.flatMap((skill) => skill && typeof skill === "object" && "name" in skill && typeof skill.name === "string" ? [skill.name] : []) : [];
  const objectives = Array.isArray(mission.objectives) ? mission.objectives.filter((item): item is string => typeof item === "string") : [];
  return MentorControlConfigSchema.parse({
    ...base,
    subject: subject.slice(0, 120),
    theme: typeof mission.title === "string" ? mission.title.slice(0, 160) : base.theme,
    assignment: typeof mission.instructions === "string" ? mission.instructions.slice(0, 3000) : base.assignment,
    requirements: [...objectives, ...requiredSkills.map((name) => `Habilidad requerida: ${name}`), ...base.requirements].slice(0, 20),
  });
}
