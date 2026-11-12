import {
  AcademicGalleryDetailSchema,
  AcademicGalleryPageSchema,
  HistoricalProjectsResponseSchema,
  GalleryWithdrawalResponseSchema,
  MeResponseSchema,
  TeacherProjectsResponseSchema,
  TeacherStudentsPageSchema,
  type AcademicGalleryDetail,
  type AcademicGalleryPage,
  type ApiResult,
  type MeResponse,
  type TeacherProjectsResponse,
  type TeacherStudentsPage,
} from "@fragments/contracts";
import type { ApiClient } from "./api-client";

function encodeId(id: string): string | null { const value = id.trim(); return value ? encodeURIComponent(value) : null; }

export function createIdentityApi(client: ApiClient) {
  return {
    getMe(signal?: AbortSignal): Promise<ApiResult<MeResponse>> {
      return client.request("/api/me", MeResponseSchema, signal ? { signal } : {});
    },
    getGallery(offset = 0, signal?: AbortSignal): Promise<ApiResult<AcademicGalleryPage>> {
      return client.request(`/api/gallery?offset=${Math.max(0, Math.trunc(offset))}&limit=20`, AcademicGalleryPageSchema, signal ? { signal } : {});
    },
    getGalleryDetail(projectId: string, signal?: AbortSignal): Promise<ApiResult<AcademicGalleryDetail>> {
      const id = encodeId(projectId);
      if (!id) return Promise.resolve({ ok: false, error: { code: "INVALID_REQUEST", message: "No se encontró el proyecto." } });
      return client.request(`/api/gallery/${id}`, AcademicGalleryDetailSchema, signal ? { signal } : {});
    },
    getTeacherStudents(offset = 0, signal?: AbortSignal): Promise<ApiResult<TeacherStudentsPage>> {
      return client.request(`/api/teacher/students?offset=${Math.max(0, Math.trunc(offset))}&limit=20`, TeacherStudentsPageSchema, signal ? { signal } : {});
    },
    getTeacherStudentProjects(userId: string, signal?: AbortSignal): Promise<ApiResult<TeacherProjectsResponse>> {
      const id = encodeId(userId);
      if (!id) return Promise.resolve({ ok: false, error: { code: "INVALID_REQUEST", message: "No se encontró el perfil." } });
      return client.request(`/api/teacher/students/${id}/projects`, TeacherProjectsResponseSchema, signal ? { signal } : {});
    },
    getHistoricalProjects(signal?: AbortSignal): Promise<ApiResult<Array<{ id: string; title: string; currentVersion: number; updatedAt: string }>>> {
      return client.request("/api/teacher/historical-projects", HistoricalProjectsResponseSchema, signal ? { signal } : {});
    },
    async withdrawProject(projectId: string, reason: string, signal?: AbortSignal): Promise<ApiResult<{ withdrawn: true }>> {
      const id = encodeId(projectId);
      if (!id || !reason.trim()) return { ok: false, error: { code: "INVALID_REQUEST", message: "Indica el motivo para retirar el proyecto." } };
      return client.request(`/api/teacher/projects/${id}/withdraw`, GalleryWithdrawalResponseSchema, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }), ...(signal ? { signal } : {}),
      });
    },
  };
}
