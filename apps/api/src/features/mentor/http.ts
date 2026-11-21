import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  CreateMentorSubmissionRequestSchema,
  CreateProposalDraftRequestSchema,
  CreateProposalRequestSchema,
  GalleryResponseSchema,
  ProposalDraftResponseSchema,
  ProposalEvaluationInputSchema,
  ProposalResponseSchema,
  UpdateProposalRequestSchema,
  UpdateProposalDraftRequestSchema,
  SubmissionResponseSchema,
  StudentSubmissionsResponseSchema,
  VerifySubmissionResponseSchema,
  type ProposalDraftFields,
} from "@fragments/contracts";
import { createPrismaMentorRepository } from "./prisma-repository.js";
import { createPrismaMentorControlRepository } from "./prisma-control-repository.js";
import { proposalEvaluationResponse } from "./evaluation-response.js";
import { MentorEvaluationFailure, MentorInputError, type createMentorService } from "./service.js";
import { validateStudentSkillSelection } from "./skills-validation.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createClassroomRepository } from "../classroom/repository.js";

type MentorService = ReturnType<typeof createMentorService>;
type RouteResult = "handled" | "unhandled";
export type MentorEvaluationDiagnostic = {
  event: "mentor_evaluation_failed";
  stage: string;
  error_type: string;
  duration_ms: number;
  http_status: number;
  provider_http_status: number | null;
  provider_code: string | null;
  gateway_http_status: number | null;
  gateway_code: string | null;
  provider_dispatch_possible: boolean | null;
  retry_after_ms: number | null;
  gateway_generation_id: string | null;
};

