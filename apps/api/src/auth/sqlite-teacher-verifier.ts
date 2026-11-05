import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { TeacherCredentialVerifier } from "./session-service.js";

const KEY_BYTES = 64;
// Keep in sync with the scrypt format accepted by the Inspector session adapter.
const DEFAULT_N = 1 << 14;
const R = 8;
const P = 1;

type ScryptHash = { n: number; r: number; p: number; salt: Buffer; key: Buffer };

function derive(password: string, salt: Buffer, options: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, KEY_BYTES, options, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashTeacherPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) throw new Error("La contraseña docente debe tener entre 12 y 1024 caracteres.");
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N: DEFAULT_N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${DEFAULT_N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

function parseHash(encoded: string): ScryptHash | null {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const n = Number(parts[1]); const r = Number(parts[2]); const p = Number(parts[3]);
  if (!Number.isInteger(n) || n < (1 << 14) || n > (1 << 18) || (n & (n - 1)) !== 0 || r !== 8 || p !== 1) return null;
  try {
    const salt = Buffer.from(parts[4]!, "base64url"); const key = Buffer.from(parts[5]!, "base64url");
    if (salt.length < 16 || salt.length > 64 || key.length !== KEY_BYTES) return null;
    return { n, r, p, salt, key };
  } catch { return null; }
}

export class SqliteTeacherCredentialVerifier implements TeacherCredentialVerifier {
  constructor(private readonly database: DatabaseSync) {}

  async verify(email: string, password: string): Promise<string | null> {
    if (email.length > 254 || password.length < 1 || password.length > 1024) return null;
    const row = this.database.prepare("SELECT id, password_hash FROM teachers WHERE lower(email)=lower(?)").get(email.trim());
    if (!row) return null;
    const parsed = parseHash(String(row.password_hash));
    if (!parsed) return null;
    let derived: Buffer;
    try {
      derived = await derive(password, parsed.salt, { N: parsed.n, r: parsed.r, p: parsed.p, maxmem: 512 * 1024 * 1024 });
    } catch { return null; }
    return timingSafeEqual(derived, parsed.key) ? String(row.id) : null;
  }
}

export function createTeacherAccount(database: DatabaseSync, input: { id: string; email: string; passwordHash: string; now?: number }): void {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("El correo docente no es válido.");
  if (!parseHash(input.passwordHash)) throw new Error("El hash de contraseña docente no tiene un formato admitido.");
  database.prepare("INSERT INTO teachers(id,email,password_hash,created_at) VALUES(?,?,?,?)")
    .run(input.id, email, input.passwordHash, input.now ?? Date.now());
}
