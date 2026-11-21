import type { ProposalDraftFields } from "@fragments/contracts";

type StudentSkillSelection = NonNullable<ProposalDraftFields["mentorSkills"]>;
type ProposalSkillFields = Pick<ProposalDraftFields, "skills" | "mentorSkills">;
type SkillCatalogReader = {
  listStudentSkills(studentId: string, classroomId: string): Promise<Array<{ id: string; name: string }> | null>;
};

export type StudentSkillSelectionResult<T> = { ok: true; proposal: T } | { ok: false };

export async function validateStudentSkillSelection<T extends ProposalDraftFields>(
  classrooms: SkillCatalogReader,
  proposal: T,
  studentId: string,
  creating: boolean,
): Promise<StudentSkillSelectionResult<T>> {
  const skillFields = proposal as ProposalSkillFields;
  const selection = skillFields.mentorSkills as StudentSkillSelection | undefined;
  if (!selection) {
    if (skillFields.skills?.length) return { ok: false };
    if (skillFields.skills !== undefined) {
      return { ok: true, proposal: { ...proposal, skills: [], mentorSkills: { classroomId: null, selectedSkillIds: [] } } as T };
    }
    if (creating) return { ok: true, proposal: { ...proposal, skills: [], mentorSkills: { classroomId: null, selectedSkillIds: [] } } as T };
    return { ok: true, proposal };
  }

  if (selection.classroomId === null) {
    return { ok: true, proposal: { ...proposal, skills: [] } as T };
  }
  const catalog = await classrooms.listStudentSkills(studentId, selection.classroomId);
  if (!catalog) return { ok: false };
  const byId = new Map(catalog.map((skill) => [skill.id, skill.name]));
  const names: string[] = [];
  for (const id of selection.selectedSkillIds) {
    const name = byId.get(id);
    if (name === undefined) return { ok: false };
    names.push(name);
  }
  return { ok: true, proposal: { ...proposal, skills: names } as T };
}
