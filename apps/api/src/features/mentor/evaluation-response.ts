import { ProposalEvaluationResponseSchema } from "@fragments/contracts";
import type { MentorEvaluation } from "./service.js";

export function proposalEvaluationResponse(
  evaluationId: string,
  proposalId: string,
  proposalVersion: number,
  evaluation: MentorEvaluation,
  evaluatedAt: string,
) {
  return ProposalEvaluationResponseSchema.parse({
    evaluationId,
    proposalId,
    proposalVersion,
    viability: evaluation.analysis.score >= 75 ? "feasible" : evaluation.analysis.score >= 50 ? "needs_revision" : "not_feasible",
    analysis: evaluation.analysis,
    guidance: evaluation.guidance,
    similarityMatches: evaluation.similarities.filter((item) => item.galleryId).map((item) => ({ galleryId: item.galleryId!, title: item.title, reason: item.overlap })),
    ...(evaluation.mentorContextVersion ? { mentorContextVersion: evaluation.mentorContextVersion } : {}),
    ...(evaluation.mentorContext ? { mentorContext: evaluation.mentorContext } : {}),
    ...(evaluation.criterionBreakdown ? { criterionBreakdown: evaluation.criterionBreakdown } : {}),
    evaluatedAt,
  });
}
