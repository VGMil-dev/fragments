import { describe, expect, it } from "vitest";
import { SessionAuth } from "./session.js";
import { TeacherSessionService, type TeacherCredentialVerifier } from "./session-service.js";

describe("TeacherSessionService", () => {
  it("issues a session only after the injected credential verifier accepts", async () => {
    const fakeVerifier: TeacherCredentialVerifier = {
      async verify(email, password) {
        return email === "teacher@example.test" && password === "fake-fixture-password" ? "teacher-fixture-01" : null;
      },
    };
    const service = new TeacherSessionService(fakeVerifier, new SessionAuth("test-only-secret-".repeat(3)));
    const result = await service.login("teacher@example.test", "fake-fixture-password", 100);

    expect(result?.teacherId).toBe("teacher-fixture-01");
    expect(result && service.verify(result.token, 101)?.teacherId).toBe("teacher-fixture-01");
    expect(await service.login("teacher@example.test", "wrong-password", 100)).toBeNull();
  });
});
