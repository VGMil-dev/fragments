import type { PrismaClient } from "../generated/prisma/client.js";

type ProvisioningDatabase = Pick<PrismaClient, "user">;

export async function promoteExistingTeacherToAdmin(
  database: ProvisioningDatabase,
  input: { email: string; confirmEmail: string },
): Promise<{ promoted: boolean; isTeacher: true; isAdmin: true }> {
  const email = input.email.trim().toLowerCase();
  const confirmEmail = input.confirmEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email !== confirmEmail) {
    throw new Error("La confirmación del correo no coincide o no es válida.");
  }

  const matches = await database.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, isTeacher: true, role: true },
    take: 2,
  });
  if (matches.length !== 1) throw new Error("Debe existir exactamente una cuenta con ese correo.");
  const user = matches[0];
  if (!user || user.isTeacher !== true) throw new Error("La cuenta existente no es docente; no se modificó.");

  const existingRoles = (user.role ?? "user").split(",").map((role) => role.trim()).filter(Boolean);
  if (existingRoles.includes("admin")) return { promoted: false, isTeacher: true, isAdmin: true };
  const nextRole = [...new Set([...existingRoles.filter((role) => role !== "user"), "admin"])].join(",");
  const changed = await database.user.updateMany({
    where: { id: user.id, email: { equals: email, mode: "insensitive" }, isTeacher: true, role: user.role },
    data: { role: nextRole },
  });
  if (changed.count !== 1) throw new Error("La cuenta cambió durante la operación; no se verificó la promoción.");

  const verified = await database.user.findUnique({ where: { id: user.id }, select: { isTeacher: true, role: true } });
  if (verified?.isTeacher !== true || !(verified.role ?? "").split(",").includes("admin")) {
    throw new Error("No se pudo verificar que la misma cuenta conserva docencia y obtuvo rol admin.");
  }
  return { promoted: true, isTeacher: true, isAdmin: true };
}
