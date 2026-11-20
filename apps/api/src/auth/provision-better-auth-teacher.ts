import { loadConfig } from "../platform/config.js";
import { openDatabase } from "../db/open.js";
import { createFragmentsAuth } from "./better-auth.js";

const config = loadConfig();
const email = process.env.TEACHER_TEST_EMAIL?.trim();
const password = process.env.TEACHER_TEST_PASSWORD;
const secret = process.env.BETTER_AUTH_SECRET;

if (!config.authEnabled || !secret) throw new Error("Habilita Better Auth local antes de provisionar la cuenta docente.");
if (!email || !password || password.length < 12) throw new Error("Configura TEACHER_TEST_EMAIL y una TEACHER_TEST_PASSWORD de al menos 12 caracteres.");

const database = openDatabase(process.env.DATABASE_URL!);
try {
  await database.$connect();
  const auth = createFragmentsAuth(database, {
    secret,
    baseURL: config.betterAuthUrl,
    publicAppURL: config.publicAppUrl,
    allowSignUp: true,
  });
  const existing = await database.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, isTeacher: true } });
  if (existing) {
    if (!existing.isTeacher) throw new Error("La cuenta indicada ya existe y no tiene rol docente; no se modificó.");
    process.stdout.write("La cuenta docente local ya existe.\n");
  } else {
    const result = await auth.api.signUpEmail({ body: { name: "Docente local", email, password } });
    const changed = await database.user.updateMany({ where: { id: result.user.id, isTeacher: false }, data: { isTeacher: true } });
    if (changed.count !== 1) throw new Error("No se pudo asignar el rol docente a la cuenta local.");
    process.stdout.write("Cuenta docente local creada; las credenciales no se imprimieron.\n");
  }
} catch {
  process.stderr.write("No se pudo provisionar la cuenta docente local; revisa la configuración sin mostrar sus valores.\n");
  process.exitCode = 1;
} finally {
  await database.$disconnect();
}
