import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env files automatically, and the Prisma CLI does not
// go through Next.js, so load them here (Vercel injects env vars directly).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(process.cwd(), file));
  } catch {
    // file missing — fine
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) Neon connection; the app itself
    // uses the pooled DATABASE_URL through the Neon driver adapter.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
