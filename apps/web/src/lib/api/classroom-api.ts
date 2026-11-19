import {
  ClassroomCreateRequestSchema,
  ClassroomPageSchema,
  ClassroomSchema,
  ClassroomUpdateRequestSchema,
  ClassEnrollmentSchema,
  ClassEnrollmentsResponseSchema,
  ClassJoinCodeSchema,
  ClassroomSkillsResponseSchema,
  ClassroomSkillAvailabilitySchema,
  SkillCatalogResponseSchema,
  SkillCatalogEntrySchema,
  StudentClassroomRequestsSchema,
  StudentClassroomsSchema,
  TeacherStudentsPageSchema,
} from "@fragments/contracts";
import { createApiClient } from "./api-client.js";
import { z } from "zod";

const api = createApiClient();
const AckSchema = z.object({ ok: z.literal(true) }).strict();
const TransitionSchema = z.object({ status: z.enum(["active", "rejected", "removed"]) }).strict();

export const classroomApi = {
  list(offset = 0) { return api.request(`/api/teacher/classrooms?offset=${offset}&limit=50`, ClassroomPageSchema); },
  get(id: string) { return api.request(`/api/teacher/classrooms/${id}`, ClassroomSchema); },
  create(input: unknown) { const parsed = ClassroomCreateRequestSchema.safeParse(input); return parsed.success ? api.request("/api/teacher/classrooms", ClassroomSchema, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }) : Promise.resolve({ ok: false as const, error: { code: "INVALID_INPUT", message: "Revisa los datos del aula." } }); },
  update(id: string, input: unknown) { const parsed = ClassroomUpdateRequestSchema.safeParse(input); return parsed.success ? api.request(`/api/teacher/classrooms/${id}`, ClassroomSchema, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }) : Promise.resolve({ ok: false as const, error: { code: "INVALID_INPUT", message: "Revisa los datos del aula." } }); },
  enrollments(id: string) { return api.request(`/api/teacher/classrooms/${id}/enrollments`, ClassEnrollmentsResponseSchema); },
  createCode(id: string) { return api.request(`/api/teacher/classrooms/${id}/join-code`, ClassJoinCodeSchema, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); },
  revokeCode(id: string) { return api.request(`/api/teacher/classrooms/${id}/join-code/revoke`, AckSchema, { method: "POST" }); },
  approve(classroomId: string, enrollmentId: string) { return api.request(`/api/teacher/classrooms/${classroomId}/enrollments/${enrollmentId}/approve`, TransitionSchema, { method: "POST" }); },
  reject(classroomId: string, enrollmentId: string) { return api.request(`/api/teacher/classrooms/${classroomId}/enrollments/${enrollmentId}/reject`, TransitionSchema, { method: "POST" }); },
  remove(classroomId: string, enrollmentId: string) { return api.request(`/api/teacher/classrooms/${classroomId}/enrollments/${enrollmentId}/remove`, TransitionSchema, { method: "POST" }); },
  directAssign(classroomId: string, studentId: string) { return api.request(`/api/teacher/classrooms/${classroomId}/enrollments/direct`, ClassEnrollmentSchema, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId }) }); },
  listSkills() { return api.request("/api/teacher/skills", SkillCatalogResponseSchema); },
  createSkill(input: unknown) { return api.request("/api/teacher/skills", SkillCatalogEntrySchema, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); },
  updateSkill(id: string, input: unknown) { return api.request(`/api/teacher/skills/${id}`, SkillCatalogEntrySchema, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); },
  archiveSkill(id: string) { return api.request(`/api/teacher/skills/${id}/archive`, SkillCatalogEntrySchema, { method: "POST" }); },
  classroomSkills(classroomId: string) { return api.request(`/api/teacher/classrooms/${classroomId}/skills`, ClassroomSkillsResponseSchema); },
  setSkill(classroomId: string, skillId: string, enabled: boolean) { return api.request(`/api/teacher/classrooms/${classroomId}/skills/${skillId}`, ClassroomSkillAvailabilitySchema, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled }) }); },
  students() { return api.request("/api/teacher/students?offset=0&limit=50", TeacherStudentsPageSchema); },
  myClassrooms() { return api.request("/api/me/classrooms", StudentClassroomsSchema); },
  myRequests() { return api.request("/api/me/classroom-requests", StudentClassroomRequestsSchema); },
};
