import { SubmissionResponseSchema } from "@fragments/contracts";
import type { ReviewRecord } from "./review.service.js";

type SubmissionResponse = ReturnType<typeof SubmissionResponseSchema.parse>;

/** Test/development store only; the API platform owns durable SQLite persistence. */
export function createInMemoryReviewStore() {
  const byId = new Map<string, ReviewRecord>();
  const byKey = new Map<string, ReviewRecord>();
  const submissions = new Map<string, SubmissionResponse>();
  return {
    async getByKey(key: string) { return byKey.get(key) ?? null; },
    async getById(id: string) { return byId.get(id) ?? null; },
    async save(record: ReviewRecord) { byId.set(record.id, record); byKey.set(record.key, record); return record; },
    async saveSubmission(snapshot: SubmissionResponse) { submissions.set(snapshot.verificationCode, snapshot); },
    async getByVerificationCode(code: string) { return submissions.get(code) ?? null; },
  };
}
