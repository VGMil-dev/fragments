import type { ApiResult } from "@fragments/contracts";

export type TrainerReview = { id: string; owner: string; repo: string; commitSha: string; updatedAt: string };
export type TrainerChallenge = {
  id: string; reviewId: string; projectId: string; commitSha: string; feature: string; task: string;
  expectedObservation: string; restoration: string; estimatedMinutes: number; sourcePath: string;
  sourceLines: [number, number]; hints: [string, string, string]; createdAt: string;
};
export type TrainerStatus = "pending" | "in_progress" | "completed" | "need_more";
export type TrainerHistoryItem = { id: string; reviewId: string; challengeId: string; feature: string; status: TrainerStatus; hintsUsed: number; attemptedAt: string };
type Draw = { challenge: TrainerChallenge; category: "new" | "pending" | "review" };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isText(value: unknown): value is string { return typeof value === "string"; }
function isNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isReview(value: unknown): value is TrainerReview { return isRecord(value) && [value.id, value.owner, value.repo, value.commitSha, value.updatedAt].every(isText); }
function isChallenge(value: unknown): value is TrainerChallenge {
  return isRecord(value) && [value.id, value.reviewId, value.projectId, value.commitSha, value.feature, value.task, value.expectedObservation, value.restoration, value.sourcePath, value.createdAt].every(isText)
    && isNumber(value.estimatedMinutes) && Array.isArray(value.sourceLines) && value.sourceLines.length === 2 && value.sourceLines.every(isNumber)
    && Array.isArray(value.hints) && value.hints.length === 3 && value.hints.every(isText) && !("teacherHint" in value);
}
const statuses: TrainerStatus[] = ["pending", "in_progress", "completed", "need_more"];
function isHistoryItem(value: unknown): value is TrainerHistoryItem {
  return isRecord(value) && [value.id, value.reviewId, value.challengeId, value.feature, value.attemptedAt].every(isText)
    && statuses.includes(value.status as TrainerStatus) && isNumber(value.hintsUsed);
}
function validate<T>(value: unknown, predicate: (item: unknown) => item is T): T | null { return predicate(value) ? value : null; }
async function request<T>(path: string, parse: (value: unknown) => T | null, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, { ...init, credentials: "same-origin", headers: { accept: "application/json", ...(init?.headers ?? {}) } });
    const payload: unknown = await response.json();
    if (!isRecord(payload)) throw new Error("Respuesta inválida");
    if (payload.ok === false && isRecord(payload.error) && isText(payload.error.code) && isText(payload.error.message)) return { ok: false, error: { code: payload.error.code, message: payload.error.message } };
    if (payload.ok !== true) throw new Error("Respuesta inválida");
    const data = parse(payload.data);
    if (data === null) throw new Error("Respuesta inválida");
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: "TRAINER_UNAVAILABLE", message: "No pudimos cargar Trainer. Inténtalo de nuevo." } };
  }
}
function list<T>(value: unknown, predicate: (item: unknown) => item is T): T[] | null { return Array.isArray(value) && value.every(predicate) ? value : null; }

export function createTrainerApi() {
  return {
    reviews: () => request("/api/trainer/reviews", (value) => list(value, isReview)),
    history: (reviewId?: string) => request(`/api/trainer/history${reviewId ? `?reviewId=${encodeURIComponent(reviewId)}` : ""}`, (value) => list(value, isHistoryItem)),
    draw: (reviewId: string) => request<Draw>("/api/trainer/draw", (value) => isRecord(value) && isChallenge(value.challenge) && ["new", "pending", "review"].includes(String(value.category)) ? value as unknown as Draw : null, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewId }) }),
    record: (input: { reviewId: string; challengeId: string; status: TrainerStatus; hintsUsed: number }) => request("/api/trainer/attempts", (value) => validate(value, isHistoryItem), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
  };
}
