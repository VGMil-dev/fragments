import type { SubmissionSnapshot } from "../../../../../packages/contracts/src/index.js";
import type { ReviewRecord } from "./review.service.js";

/** Test/development store only; the API platform owns durable SQLite persistence. */
export function createInMemoryReviewStore() {
  const byId = new Map<string, ReviewRecord>();
  const byKey = new Map<string, ReviewRecord>();
  const submissions = new Map<string, SubmissionSnapshot>();
  return {
    async getByKey(key: string) { return byKey.get(key) ?? null; },
    async getById(id: string) { return byId.get(id) ?? null; },
    async save(record: ReviewRecord) { byId.set(record.id, record); byKey.set(record.key, record); return record; },
    async saveSubmission(snapshot: SubmissionSnapshot) { submissions.set(snapshot.verificationCode, snapshot); },
    async getByVerificationCode(code: string) { return submissions.get(code) ?? null; },
  };
}