export function createMentorHttp(
  database: PrismaClient,
  service: MentorService,
  options: { logFailure?: (diagnostic: MentorEvaluationDiagnostic) => void; auth?: FragmentsAuthService } = {},
) {
  const repository = createPrismaMentorRepository(database);
  const classrooms = createClassroomRepository(database);
  const control = createPrismaMentorControlRepository(database);
  const pending = new Map<string, Promise<{ id: string; evaluation: Awaited<ReturnType<MentorService["evaluate"]>>; evaluatedAt: string }>>();
  const logFailure = options.logFailure ?? ((diagnostic: MentorEvaluationDiagnostic) => console.error(JSON.stringify(diagnostic)));

  return async function handleMentorHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/gallery") {
      sendJson(response, 200, { ok: true, data: GalleryResponseSchema.parse(await repository.listGallery()) });
      return "handled";
    }

    if (request.method === "GET" && url.pathname === "/api/me/submissions") {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      sendJson(response, 200, { ok: true, data: StudentSubmissionsResponseSchema.parse(await repository.listStudentSubmissions(student.id)) });
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/proposals") {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const proposal = CreateProposalRequestSchema.safeParse(raw);
      if (!proposal.success) {
        sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta.");
        return "handled";
      }
      const validatedSkills = await validateStudentSkillSelection(classrooms, proposal.data, student.id, true);
      if (!validatedSkills.ok) { sendError(response, 400, "INVALID_SKILL_SELECTION", "Revisa las habilidades seleccionadas para tu aula."); return "handled"; }
      const normalized = await normalizeTechnologySelection(database, validatedSkills.proposal, null);
      if (!normalized) { sendError(response, 400, "INVALID_TECHNOLOGY_SELECTION", "Revisa las tecnologías seleccionadas del catálogo."); return "handled"; }
      const canonical = CreateProposalRequestSchema.safeParse(normalized);
      if (!canonical.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta."); return "handled"; }
      const saved = await repository.createProposal(canonical.data, null, student.id);
      sendJson(response, 201, { ok: true, data: ProposalResponseSchema.parse(saved) });
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/me/proposals/drafts") {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = CreateProposalDraftRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos del borrador."); return "handled"; }
      const validatedSkills = await validateStudentSkillSelection(classrooms, input.data.proposal, student.id, true);
      if (!validatedSkills.ok) { sendError(response, 400, "INVALID_SKILL_SELECTION", "Revisa las habilidades seleccionadas para tu aula."); return "handled"; }
      const normalized = await normalizeTechnologySelection(database, validatedSkills.proposal, null);
      if (!normalized) { sendError(response, 400, "INVALID_TECHNOLOGY_SELECTION", "Revisa las tecnologías del catálogo y conserva máximo 20 selecciones o etiquetas importadas."); return "handled"; }
      const saved = await repository.createProposalDraftByUser(normalized, student.id);
      sendJson(response, 201, { ok: true, data: ProposalDraftResponseSchema.parse(saved) });
      return "handled";
    }

    const draftMatch = url.pathname.match(/^\/api\/me\/proposals\/([A-Za-z0-9_-]{1,100})\/draft$/);
    if (request.method === "PUT" && draftMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = UpdateProposalDraftRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos del borrador y la versión que editas."); return "handled"; }
      const current = await repository.getOwnedProposalDraftByUser(draftMatch[1]!, student.id);
      if (!current) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      if (current.version !== input.data.expectedVersion) { sendError(response, 409, "VERSION_CONFLICT", "La propuesta cambió. Actualiza su versión antes de guardar."); return "handled"; }
      const validatedSkills = await validateUpdatedStudentSkills(classrooms, input.data.proposal, current.proposal, student.id);
      if (!validatedSkills.ok) { sendError(response, 400, "INVALID_SKILL_SELECTION", "Revisa las habilidades seleccionadas para tu aula."); return "handled"; }
      const normalized = await normalizeTechnologySelection(database, validatedSkills.proposal, current.proposal);
      if (!normalized) { sendError(response, 400, "INVALID_TECHNOLOGY_SELECTION", "Revisa las tecnologías del catálogo y conserva máximo 20 selecciones o etiquetas importadas."); return "handled"; }
      const saved = await repository.updateProposalDraftByUser(draftMatch[1]!, student.id, input.data.expectedVersion, normalized);
      if (saved.status !== "updated") {
        if (saved.status === "not_found") sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta.");
        else sendError(response, 409, "VERSION_CONFLICT", "La propuesta cambió. Actualiza su versión antes de guardar.");
        return "handled";
      }
      sendJson(response, 200, { ok: true, data: ProposalDraftResponseSchema.parse(saved.proposal) });
      return "handled";
    }

    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})$/);
    if (request.method === "PUT" && proposalMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = UpdateProposalRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta y la versión que editas."); return "handled"; }
      const current = await repository.getOwnedProposalByUser(proposalMatch[1]!, student.id);
      if (!current) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      const { expectedVersion, ...proposal } = input.data;
      if (current.version !== expectedVersion) { sendError(response, 409, "VERSION_CONFLICT", "La propuesta cambió. Actualiza su versión antes de guardar."); return "handled"; }
      const validatedSkills = await validateUpdatedStudentSkills(classrooms, proposal, current.proposal, student.id);
      if (!validatedSkills.ok) { sendError(response, 400, "INVALID_SKILL_SELECTION", "Revisa las habilidades seleccionadas para tu aula."); return "handled"; }
      const normalized = await normalizeTechnologySelection(database, validatedSkills.proposal, current.proposal);
      if (!normalized) { sendError(response, 400, "INVALID_TECHNOLOGY_SELECTION", "Revisa las tecnologías seleccionadas del catálogo."); return "handled"; }
      const canonical = UpdateProposalRequestSchema.safeParse({ ...normalized, expectedVersion });
      if (!canonical.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta."); return "handled"; }
      const saved = await repository.updateProposalByUser(proposalMatch[1]!, student.id, expectedVersion, canonical.data);
      if (saved.status !== "updated") {
        if (saved.status === "not_found") sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta.");
        else sendError(response, 409, "VERSION_CONFLICT", "La propuesta cambió. Actualiza su versión antes de guardar.");
        return "handled";
      }
      sendJson(response, 200, { ok: true, data: saved.proposal });
      return "handled";
    }

    const historyMatch = request.method === "GET" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/versions$/);
    if (historyMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const history = await repository.getProposalHistoryByUser(historyMatch[1]!, student.id);
      if (!history) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      sendJson(response, 200, { ok: true, data: history.map((entry) => ProposalDraftResponseSchema.parse(entry)) });
      return "handled";
    }

    const galleryOptInMatch = request.method === "PUT" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/gallery-opt-in$/);
    if (galleryOptInMatch) {
      sendError(response, 410, "PUBLICATION_AUTOMATIC", "Las propuestas elegibles se publican automáticamente después de su evaluación.");
      return "handled";
    }

    const evaluateMatch = request.method === "POST" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/review$/);
    const recoverEvaluationMatch = request.method === "GET" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/review$/);
    if (recoverEvaluationMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const proposal = await repository.getOwnedProposalDraftByUser(recoverEvaluationMatch[1]!, student.id);
      const complete = proposal ? ProposalEvaluationInputSchema.safeParse(proposal.proposal) : null;
      const latest = proposal && complete?.success ? await repository.getLatestEvaluation(proposal.id, proposal.version) : null;
      if (!proposal || !latest) {
        sendError(response, 404, "NOT_FOUND", "No se encontró una evaluación guardada para esta versión.");
        return "handled";
      }
      try {
        const responseData = proposalEvaluationResponse(latest.id, proposal.id, proposal.version, latest.evaluation, latest.evaluatedAt);
        sendJson(response, 200, { ok: true, data: responseData });
      } catch {
        sendError(response, 503, "EVALUATION_UNAVAILABLE", "No se pudo recuperar la evaluación guardada.");
      }
      return "handled";
    }

    if (evaluateMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const savedDraft = await repository.getOwnedProposalDraftByUser(evaluateMatch[1]!, student.id);
      const parsedProposal = savedDraft ? ProposalEvaluationInputSchema.safeParse(savedDraft.proposal) : null;
      const proposal = savedDraft && parsedProposal?.success
        ? ProposalResponseSchema.parse({ ...savedDraft, proposal: parsedProposal.data })
        : null;
      if (!proposal) {
        if (savedDraft) { sendError(response, 422, "PROPOSAL_INCOMPLETE", "Completa y guarda los campos obligatorios antes de evaluar."); return "handled"; }
        sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta.");
        return "handled";
      }
      const startedAt = performance.now();
      try {
        const active = await control.getActive();
        const inputDigest = service.proposalDigest(proposal.proposal);
        const cacheKey = `${proposal.id}:${proposal.version}:${inputDigest}:${active.version}`;
        let stored = await repository.getCachedEvaluation(proposal.id, proposal.version, inputDigest, active.version);
        if (!stored) {
          let work = pending.get(cacheKey);
          if (!work) {
            work = (async () => {
              const result = await service.evaluate(proposal.proposal, await repository.listGallery(), {
                config: active.config, version: active.version,
                operationKey: createHash("sha256").update(cacheKey).digest("hex"),
              });
              const evaluatedAt = new Date().toISOString();
              const evaluationId = randomUUID();
              await repository.saveEvaluation(evaluationId, proposal.id, proposal.version, result, inputDigest, active.version, new Date(evaluatedAt));
              return await repository.getCachedEvaluation(proposal.id, proposal.version, inputDigest, active.version) ?? { id: evaluationId, evaluation: result, evaluatedAt };
            })();
            pending.set(cacheKey, work);
          }
          try { stored = await work; }
          finally { if (pending.get(cacheKey) === work) pending.delete(cacheKey); }
        }
        const responseData = proposalEvaluationResponse(stored.id, proposal.id, proposal.version, stored.evaluation, stored.evaluatedAt);
        sendJson(response, 200, { ok: true, data: responseData });
      } catch (error) {
        const failure = error instanceof MentorEvaluationFailure ? error : null;
        const errorType = failure?.errorType ?? (error instanceof MentorInputError ? error.name : error instanceof Error ? error.name : "UnknownError");
        const diagnostic: MentorEvaluationDiagnostic = {
          event: "mentor_evaluation_failed",
          stage: failure?.stage ?? (error instanceof MentorInputError ? "input_validation" : "evaluation"),
          error_type: /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(errorType) ? errorType : "UnknownError",
          duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
          http_status: failure?.providerHttpStatus === 402 || failure?.gatewayHttpStatus === 402 ? 402 : 503,
          provider_http_status: failure?.providerHttpStatus ?? null,
          provider_code: failure?.providerCode ?? null,
          gateway_http_status: failure?.gatewayHttpStatus ?? null,
          gateway_code: failure?.gatewayCode ?? null,
          provider_dispatch_possible: failure?.providerDispatchPossible ?? null,
          retry_after_ms: failure?.retryAfterMs ?? null,
          gateway_generation_id: failure?.gatewayGenerationId ?? null,
        };
        try { logFailure(diagnostic); } catch { /* diagnostics must not change the route result */ }
        if (failure?.providerHttpStatus === 402 || failure?.gatewayHttpStatus === 402) {
          sendError(response, 402, "AI_GATEWAY_BUDGET_EXCEEDED", "La evaluación no está disponible porque Vercel AI Gateway alcanzó su presupuesto.");
        } else if (diagnostic.stage === "budget_reservation") {
          sendError(response, 503, "AI_BUDGET_UNAVAILABLE", "La evaluación no está disponible porque se agotó el presupuesto de IA configurado.");
        } else {
          sendError(response, 503, "EVALUATION_UNAVAILABLE", "No se pudo evaluar la propuesta en este momento.");
        }
      }
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/mentor-submissions") {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = CreateMentorSubmissionRequestSchema.safeParse(raw);
      if (!input.success) {
        sendError(response, 400, "INVALID_INPUT", "Revisa los datos de la entrega.");
        return "handled";
      }
      const proposal = await repository.getOwnedProposalByUser(input.data.proposalId, student.id);
      if (!proposal || proposal.version !== input.data.proposalVersion) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la versión de propuesta.");
        return "handled";
      }
      const evaluation = await repository.getEvaluation(input.data.evaluationId, proposal.id, proposal.version);
      if (!evaluation) {
        sendError(response, 409, "EVALUATION_REQUIRED", "Evalúa esta versión antes de generar la entrega.");
        return "handled";
      }
      try {
        const snapshot = await service.createSubmission({ sourceId: proposal.id, proposal: proposal.proposal, evaluation });
        const id = randomUUID();
        await repository.saveSubmission(id, snapshot);
        sendJson(response, 201, { ok: true, data: SubmissionResponseSchema.parse({ ...snapshot, id }) });
      } catch {
        sendError(response, 503, "SUBMISSION_UNAVAILABLE", "No se pudo generar la entrega en este momento.");
      }
      return "handled";
    }

    const artifactMatch = request.method === "GET" && url.pathname.match(/^\/api\/mentor-submissions\/([A-Za-z0-9_-]{1,100})\/(readme|pdf)$/);
    if (artifactMatch) {
      const student = await requireStudent(request, response, options.auth);
      if (!student) return "handled";
      const saved = await repository.getSubmission(artifactMatch[1]!);
      if (!saved || saved.snapshot.kind !== "mentor") {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega.");
        return "handled";
      }
      if (!await repository.getOwnedProposalByUser(saved.snapshot.sourceId, student.id)) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega.");
        return "handled";
      }
      try {
        if (artifactMatch[2] === "readme") {
          response.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "content-disposition": "attachment; filename=fragments-mentor.md" });
          response.end(service.renderReadme(saved.snapshot));
        } else {
          const bytes = await service.renderPdf(saved.snapshot);
          response.writeHead(200, { "content-type": "application/pdf", "content-disposition": "attachment; filename=fragments-mentor.pdf" });
          response.end(Buffer.from(bytes));
        }
      } catch {
        sendError(response, 500, "ARTIFACT_UNAVAILABLE", "No se pudo crear el archivo solicitado.");
      }
      return "handled";
    }

    const verifyMatch = request.method === "GET" && url.pathname.match(/^\/api\/verify\/([A-Za-z0-9_-]{24,128})$/);
    if (verifyMatch) {
      const submission = await repository.getSubmissionByCode(verifyMatch[1]!);
      if (!submission || submission.kind !== "mentor") {
        return "unhandled";
      }
      try {
        service.renderReadme(submission);
        sendJson(response, 200, { ok: true, data: VerifySubmissionResponseSchema.parse({
          kind: submission.kind,
          score: submission.score,
          rubricVersion: submission.rubricVersion,
          createdAt: submission.createdAt,
          integrityValid: true,
        }) });
      } catch {
        sendError(response, 409, "INTEGRITY_FAILED", "La integridad de la entrega no se pudo confirmar.");
      }
      return "handled";
    }

    return "unhandled";
  };
}

