import type { MentorEvaluationFailureStage } from "./service.js";

export type MentorOperationalEvent = {
  event: "mentor_evaluation_completed" | "mentor_evaluation_failed";
  stage: MentorEvaluationFailureStage;
  result: "success" | "failure";
  error_code: "none" | "evaluation_failed" | "invalid_input" | "configuration_unavailable" | "budget_unavailable" | "budget_exceeded" | "budget_settlement_failed" | "provider_response_invalid" | "response_validation_failed";
  duration_ms: number;
  occurred_at: string;
};

export function safeOperationalEvent(input: Omit<MentorOperationalEvent, "duration_ms" | "occurred_at"> & { duration_ms: number; occurred_at?: string }): MentorOperationalEvent {
  const stages = ["configuration", "input_validation", "budget_reservation", "budget_settlement", "provider_request", "provider_response", "response_validation", "evaluation"] as const;
  const codes = ["none", "evaluation_failed", "invalid_input", "configuration_unavailable", "budget_unavailable", "budget_exceeded", "budget_settlement_failed", "provider_response_invalid", "response_validation_failed"] as const;
  const event = input.result === "success" ? "mentor_evaluation_completed" : "mentor_evaluation_failed";
  return {
    event,
    stage: stages.includes(input.stage) ? input.stage : "evaluation",
    result: input.result === "success" ? "success" : "failure",
    error_code: codes.includes(input.error_code) ? input.error_code : "evaluation_failed",
    duration_ms: Number.isFinite(input.duration_ms) ? Math.min(300_000, Math.max(0, Math.round(input.duration_ms))) : 300_000,
    occurred_at: isCanonicalUtcTimestamp(input.occurred_at) ? input.occurred_at : new Date().toISOString(),
  };
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
