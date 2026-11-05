import { loadConfig } from "../platform/config.js";
import { openDatabase } from "../db/open.js";
import { createMigratedFragmentsAuth } from "./better-auth.js";

const config = loadConfig();
const email = process.env.TEACHER_TEST_EMAIL?.trim();
const password = process.env.TEACHER_TEST_PASSWORD;
const secret = process.env.BETTER_AUTH_SECRET;

if (!config.authEnabled || !secret) throw new Error("Habilita Better Auth local antes de provisionar la cuenta docente.");
if (!email || !password || password.length < 12) throw new Error("Configura TEACHER_TEST_EMAIL y una TEACHER_TEST_PASSWORD de al menos 12 caracteres.");

const database = openDatabase(config.databasePath);
try {
  const auth = await createMigratedFragmentsAuth(database, {
    secret,
    baseURL: config.betterAuthUrl,
    publicAppURL: config.publicAppUrl,
    allowSignUp: true,
  });
  const existing = database.prepare("SELECT id, isTeacher FROM user WHERE lower(email)=lower(?) LIMIT 1").get(email) as { id: string; isTeacher: number } | undefined;
  if (existing) {
    if (existing.isTeacher !== 1) throw new Error("La cuenta indicada ya existe y no tiene rol docente; no se modificó.");
    process.stdout.write("La cuenta docente local ya existe.\n");
  } else {
    const result = await auth.api.signUpEmail({ body: { name: "Docente local", email, password } });
    const changed = database.prepare("UPDATE user SET isTeacher=1 WHERE id=? AND isTeacher=0").run(result.user.id).changes;
    if (changed !== 1) throw new Error("No se pudo asignar el rol docente a la cuenta local.");
    process.stdout.write("Cuenta docente local creada; las credenciales no se imprimieron.\n");
  }
} catch {
  process.stderr.write("No se pudo provisionar la cuenta docente local; revisa la configuración sin mostrar sus valores.\n");
  process.exitCode = 1;
} finally {
  database.close();
}
