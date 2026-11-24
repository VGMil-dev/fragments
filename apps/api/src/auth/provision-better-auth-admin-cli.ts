import { loadConfig } from "../platform/config.js";
import { openDatabase } from "../db/open.js";
import { createFragmentsAuth } from "./better-auth.js";
import { promoteExistingTeacherToAdmin } from "./provision-better-auth-admin.js";
import { createResendPasswordResetEmailSender } from "./resend-password-reset.js";

const config = loadConfig();
const email = process.env.FRAGMENTS_ADMIN_EMAIL;
const confirmEmail = process.env.FRAGMENTS_ADMIN_CONFIRM_EMAIL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!config.authEnabled || !secret || !email || !confirmEmail) {
  throw new Error("Se requieren Better Auth, FRAGMENTS_ADMIN_EMAIL y FRAGMENTS_ADMIN_CONFIRM_EMAIL.");
}
if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
  throw new Error("El correo de recuperación no está configurado.");
}

const database = openDatabase(process.env.DATABASE_URL!);
let disconnectFailed = false;
try {
  await database.$connect();
  const promotion = await promoteExistingTeacherToAdmin(database, { email, confirmEmail });
  let resendAccepted = false;
  let resendMessageId: string | undefined;
  const sender = createResendPasswordResetEmailSender();
  const auth = createFragmentsAuth(database, {
    secret,
    baseURL: config.betterAuthUrl,
    publicAppURL: config.publicAppUrl,
    passwordResetEmailSender: async (message) => {
      const accepted = await sender(message);
      resendAccepted = accepted.providerAccepted;
      resendMessageId = accepted.providerMessageId;
      return accepted;
    },
  });
  await auth.api.requestPasswordReset({ body: { email: email.trim(), redirectTo: `${config.publicAppUrl}/teacher/reset-password` } });
  if (!resendAccepted) throw new Error("Better Auth no confirmó que Resend aceptara el correo.");
  process.stdout.write(`Cuenta docente verificada con admin=${promotion.isAdmin}, isTeacher=${promotion.isTeacher}; Resend aceptó recovery${resendMessageId ? ` (id ${resendMessageId})` : ""}.\n`);
} catch {
  process.stderr.write("No se completó el bootstrap administrativo; revisa la configuración y el estado sin mostrar secretos.\n");
  process.exitCode = 1;
} finally {
  try {
    await database.$disconnect();
  } catch {
    disconnectFailed = true;
  }
  if (disconnectFailed) process.exitCode = 1;
}
