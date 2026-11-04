import {
  InspectorAssignChallengeRequestSchema,
  InspectorChallengeRecordResponseSchema,
  InspectorChallengeRecordsResponseSchema,
  InspectorDefenseRecordRequestSchema,
  type ApiResult,
  type InspectorChallengeRecordResponse,
  type InspectorDefenseRecordRequest,
} from "@fragments/contracts";
import type { ApiClient } from "./api-client";

const INVALID_REQUEST = {
  ok: false,
  error: { code: "INVALID_REQUEST", message: "Revisa los datos antes de continuar." },
} as const;

function encodeId(id: string): string | null {
  const value = id.trim();
  return value ? encodeURIComponent(value) : null;
}

function jsonRequest(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export function createInspectorApi(client: ApiClient) {
  return {
    list(reviewId: string): Promise<ApiResult<InspectorChallengeRecordResponse[]>> {
      const id = encodeId(reviewId);
      if (!id) return Promise.resolve(INVALID_REQUEST);
      return client.request(`/api/inspector/${id}/challenges`, InspectorChallengeRecordsResponseSchema);
    },

    create(reviewId: string): Promise<ApiResult<InspectorChallengeRecordResponse>> {
      const id = encodeId(reviewId);
      if (!id) return Promise.resolve(INVALID_REQUEST);
      return client.request(`/api/inspector/${id}/challenges`, InspectorChallengeRecordResponseSchema, { method: "POST" });
    },

    assign(challengeId: string): Promise<ApiResult<InspectorChallengeRecordResponse>> {
      const id = encodeId(challengeId);
      if (!id) return Promise.resolve(INVALID_REQUEST);
      const body = InspectorAssignChallengeRequestSchema.parse({});
      return client.request(`/api/inspector/challenges/${id}/assign`, InspectorChallengeRecordResponseSchema, jsonRequest(body));
    },

    record(challengeId: string, input: InspectorDefenseRecordRequest): Promise<ApiResult<InspectorChallengeRecordResponse>> {
      const id = encodeId(challengeId);
      const body = InspectorDefenseRecordRequestSchema.safeParse(input);
      if (!id || !body.success) return Promise.resolve(INVALID_REQUEST);
      return client.request(`/api/inspector/challenges/${id}/record`, InspectorChallengeRecordResponseSchema, jsonRequest(body.data));
    },
  };
}
