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

function validRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function jsonRequest(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export function createInspectorApi(client: ApiClient, createRequestId: () => string = () => globalThis.crypto.randomUUID()) {
  return {
    list(reviewId: string): Promise<ApiResult<InspectorChallengeRecordResponse[]>> {
      const id = encodeId(reviewId);
      if (!id) return Promise.resolve(INVALID_REQUEST);
      return client.request(`/api/inspector/${id}/challenges`, InspectorChallengeRecordsResponseSchema);
    },

    create(reviewId: string, requestId = createRequestId()): Promise<ApiResult<InspectorChallengeRecordResponse>> {
      const id = encodeId(reviewId);
      if (!id || !validRequestId(requestId)) return Promise.resolve(INVALID_REQUEST);
      return client.request(`/api/inspector/${id}/challenges`, InspectorChallengeRecordResponseSchema, {
        method: "POST", headers: { "idempotency-key": requestId },
      });
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
