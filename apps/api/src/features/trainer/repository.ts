import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type TrainerStatus = "pending" | "in_progress" | "completed" | "need_more";
export type TrainerChallenge = {
  id: string;
  reviewId: string;
  projectId: string;
  commitSha: string;
  feature: string;
  task: string;
  expectedObservation: string;
  restoration: string;
  estimatedMinutes: number;
  sourcePath: string;
  sourceLines: [number, number];
  hints: [string, string, string];
  createdAt: string;
};
export type TrainerAttempt = {
  id: string;
  reviewId: string;
  challengeId: string;
  feature: string;
  status: TrainerStatus;
  hintsUsed: number;
  attemptedAt: string;
};

export function createTrainerRepository(database: DatabaseSync) {
  return {
    ensureSession(sessionHash: string, now: Date): boolean {
      const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
      const existing = database.prepare("SELECT expires_at FROM trainer_sessions WHERE session_hash = ?").get(sessionHash) as { expires_at: string } | undefined;
      if (existing && existing.expires_at > now.toISOString()) {
        database.prepare("UPDATE trainer_sessions SET expires_at = ? WHERE session_hash = ?").run(expiresAt, sessionHash);
        return true;
      }
      database.prepare("INSERT INTO trainer_sessions(session_hash, created_at, expires_at) VALUES (?, ?, ?) ON CONFLICT(session_hash) DO UPDATE SET created_at=excluded.created_at, expires_at=excluded.expires_at")
        .run(sessionHash, now.toISOString(), expiresAt);
      return false;
    },
    getBank(reviewId: string, commitSha: string): TrainerChallenge[] | null {
      const row = database.prepare("SELECT challenges_json FROM trainer_banks WHERE review_id = ? AND commit_sha = ?")
        .get(reviewId, commitSha) as { challenges_json: string } | undefined;
      return row ? JSON.parse(row.challenges_json) as TrainerChallenge[] : null;
    },
    isBankReady(reviewId: string, commitSha: string): boolean {
      const row = database.prepare("SELECT bank_ready FROM trainer_banks WHERE review_id = ? AND commit_sha = ?")
        .get(reviewId, commitSha) as { bank_ready: number } | undefined;
      return row?.bank_ready === 1;
    },
    claimBankGeneration(reviewId: string, commitSha: string, owner: string, now: number, leaseMs: number): boolean {
      database.exec("BEGIN IMMEDIATE");
      try {
        database.prepare(`INSERT OR IGNORE INTO trainer_banks(review_id, commit_sha, challenges_json, created_at, bank_ready)
          VALUES (?, ?, '[]', ?, 0)`).run(reviewId, commitSha, new Date(now).toISOString());
        const result = database.prepare(`UPDATE trainer_banks SET generation_owner=?, generation_lease_until=?
          WHERE review_id=? AND commit_sha=? AND bank_ready=0
          AND (generation_owner IS NULL OR generation_lease_until <= ?)`)
          .run(owner, now + leaseMs, reviewId, commitSha, now);
        database.exec("COMMIT");
        return result.changes === 1;
      } catch (cause) { database.exec("ROLLBACK"); throw cause; }
    },
    releaseBankGeneration(reviewId: string, commitSha: string, owner: string): void {
      database.prepare("UPDATE trainer_banks SET generation_owner=NULL, generation_lease_until=NULL WHERE review_id=? AND commit_sha=? AND generation_owner=? AND bank_ready=0")
        .run(reviewId, commitSha, owner);
    },
    saveBank(reviewId: string, commitSha: string, challenges: TrainerChallenge[], createdAt: string, ready = true, generationOwner?: string): TrainerChallenge[] {
      database.exec("BEGIN IMMEDIATE");
      try {
        const current = this.getBank(reviewId, commitSha) ?? [];
        const byFeature = new Map(current.map((challenge) => [challenge.feature, challenge]));
        for (const challenge of challenges) if (!byFeature.has(challenge.feature)) byFeature.set(challenge.feature, challenge);
        const merged = [...byFeature.values()];
        if (generationOwner) {
          const result = database.prepare(`UPDATE trainer_banks SET challenges_json=?, bank_ready=?, generation_owner=NULL, generation_lease_until=NULL
            WHERE review_id=? AND commit_sha=? AND generation_owner=? AND bank_ready=0`)
            .run(JSON.stringify(merged), ready ? 1 : 0, reviewId, commitSha, generationOwner);
          if (result.changes !== 1) throw new Error("Se perdió la reserva de generación del banco Trainer.");
        } else {
          database.prepare(`INSERT INTO trainer_banks(review_id, commit_sha, challenges_json, created_at, bank_ready)
            VALUES (?, ?, ?, ?, ?) ON CONFLICT(review_id, commit_sha) DO UPDATE SET challenges_json=excluded.challenges_json, bank_ready=excluded.bank_ready`)
            .run(reviewId, commitSha, JSON.stringify(merged), createdAt, ready ? 1 : 0);
        }
        database.exec("COMMIT");
        return merged;
      } catch (cause) { database.exec("ROLLBACK"); throw cause; }
    },
    history(sessionHash: string, reviewId?: string): TrainerAttempt[] {
      const rows = reviewId
        ? database.prepare("SELECT id, review_id, challenge_id, feature, status, hints_used, attempted_at FROM trainer_attempts WHERE session_hash = ? AND review_id = ? ORDER BY attempted_at DESC LIMIT 200").all(sessionHash, reviewId)
        : database.prepare("SELECT id, review_id, challenge_id, feature, status, hints_used, attempted_at FROM trainer_attempts WHERE session_hash = ? ORDER BY attempted_at DESC LIMIT 200").all(sessionHash);
      return (rows as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id), reviewId: String(row.review_id), challengeId: String(row.challenge_id), feature: String(row.feature),
        status: row.status as TrainerStatus, hintsUsed: Number(row.hints_used), attemptedAt: String(row.attempted_at),
      }));
    },
    practicedFeatures(reviewId: string): string[] {
      const rows = database.prepare("SELECT feature FROM trainer_attempts WHERE review_id = ? GROUP BY feature ORDER BY MAX(attempted_at) DESC LIMIT 20").all(reviewId) as Array<{ feature: string }>;
      return rows.map((row) => row.feature);
    },
    recordAttempt(input: Omit<TrainerAttempt, "id"> & { sessionHash: string }): TrainerAttempt {
      const id = randomUUID();
      database.prepare("INSERT INTO trainer_attempts(id, session_hash, review_id, challenge_id, feature, status, hints_used, attempted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, input.sessionHash, input.reviewId, input.challengeId, input.feature, input.status, input.hintsUsed, input.attemptedAt);
      return { id, reviewId: input.reviewId, challengeId: input.challengeId, feature: input.feature, status: input.status, hintsUsed: input.hintsUsed, attemptedAt: input.attemptedAt };
    },
  };
}
