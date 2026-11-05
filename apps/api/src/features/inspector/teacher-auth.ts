import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { SessionAuth } from "../../auth/session.js";
import { TeacherSessionService, type TeacherCredentialVerifier } from "../../auth/session-service.js";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_SALT = Buffer.alloc(SALT_BYTES, 0x5a);
const HASH_PATTERN = /^scrypt\$16384\$8\$1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{86})$/;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

/** Produce the hash for a controlled, manual provisioning operation; never store or log the password. */
export async function createInspectorTeacherPasswordHash(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error("La contraseña docente debe tener al menos 12 caracteres y no superar 1024 bytes.");
  }
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

function parseHash(value: string): { salt: Buffer; expected: Buffer } | null {
  const match = HASH_PATTERN.exec(value);
  if (!match) return null;
  const salt = Buffer.from(match[1]!, "base64url");
  const expected = Buffer.from(match[2]!, "base64url");
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES
    || salt.toString("base64url") !== match[1] || expected.toString("base64url") !== match[2]) return null;
  return { salt, expected };
}

export function createInspectorTeacherCredentialVerifier(database: DatabaseSync): TeacherCredentialVerifier {
  const findTeacher = database.prepare("SELECT id, password_hash FROM teachers WHERE lower(email) = lower(?) LIMIT 1");
  return {
    async verify(email, password) {
      if (typeof email !== "string" || typeof password !== "string" || Buffer.byteLength(password, "utf8") > 1024) return null;
      const row = findTeacher.get(email.trim()) as { id: string; password_hash: string } | undefined;
      const parsed = row ? parseHash(row.password_hash) : null;
      const actual = await derive(password, parsed?.salt ?? DUMMY_SALT);
      const matches = timingSafeEqual(actual, parsed?.expected ?? Buffer.alloc(KEY_BYTES));
      return row && parsed && matches ? row.id : null;
    },
  };
}

/** Composition seam for the existing cookie/session service; no login route or credentials are provisioned here. */
export function createInspectorTeacherSessionService(database: DatabaseSync, sessionSecret: string): TeacherSessionService {
  return new TeacherSessionService(createInspectorTeacherCredentialVerifier(database), new SessionAuth(sessionSecret));
}
