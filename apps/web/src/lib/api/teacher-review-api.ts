import { TeacherClassroomReviewsResponseSchema } from "@fragments/contracts";
import { createApiClient } from "./api-client.js";

const api = createApiClient();

export const teacherReviewApi = {
  list(classroomId: string) {
    return api.request(`/api/teacher/classrooms/${encodeURIComponent(classroomId)}/reviews`, TeacherClassroomReviewsResponseSchema);
  },
};
