import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  CreateMentorSubmissionRequestSchema,
  CreateProposalRequestSchema,
  GalleryResponseSchema,
  ProposalEvaluationResponseSchema,
  ProposalResponseSchema,
  SubmissionResponseSchema,
  VerifySubmissionResponseSchema,
} from "@fragments/contracts";
import { createMentorRepository } from "./repository.js";
import type { createMentorService } from "./service.js";

type MentorService = ReturnType<typeof createMentorService>;
type RouteResult = "handled" | "unhandled";

export function createMentorHttp(database: DatabaseSync, service: MentorService) {
  const repository = createMentorRepository(database);

  return async function handleMentorHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/gallery") {
      sendJson(response, 200, { ok: true, data: GalleryResponseSchema.parse([]) });
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
      const saved = repository.createProposal(proposal.data);
      sendJson(response, 201, { ok: true, data: ProposalResponseSchema.parse(saved) });
      return "handled";
    }

    const evaluateMatch = request.method === "POST" && url.pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]{1,100})\/review$/);
    if (evaluateMatch) {
      const proposal = repository.getProposal(evaluateMatch[1]!);
      if (!proposal) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta.");
        return "handled";
      }
      try {
        const evaluatedAt = new Date().toISOString();
        const evaluationId = randomUUID();
        const result = await service.evaluate(proposal.proposal);
        const responseData = ProposalEvaluationResponseSchema.parse({
          evaluationId,
          proposalId: proposal.id,
          proposalVersion: proposal.version,
          viability: result.analysis.score >= 75 ? "feasible" : result.analysis.score >= 50 ? "needs_revision" : "not_feasible",
          analysis: result.analysis,
          guidance: result.guidance,
          similarityMatches: [],
          evaluatedAt,
        });
        repository.saveEvaluation(evaluationId, proposal.id, proposal.version, result, new Date(evaluatedAt));
        sendJson(response, 200, { ok: true, data: responseData });
      } catch {
        sendError(response, 503, "EVALUATION_UNAVAILABLE", "No se pudo evaluar la propuesta en este momento.");
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
      const proposal = repository.getProposal(input.data.proposalId);
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
      if (!submission) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega.");
        return "handled";
      }
      try {
        if (submission.kind !== "mentor") {
          sendError(response, 503, "VERIFICATION_UNAVAILABLE", "La verificación de este tipo de entrega no está habilitada.");
          return "handled";
        }
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
