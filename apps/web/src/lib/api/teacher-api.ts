import { TeacherLoginRequestSchema, TeacherSessionResponseSchema } from "@fragments/contracts";
import type { ApiClient } from "./api-client.js";

export function createTeacherApi(client: ApiClient) {
  return {
    session() {
      return client.request("/api/teacher/session", TeacherSessionResponseSchema);
    },
    login(input: { email: string; password: string }) {
      const parsed = TeacherLoginRequestSchema.safeParse(input);
      if (!parsed.success) return Promise.resolve({ ok: false as const, error: { code: "INVALID_REQUEST", message: "Revisa tu correo y contraseña." } });
      return client.request("/api/teacher/session", TeacherSessionResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
    },
  };
}
