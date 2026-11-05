import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface SessionClaims { teacherId: string; expiresAt: number }
export class SessionAuth {
  constructor(private readonly secret: string) {
    if (secret.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  }
  issue(teacherId: string, now = Date.now(), lifetimeMs = 8 * 60 * 60 * 1000): string {
    const payload = Buffer.from(JSON.stringify({ teacherId, expiresAt: now + lifetimeMs, nonce: randomBytes(16).toString("base64url") })).toString("base64url");
    return `${payload}.${this.sign(payload)}`;
  }
  verify(token: string, now = Date.now()): SessionClaims | null {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined) return null;
    const expected = Buffer.from(this.sign(payload)); const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    try {
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
      return claims.teacherId && Number.isFinite(claims.expiresAt) && claims.expiresAt > now ? claims : null;
    } catch { return null; }
  }
  private sign(payload: string): string { return createHmac("sha256", this.secret).update(payload).digest("base64url"); }
}