async function normalizeTechnologySelection(
  database: PrismaClient,
  incoming: ProposalDraftFields,
  previous: ProposalDraftFields | null,
): Promise<ProposalDraftFields | null> {
  const previousIds = previous?.technologyIds ?? [];
  const previousNames = previous?.technologies ?? [];
  const ids = incoming.technologyIds ?? previousIds;
  const names = incoming.technologies ?? previousNames;
  if (new Set(ids).size !== ids.length || ids.length > 20) return null;
  const relevantIds = [...new Set([...ids, ...previousIds])];
  const rows = relevantIds.length ? await database.technologyCatalogItem.findMany({ where: { id: { in: relevantIds } }, select: { id: true, name: true } }) : [];
  const byId = new Map(rows.map((row) => [row.id, row.name]));
  if (ids.some((id) => !byId.has(id))) return null;
  const oldCatalogNames = new Set(previousIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []));
  const selectedNames = ids.map((id) => byId.get(id)!);
  const legacyNames = names.filter((name) => !selectedNames.includes(name) && !oldCatalogNames.has(name));
  const nextNames = [...new Set([...selectedNames, ...legacyNames])];
  if (nextNames.length > 20) return null;
  return { ...incoming, technologyIds: ids, technologies: nextNames };
}

async function validateUpdatedStudentSkills(
  classrooms: ReturnType<typeof createClassroomRepository>,
  incoming: ProposalDraftFields,
  previous: ProposalDraftFields,
  studentId: string,
) {
  const previousSkills = previous.skills ?? [];
  const incomingSkills = incoming.skills;
  const unchanged = incoming.mentorSkills === undefined
    && (incomingSkills === undefined || (incomingSkills.length === previousSkills.length && incomingSkills.every((skill, index) => skill === previousSkills[index])));
  if (unchanged) return {
    ok: true as const,
    proposal: {
      ...incoming,
      skills: previousSkills,
      ...(previous.mentorSkills ? { mentorSkills: previous.mentorSkills } : {}),
    },
  };
  return validateStudentSkillSelection(classrooms, incoming, studentId, false);
}

async function requireStudent(request: IncomingMessage, response: ServerResponse, auth?: FragmentsAuthService): Promise<{ id: string } | null> {
  if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso estudiantil no está habilitado."); return null; }
  try {
    const student = await auth.student(request);
    if (!student) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión con GitHub para continuar."); return null; }
    return student;
  } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión."); return null; }
}

async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 64 * 1024) {
        sendError(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido.");
        return undefined;
      }
    }
    return JSON.parse(raw);
  } catch {
    sendError(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido.");
    return undefined;
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  const body = { ok: false as const, error: { code, message } };
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
