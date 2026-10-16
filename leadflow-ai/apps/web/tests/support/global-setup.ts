import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testDatabaseUrl } from "./env";

const here = path.dirname(fileURLToPath(import.meta.url));

export default function setup() {
  const url = testDatabaseUrl();
  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.resolve(here, "../../../.."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
