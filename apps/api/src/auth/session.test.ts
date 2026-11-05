import { describe, expect, it } from "vitest";
import { SessionAuth } from "./session.js";

describe("SessionAuth", () => {
  it("issues verifiable teacher sessions and rejects tampering and expiry", () => {
    const auth = new SessionAuth("s".repeat(40));
    const token = auth.issue("teacher-1", 100, 50);
    expect(auth.verify(token, 120)).toMatchObject({ teacherId: "teacher-1", expiresAt: 150 });
    expect(auth.verify(`${token}x`, 120)).toBeNull();
    expect(auth.verify(token, 150)).toBeNull();
  });

  it("refuses weak server secrets", () => {
    expect(() => new SessionAuth("too-short")).toThrow(/32 caracteres/);
  });
});
