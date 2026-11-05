import { ReviewRequestSchema, type ReviewRequest } from "@fragments/contracts";

export interface ReviewFields {
  owner: string;
  repo: string;
  commitSha: string;
}

export type ReviewValidation =
  | { ok: true; data: ReviewRequest }
  | { ok: false; fieldErrors: Partial<Record<keyof ReviewFields, string>> };

const FIELD_HELP: Record<keyof ReviewFields, string> = {
  owner: "Escribe el usuario u organización del repositorio.",
  repo: "Escribe el nombre del repositorio.",
  commitSha: "Usa el SHA completo del commit: 40 o 64 caracteres hexadecimales.",
};

export function validateReviewRequest(fields: ReviewFields): ReviewValidation {
  const parsed = ReviewRequestSchema.safeParse({
    owner: fields.owner.trim(),
    repo: fields.repo.trim(),
    commitSha: fields.commitSha.trim(),
  });
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Partial<Record<keyof ReviewFields, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in FIELD_HELP) {
      fieldErrors[field as keyof ReviewFields] = FIELD_HELP[field as keyof ReviewFields];
    }
  }
  return { ok: false, fieldErrors };
}
