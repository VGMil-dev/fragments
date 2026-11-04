import { SessionAuth } from "./session.js";

export interface TeacherCredentialVerifier {
  verify(email: string, password: string): Promise<string | null>;
}

export interface IssuedTeacherSession { teacherId: string; token: string; expiresAt: number }

export class TeacherSessionService {
  constructor(private readonly verifier: TeacherCredentialVerifier, private readonly sessions: SessionAuth) {}

  async login(email: string, password: string, now = Date.now()): Promise<IssuedTeacherSession | null> {
    const teacherId = await this.verifier.verify(email, password);
    if (!teacherId) return null;
    const expiresAt = now + 8 * 60 * 60 * 1000;
    return { teacherId, token: this.sessions.issue(teacherId, now), expiresAt };
  }

  verify(token: string, now = Date.now()) { return this.sessions.verify(token, now); }
}
