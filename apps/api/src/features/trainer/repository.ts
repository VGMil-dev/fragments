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
    saveBank(reviewId: string, commitSha: string, challenges: TrainerChallenge[], createdAt: string): TrainerChallenge[] {
      database.prepare("INSERT INTO trainer_banks(review_id, commit_sha, challenges_json, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(review_id, commit_sha) DO NOTHING")
        .run(reviewId, commitSha, JSON.stringify(challenges), createdAt);
      return this.getBank(reviewId, commitSha) ?? challenges;
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
