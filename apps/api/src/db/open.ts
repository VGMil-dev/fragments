import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

export function openDatabase(databaseUrl: string): PrismaClient {
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("La API solo admite PostgreSQL mediante DATABASE_URL.");
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 });
  return new PrismaClient({ adapter });
}
