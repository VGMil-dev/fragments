import {
  CreateMentorSubmissionRequestSchema,
  CreateProposalRequestSchema,
  CreateReviewSubmissionRequestSchema,
  GalleryResponseSchema,
  MentorSubmissionResponseSchema,
  ProposalEvaluationResponseSchema,
  ProposalResponseSchema,
  ReviewRequestSchema,
  ReviewResponseSchema,
  ReviewSubmissionResponseSchema,
  ReviewQueuedResponseSchema,
  type ApiResult,
  type CreateMentorSubmissionRequest,
  type CreateProposalRequest,
  type CreateReviewSubmissionRequest,
  type GalleryEntry,
  type MentorSubmissionResponse,
  type ProposalEvaluationResponse,
  type ProposalResponse,
  type ReviewRequest,
  type ReviewResponse,
  type ReviewSubmissionResponse,
} from "@fragments/contracts";
import type { ApiClient } from "./api-client";

const INVALID_REQUEST = {
  ok: false,
  error: { code: "INVALID_REQUEST", message: "Revisa los campos antes de continuar." },
} as const;

function invalid<T>(): ApiResult<T> {
  return INVALID_REQUEST;
}

function withSignal(signal?: AbortSignal, init: RequestInit = {}): RequestInit {
  return signal ? { ...init, signal } : init;
}

function jsonRequest(method: "POST", body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ...withSignal(signal),
  };
}

function encodeId(id: string): string | null {
  const value = id.trim();
  return value ? encodeURIComponent(value) : null;
}

export function createStudentApi(client: ApiClient) {
  return {
    getGallery(signal?: AbortSignal): Promise<ApiResult<GalleryEntry[]>> {
      return client.request("/api/gallery", GalleryResponseSchema, withSignal(signal));
    },

    saveProposal(input: CreateProposalRequest, signal?: AbortSignal): Promise<ApiResult<ProposalResponse>> {
      const request = CreateProposalRequestSchema.safeParse(input);
      if (!request.success) return Promise.resolve(invalid<ProposalResponse>());
      return client.request("/api/proposals", ProposalResponseSchema, jsonRequest("POST", request.data, signal));
    },

    evaluateProposal(proposalId: string, signal?: AbortSignal): Promise<ApiResult<ProposalEvaluationResponse>> {
      const id = encodeId(proposalId);
      if (!id) return Promise.resolve(invalid<ProposalEvaluationResponse>());
      return client.request(`/api/proposals/${id}/review`, ProposalEvaluationResponseSchema, withSignal(signal, { method: "POST" }));
    },

    createReview(input: ReviewRequest, signal?: AbortSignal): Promise<ApiResult<ReviewResponse>> {
      const request = ReviewRequestSchema.safeParse(input);
      if (!request.success) return Promise.resolve(invalid<ReviewResponse>());
      return client.request("/api/reviews", ReviewQueuedResponseSchema, jsonRequest("POST", request.data, signal));
    },

    getReview(reviewId: string, signal?: AbortSignal): Promise<ApiResult<ReviewResponse>> {
      const id = encodeId(reviewId);
      if (!id) return Promise.resolve(invalid<ReviewResponse>());
      return client.request(`/api/reviews/${id}`, ReviewResponseSchema, withSignal(signal));
    },

    createMentorSubmission(input: CreateMentorSubmissionRequest, signal?: AbortSignal): Promise<ApiResult<MentorSubmissionResponse>> {
      const request = CreateMentorSubmissionRequestSchema.safeParse(input);
      if (!request.success) return Promise.resolve(invalid<MentorSubmissionResponse>());
      return client.request("/api/mentor-submissions", MentorSubmissionResponseSchema, jsonRequest("POST", request.data, signal));
    },

    createReviewSubmission(input: CreateReviewSubmissionRequest, signal?: AbortSignal): Promise<ApiResult<ReviewSubmissionResponse>> {
      const request = CreateReviewSubmissionRequestSchema.safeParse(input);
      if (!request.success) return Promise.resolve(invalid<ReviewSubmissionResponse>());
      return client.request("/api/review-submissions", ReviewSubmissionResponseSchema, jsonRequest("POST", request.data, signal));
    },

    downloadMentorReadme(submissionId: string, signal?: AbortSignal): Promise<ApiResult<string>> {
      const id = encodeId(submissionId);
      if (!id) return Promise.resolve(invalid<string>());
      return client.downloadText(`/api/mentor-submissions/${id}/readme`, withSignal(signal));
    },

    downloadMentorPdf(submissionId: string, signal?: AbortSignal): Promise<ApiResult<Blob>> {
      const id = encodeId(submissionId);
      if (!id) return Promise.resolve(invalid<Blob>());
      return client.downloadPdf(`/api/mentor-submissions/${id}/pdf`, withSignal(signal));
    },

    downloadReviewPdf(submissionId: string, signal?: AbortSignal): Promise<ApiResult<Blob>> {
      const id = encodeId(submissionId);
      if (!id) return Promise.resolve(invalid<Blob>());
      return client.downloadPdf(`/api/review-submissions/${id}/pdf`, withSignal(signal));
    },
  };
}
