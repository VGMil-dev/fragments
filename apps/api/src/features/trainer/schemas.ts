import { z } from "zod";

export const TrainerStatusSchema = z.enum(["pending", "in_progress", "completed", "need_more"]);
export const TrainerReviewSchema = z.object({
  id: z.string().min(1).max(100), owner: z.string().min(1).max(39), repo: z.string().min(1).max(100),
  commitSha: z.string().regex(/^(?:[a-f\d]{40}|[a-f\d]{64})$/i), updatedAt: z.iso.datetime(),
}).strict();
export const TrainerChallengeSchema = z.object({
  id: z.string().min(1).max(100), reviewId: z.string().min(1).max(100), projectId: z.string().min(1).max(128),
  commitSha: z.string().regex(/^(?:[a-f\d]{40}|[a-f\d]{64})$/i), feature: z.string().min(1).max(1000),
  task: z.string().min(1).max(1000), expectedObservation: z.string().min(1).max(1000), restoration: z.string().min(1).max(1000),
  estimatedMinutes: z.number().int().min(5).max(60), sourcePath: z.string().min(1).max(500),
  sourceLines: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  hints: z.tuple([z.string().min(1).max(1000), z.string().min(1).max(1000), z.string().min(1).max(1000)]),
  createdAt: z.iso.datetime(),
}).strict();
export const TrainerHistoryItemSchema = z.object({
  id: z.string().min(1).max(100), reviewId: z.string().min(1).max(100), challengeId: z.string().min(1).max(100),
  feature: z.string().min(1).max(1000), status: TrainerStatusSchema, hintsUsed: z.number().int().min(0).max(3), attemptedAt: z.iso.datetime(),
}).strict();
export const TrainerHistorySchema = z.array(TrainerHistoryItemSchema).max(200);
