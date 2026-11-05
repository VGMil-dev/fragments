import { randomUUID } from "node:crypto";
import { loadConfig } from "../platform/config.js";
import { openDatabase } from "../db/open.js";
import { createTeacherAccount, hashTeacherPassword } from "./sqlite-teacher-verifier.js";

const email = process.env.TEACHER_EMAIL;
const password = process.env.TEACHER_PASSWORD;
if (!email || !password) throw new Error("Define TEACHER_EMAIL y TEACHER_PASSWORD solo para este comando.");

const database = openDatabase(loadConfig().databasePath);
try {
  const passwordHash = await hashTeacherPassword(password);
  createTeacherAccount(database, { id: randomUUID(), email, passwordHash });
  process.stdout.write("Cuenta docente creada. No se muestran sus datos.\n");
} finally {
  database.close();
}
