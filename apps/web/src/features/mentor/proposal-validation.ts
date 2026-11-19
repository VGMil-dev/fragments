import {
  CreateProposalRequestSchema,
  type CreateProposalRequest,
} from "@fragments/contracts";

export interface ProposalDraftFields {
  title: string;
  problem: string;
  solution: string;
  description: string;
  purpose: string;
  goals: string;
  skills: string;
  technologies: string;
  expectedOutcome: string;
  scope: string;
  constraints: string;
}

export type ProposalDraftValidation =
  | { ok: true; data: CreateProposalRequest }
  | { ok: false; fieldErrors: Partial<Record<keyof ProposalDraftFields, string>> };

const FIELD_HELP: Record<keyof ProposalDraftFields, string> = {
  title: "Escribe un título para tu propuesta.",
  problem: "Describe el problema que quieres resolver.",
  solution: "Explica cómo ayudará tu proyecto.",
  description: "Describe brevemente qué hará tu proyecto.",
  purpose: "Explica para qué quieres construirlo.",
  goals: "Incluye al menos un objetivo, uno por línea.",
  skills: "Revisa las habilidades: escribe una por línea.",
  technologies: "Revisa las tecnologías: escribe una por línea.",
  expectedOutcome: "El resultado esperado debe tener máximo 3000 caracteres.",
  scope: "Describe qué incluirá esta primera versión.",
  constraints: "Revisa las condiciones: escribe una por línea.",
};

function parseLines(value = ""): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function validateProposalDraft(fields: ProposalDraftFields): ProposalDraftValidation {
  const parsed = CreateProposalRequestSchema.safeParse({
    title: fields.title,
    problem: fields.problem,
    solution: fields.solution,
    description: fields.description,
    purpose: fields.purpose,
    goals: parseLines(fields.goals),
    skills: parseLines(fields.skills),
    technologies: parseLines(fields.technologies),
    expectedOutcome: fields.expectedOutcome.trim(),
    tags: [],
    scope: fields.scope,
    constraints: parseLines(fields.constraints),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Partial<Record<keyof ProposalDraftFields, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in FIELD_HELP) {
      fieldErrors[field as keyof ProposalDraftFields] = FIELD_HELP[field as keyof ProposalDraftFields];
    }
  }
  return { ok: false, fieldErrors };
}
