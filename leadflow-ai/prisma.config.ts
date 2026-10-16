import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // URL нужен только для миграций; prisma generate (например, при сборке Docker) работает без БД.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
