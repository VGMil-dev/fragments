import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  CreateMentorSubmissionRequestSchema,
  CreateProposalRequestSchema,
  GalleryOptInRequestSchema,
  GalleryResponseSchema,
  ProposalResponseSchema,
  UpdateProposalRequestSchema,
  SubmissionResponseSchema,
  VerifySubmissionResponseSchema,
} from "@fragments/contracts";
import { createMentorRepository } from "./repository.js";
import { createMentorControlRepository } from "./control-repository.js";
import { proposalEvaluationResponse } from "./evaluation-response.js";
import { MentorEvaluationFailure, MentorInputError, type createMentorService } from "./service.js";

type MentorService = ReturnType<typeof createMentorService>;
type RouteResult = "handled" | "unhandled";
type MentorEvaluationDiagnostic = {
  event: "mentor_evaluation_failed";
  stage: string;
  error_type: string;
  duration_ms: number;
  http_status: number;
  provider_http_status: number | null;
  provider_code: string | null;
  retry_after_ms: number | null;
};

export function createMentorHttp(
  database: DatabaseSync,
  service: MentorService,
  options: { logFailure?: (diagnostic: MentorEvaluationDiagnostic) => void } = {},
) {
  const repository = createMentorRepository(database);
  const control = createMentorControlRepository(database);
  const pending = new Map<string, Promise<{ id: string; evaluation: Awaited<ReturnType<MentorService["evaluate"]>>; evaluatedAt: string }>>();
  const logFailure = options.logFailure ?? ((diagnostic: MentorEvaluationDiagnostic) => console.error(JSON.stringify(diagnostic)));

  return async function handleMentorHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/gallery") {
      sendJson(response, 200, { ok: true, data: GalleryResponseSchema.parse(repository.listGallery()) });
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/proposals") {
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const proposal = CreateProposalRequestSchema.safeParse(raw);
      if (!proposal.success) {
        sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta.");
        return "handled";
      }
      const currentOwner = readOwnerToken(request);
      const ownerToken = currentOwner ?? randomBytes(32).toString("base64url");
      const saved = repository.createProposal(proposal.data, hashOwnerToken(ownerToken));
      if (!currentOwner) response.setHeader("set-cookie", `fragments_proposal_owner=${ownerToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=31536000`);
      sendJson(response, 201, { ok: true, data: ProposalResponseSchema.parse(saved) });
      return "handled";
    }

    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})$/);
    const ownerToken = readOwnerToken(request);
    const ownerHash = ownerToken ? hashOwnerToken(ownerToken) : null;
    if (request.method === "PUT" && proposalMatch) {
      if (!ownerHash) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = UpdateProposalRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los campos de tu propuesta y la versión que editas."); return "handled"; }
      const saved = repository.updateProposal(proposalMatch[1]!, ownerHash, input.data.expectedVersion, input.data);
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
      const history = ownerHash ? repository.getProposalHistory(historyMatch[1]!, ownerHash) : null;
      if (!history) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      sendJson(response, 200, { ok: true, data: history.map((entry) => ProposalResponseSchema.parse(entry)) });
      return "handled";
    }

    const galleryOptInMatch = request.method === "PUT" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/gallery-opt-in$/);
    if (galleryOptInMatch) {
      if (!ownerHash) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = GalleryOptInRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Indica si quieres publicar esta versión de la propuesta."); return "handled"; }
      const result = repository.setGalleryOptIn(galleryOptInMatch[1]!, ownerHash, input.data.optIn);
      if (result.status === "not_found") { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta."); return "handled"; }
      sendJson(response, 200, { ok: true, data: GalleryOptInRequestSchema.parse(input.data) });
      return "handled";
    }

    const evaluateMatch = request.method === "POST" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/review$/);
    const recoverEvaluationMatch = request.method === "GET" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/review$/);
    if (recoverEvaluationMatch) {
      const proposal = ownerHash ? repository.getOwnedProposal(recoverEvaluationMatch[1]!, ownerHash) : null;
      const latest = proposal ? repository.getLatestEvaluation(proposal.id, proposal.version) : null;
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
      const proposal = ownerHash ? repository.getOwnedProposal(evaluateMatch[1]!, ownerHash) : null;
      if (!proposal) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta.");
        return "handled";
      }
      const startedAt = performance.now();
      try {
        const active = control.getActive();
        const inputDigest = service.proposalDigest(proposal.proposal);
        const cacheKey = `${proposal.id}:${proposal.version}:${inputDigest}:${active.version}`;
        let stored = repository.getCachedEvaluation(proposal.id, proposal.version, inputDigest, active.version);
        if (!stored) {
          let work = pending.get(cacheKey);
          if (!work) {
            work = (async () => {
              const result = await service.evaluate(proposal.proposal, repository.listGallery(), { config: active.config, version: active.version });
              const evaluatedAt = new Date().toISOString();
              const evaluationId = randomUUID();
              repository.saveEvaluation(evaluationId, proposal.id, proposal.version, result, inputDigest, active.version, new Date(evaluatedAt));
              return repository.getCachedEvaluation(proposal.id, proposal.version, inputDigest, active.version) ?? { id: evaluationId, evaluation: result, evaluatedAt };
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
          http_status: 503,
          provider_http_status: failure?.providerHttpStatus ?? null,
          provider_code: failure?.providerCode ?? null,
          retry_after_ms: failure?.retryAfterMs ?? null,
        };
        try { logFailure(diagnostic); } catch { /* diagnostics must not change the route result */ }
        if (diagnostic.stage === "budget_reservation") {
          sendError(response, 503, "AI_BUDGET_UNAVAILABLE", "La evaluación no está disponible porque se agotó el presupuesto de IA configurado.");
        } else {
          sendError(response, 503, "EVALUATION_UNAVAILABLE", "No se pudo evaluar la propuesta en este momento.");
        }
      }
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/mentor-submissions") {
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const input = CreateMentorSubmissionRequestSchema.safeParse(raw);
      if (!input.success) {
        sendError(response, 400, "INVALID_INPUT", "Revisa los datos de la entrega.");
        return "handled";
      }
      const proposal = ownerHash ? repository.getOwnedProposal(input.data.proposalId, ownerHash) : null;
      if (!proposal || proposal.version !== input.data.proposalVersion) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la versión de propuesta.");
        return "handled";
      }
      const evaluation = repository.getEvaluation(input.data.evaluationId, proposal.id, proposal.version);
      if (!evaluation) {
        sendError(response, 409, "EVALUATION_REQUIRED", "Evalúa esta versión antes de generar la entrega.");
        return "handled";
      }
      try {
        const snapshot = await service.createSubmission({ sourceId: proposal.id, proposal: proposal.proposal, evaluation });
        const id = randomUUID();
        repository.saveSubmission(id, snapshot);
        sendJson(response, 201, { ok: true, data: SubmissionResponseSchema.parse({ ...snapshot, id }) });
      } catch {
        sendError(response, 503, "SUBMISSION_UNAVAILABLE", "No se pudo generar la entrega en este momento.");
      }
      return "handled";
    }

    const artifactMatch = request.method === "GET" && url.pathname.match(/^\/api\/mentor-submissions\/([A-Za-z0-9_-]{1,100})\/(readme|pdf)$/);
    if (artifactMatch) {
      const saved = repository.getSubmission(artifactMatch[1]!);
      if (!saved || saved.snapshot.kind !== "mentor") {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega.");
        return "handled";
      }
      if (!ownerHash || !repository.getOwnedProposal(saved.snapshot.sourceId, ownerHash)) {
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
      const submission = repository.getSubmissionByCode(verifyMatch[1]!);
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

function readOwnerToken(request: IncomingMessage): string | null {
  const cookie = request.headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)fragments_proposal_owner=([A-Za-z0-9_-]{32,128})(?:;|$)/);
  return match?.[1] ?? null;
}

function hashOwnerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
