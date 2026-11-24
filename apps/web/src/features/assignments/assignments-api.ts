import {
  AssignmentDraftSchema, ClassroomAssignmentSchema, ClassroomAssignmentsResponseSchema, CreateAssignmentRequestSchema,
  AssignmentMissionPlanCapabilitySchema, PublishAssignmentRequestSchema, StudentAssignmentsResponseSchema, UpdateAssignmentDraftRequestSchema,
} from "@fragments/contracts";
import { createApiClient } from "../../lib/api/api-client.js";

const api = createApiClient();
const planHeaders = { "x-fragments-mission-plan": "1" };
const json = (method: string, value: unknown): RequestInit => ({ method, headers: { "content-type": "application/json", ...planHeaders }, body: JSON.stringify(value) });
const segment = (value: string) => encodeURIComponent(value);

export const assignmentsApi = {
  missionPlanCapability() { return api.request("/api/mission-plan-capability", AssignmentMissionPlanCapabilitySchema); },
  listTeacher(classroomId: string) { return api.request(`/api/teacher/classrooms/${segment(classroomId)}/assignments`, ClassroomAssignmentsResponseSchema, { headers: planHeaders }); },
  create(classroomId: string, draft: unknown) {
    const input = CreateAssignmentRequestSchema.safeParse(draft);
    return input.success ? api.request(`/api/teacher/classrooms/${segment(classroomId)}/assignments`, ClassroomAssignmentSchema, json("POST", input.data)) : Promise.resolve({ ok: false as const, error: { code: "INVALID_INPUT", message: "Revisa el borrador y las habilidades." } });
  },
  update(classroomId: string, assignmentId: string, expectedVersion: number, draft: unknown) {
    const parsedDraft = AssignmentDraftSchema.safeParse(draft);
    const input = parsedDraft.success ? UpdateAssignmentDraftRequestSchema.safeParse({ ...parsedDraft.data, expectedVersion }) : null;
    return input?.success ? api.request(`/api/teacher/classrooms/${segment(classroomId)}/assignments/${segment(assignmentId)}/draft`, ClassroomAssignmentSchema, json("PATCH", input.data)) : Promise.resolve({ ok: false as const, error: { code: "INVALID_INPUT", message: "Revisa el borrador y las habilidades." } });
  },
  publish(classroomId: string, assignmentId: string, expectedVersion: number) {
    const input = PublishAssignmentRequestSchema.safeParse({ expectedVersion });
    return input.success ? api.request(`/api/teacher/classrooms/${segment(classroomId)}/assignments/${segment(assignmentId)}/publish`, ClassroomAssignmentSchema, json("POST", input.data)) : Promise.resolve({ ok: false as const, error: { code: "INVALID_INPUT", message: "Revisa la versión del borrador." } });
  },
  listStudent(classroomId: string) { return api.request(`/api/me/classrooms/${segment(classroomId)}/assignments`, StudentAssignmentsResponseSchema, { headers: planHeaders }); },
};
